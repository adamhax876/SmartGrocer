require('dotenv').config();

// Global Override: Force the new custom domain everywhere, intercepting the old Render domain if set.
if (process.env.APP_URL && process.env.APP_URL.includes('onrender.com')) {
    process.env.APP_URL = 'https://smartgrocer.me';
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// Security Middleware
app.set('trust proxy', 1); // Trust the first proxy to get real IP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https://api.resend.com", "https://generativelanguage.googleapis.com"],
            workerSrc: ["'self'", "blob:"],
            frameSrc: ["'self'"]
        }
    }
})); // OWASP 2026: Content Security Policy
app.use(mongoSanitize()); // Prevent NoSQL injection globally

// Global Rate Limiting (100 requests per 15 minutes)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    skip: (req, res) => process.env.DISABLE_RATE_LIMIT === 'true',
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

// Middleware
const defaultOrigins = [process.env.APP_URL, 'http://localhost:3000', 'https://smartgrocer.me', 'https://www.smartgrocer.me'];
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').concat(defaultOrigins) : defaultOrigins;
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        // or allowed origins.
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            console.error(`CORS BLOCKED ORIGIN: ${origin}`);
            callback(new Error('CORS policy violation'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// OWASP 2026: Block Prototype Pollution attempts directly in JSON body
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        // Use Object.prototype.hasOwnProperty to avoid checking the prototype chain!
        const hasProto = Object.prototype.hasOwnProperty.call(req.body, '__proto__');
        const hasConstructor = Object.prototype.hasOwnProperty.call(req.body, 'constructor');
        
        if (hasProto || hasConstructor) {
             console.warn('⚠️ [SECURITY] Blocked Prototype Pollution Attempt from:', req.ip);
             return res.status(400).json({ success: false, message: 'Invalid payload structure (OWASP Mitigation)' });
        }
    }
    next();
});

// Maintenance Mode Middleware MUST run before serving any files/APIs
const maintenance = require('./middleware/maintenance');
app.use(maintenance);

app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgrocer';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// Public Settings Route
app.get('/api/settings/public', async (req, res) => {
  const { getSettings } = require('./utils/settings');
  const settings = await getSettings();
  res.json({
    success: true,
    currency: settings.currency || '$',
    siteName: settings.site_name || 'Smart Grocer',
    paymentMethods: settings.paymentMethods || null
  });
});

// Public Stats Route (used by homepage)
app.get('/api/stats/public', async (req, res) => {
  try {
    const User = require('./models/User');
    const Sale = require('./models/Sale');

    const totalUsers = await User.countDocuments({ role: 'store_owner' });
    const totalSales = await Sale.countDocuments();

    res.json({
      success: true,
      data: {
        users: totalUsers,
        sales: totalSales
      }
    });
  } catch (err) {
    res.json({ success: false, data: { users: 0, sales: 0 } });
  }
});

// Real-time Push Notifications SSE
const { setupSSE } = require('./utils/sse');
setupSSE(app);

// Initialize Cron Jobs
require('./cron/subscriptionCron');
require('./cron/backupCron');
require('./cron/aiReporterCron');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/support', require('./routes/support'));

// Serve frontend for any non-API route
app.get('*', (req, res) => {
  // If requesting a specific HTML file, serve it
  const htmlFile = path.join(__dirname, 'public', req.path);
  if (req.path.endsWith('.html')) {
    return res.sendFile(htmlFile);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Global JSON Error Handler (Prevents returning HTML on API errors like CORS)
app.use((err, req, res, next) => {
    console.error('⚠️ [Express Error]:', err.message);
    if (!res.headersSent) {
        res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SmartGrocer server running on http://localhost:${PORT}`);
});

// OWASP 2026: Mishandling of Exceptional Conditions (Fail-Safe global catchers)
process.on('uncaughtException', (err) => {
    console.error('🔥 [CRITICAL] Uncaught Exception Detected:', err);
    // Keeps process alive despite uncaught synchronous errors (DoS prevention)
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 [CRITICAL] Unhandled Promise Rejection at:', promise, 'reason:', reason);
    // Keeps process alive despite unhandled async errors
});
