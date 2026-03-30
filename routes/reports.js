const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/reports/overview — main dashboard report
router.get('/overview', async (req, res) => {
    try {
        const userId = req.user._id;

        // Products
        const products = await Product.find({ userId });
        const totalProducts = products.length;
        const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const lowStock = products.filter(p => p.quantity <= p.lowStockThreshold).length;
        const nearExpiry = products.filter(p => {
            if (!p.expiryDate) return false;
            const days = (p.expiryDate - new Date()) / (1000 * 60 * 60 * 24);
            return days <= 7 && days > 0;
        }).length;

        // Sales & Profit estimate
        const sales = await Sale.find({ userId });
        const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
        const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);
        const totalTransactions = sales.length;

        // Calculate Cost of Goods Sold (COGS) based on actual sales, not entire unsold inventory
        let totalCOGS = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                // Safely handle missing product ID or old schema data
                const pId = item.productId || item._id;
                const product = pId ? products.find(p => p._id.toString() === pId.toString()) : null;
                const unitCost = product && product.costPrice ? product.costPrice : ((item.unitPrice || item.price || 0) * 0.7);
                totalCOGS += (unitCost * item.quantity);
            });
        });

        const estimatedProfit = totalRevenue - totalCOGS;

        // Category distribution
        const categories = {};
        products.forEach(p => {
            if (!categories[p.category]) categories[p.category] = { products: 0, value: 0 };
            categories[p.category].products++;
            categories[p.category].value += p.price * p.quantity;
        });

        // Monthly revenue (last 6 months)
        const monthlyRevenue = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
            const monthSales = sales.filter(s => s.createdAt >= month && s.createdAt <= monthEnd);
            monthlyRevenue[monthKey] = monthSales.reduce((sum, s) => sum + s.total, 0);
        }

        // Payment method breakdown
        const paymentMethods = { cash: 0, card: 0, digital: 0 };
        sales.forEach(s => {
            paymentMethods[s.paymentMethod] = (paymentMethods[s.paymentMethod] || 0) + s.total;
        });

        res.json({
            products: { total: totalProducts, lowStock, nearExpiry, inventoryValue: totalInventoryValue },
            sales: { totalRevenue, totalDiscount, totalTransactions, estimatedProfit },
            categories,
            monthlyRevenue,
            paymentMethods
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// GET /api/reports/inventory — full inventory report
router.get('/inventory', async (req, res) => {
    try {
        const products = await Product.find({ userId: req.user._id }).sort('category name');

        const report = products.map(p => ({
            name: p.name,
            category: p.category,
            quantity: p.quantity,
            price: p.price,
            value: p.price * p.quantity,
            status: p.quantity === 0 ? 'out_of_stock'
                : p.quantity <= p.lowStockThreshold ? 'low_stock'
                    : 'in_stock',
            expiryDate: p.expiryDate,
            isExpired: p.expiryDate ? p.expiryDate < new Date() : false
        }));

        res.json({ report });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// POST /api/reports/ai-analysis — generate and email AI report on demand
router.post('/ai-analysis', async (req, res) => {
    try {
        const { lang } = req.body;
        const user = req.user;
        const plan = user.subscriptionPlan || 'Free Trial';

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        // Get recent sales
        const recentSales = await Sale.find({
            userId: user._id,
            createdAt: { $gte: thirtyDaysAgo }
        });

        const totalRevenue = recentSales.reduce((sum, s) => sum + s.total, 0);

        // Count low stock products
        const products = await Product.find({ userId: user._id });
        const lowStockCount = products.filter(p => p.quantity <= p.lowStockThreshold).length;

        // Call Gemini API
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is missing in server environment");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const isAr = lang === 'ar';
        const prompt = `
You are an expert financial and retail business consultant for SmartGrocer SaaS. 
Analyze the following data for a supermarket shop owner named "${user.fullName}".
- Total Revenue (Last 30 Days): ${totalRevenue.toFixed(2)} EGP
- Number of Sales Transactions: ${recentSales.length}
- Average Order Value: ${recentSales.length ? (totalRevenue / recentSales.length).toFixed(2) : 0} EGP
- Low Stock Products Count: ${lowStockCount}

Write a professional email format report (in HTML) in ${isAr ? 'Arabic' : 'English'}.
Highlight the good performance, note the low stock items urgently, and give 2 short actionable marketing/business advice to increase sales basket sizes or manage inventory.
Keep it strictly under 150 words. Do not include a subject line in the text, just the HTML body starting with an <h3> tag. 
Format it nicely with emojis, <strong> tags for numbers, and unordered lists for actionable advice.
`;

        const result = await model.generateContent(prompt);
        // Clean up markdown block if the AI returns it wrapped in ```html
        let analysisHtml = result.response.text();
        analysisHtml = analysisHtml.replace(/```html/g, '').replace(/```/g, '');

        const { sendAIReportEmail } = require('../utils/email');
        const subject = isAr ? '📊 تقريرك التحليلي الذكي من SmartGrocer' : '📊 Your SmartGrocer AI Analysis Report';

        // Attempt to send email, but don't crash if Brevo account is unactivated
        try {
            await sendAIReportEmail(user.email, subject, analysisHtml);
        } catch (emailErr) {
            console.warn("[EMAIL WARNING] AI Report generated but email failed to send:", emailErr.message);
        }

        // Always return the generated HTML back to the frontend so the user can see it immediately
        res.json({ message: 'AI Report generated successfully', reportHtml: analysisHtml });
    } catch (error) {
        console.error("[AI ANALYSIS ERROR]:", error);
        require('fs').writeFileSync('ai_error.log', error.stack || error.message);
        res.status(500).json({ message: 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي', error: error.message });
    }
});

module.exports = router;
