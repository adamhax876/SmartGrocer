const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Invite = require('../models/Invite');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per windowMs
    skip: (req, res) => process.env.DISABLE_RATE_LIMIT === 'true',
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// Generate cryptographically secure token
function generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, async (req, res) => {
    try {
        const email = String(req.body.email);
        const user = await User.findOne({ email });

        if (!user) {
            // Return success even if not found for security reasons
            return res.json({ success: true, message: 'If the email is registered, a reset link was sent.' });
        }

        const resetToken = generateResetToken();
        const resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = resetPasswordExpire;
        await user.save();

        // Send Email
        sendPasswordResetEmail(user.email, user.fullName, resetToken).catch(err => {
            console.error('⚠️ Reset email failed:', err.message);
            console.log(`📧 [FALLBACK] Reset token for ${email}: ${resetToken}`);
        });

        res.json({ success: true, message: 'If the email is registered, a reset link was sent.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'رابط استعادة كلمة المرور غير صالح أو منتهي الصلاحية' });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({ success: true, message: 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;

// Generate JWT
function generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
}

// Generate 6-digit verification code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/signup
router.post('/signup', authLimiter, async (req, res) => {
    try {
        const { storeName, storeType, fullName, password, country, language } = req.body;
        const email = String(req.body.email);
        console.log('📝 Signup attempt:', email);

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            if (existingUser.isVerified) {
                // Already verified — don't allow re-registration
                return res.status(400).json({ message: 'هذا البريد الإلكتروني مسجل بالفعل' });
            }
            // Not verified — delete the old record and let them re-register
            await User.deleteOne({ _id: existingUser._id });
            console.log('🗑️ Deleted old unverified account for:', email);
        }

        // Generate verification code
        const verificationCode = generateCode();
        const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create user
        const user = await User.create({
            storeName,
            storeType: storeType || 'supermarket',
            fullName,
            email,
            password,
            country: country || 'Egypt',
            language: language || 'ar',
            verificationCode,
            verificationExpires
        });

        console.log('✅ User created:', user._id);

        // Send verification email (non-blocking — don't hold up the response)
        sendVerificationEmail(email, verificationCode, fullName).catch(emailErr => {
            console.error('⚠️ Email send failed:', emailErr.message);
            console.log(`📧 [FALLBACK] Verification code for ${email}: ${verificationCode}`);
        });

        console.log('📤 Sending response...');
        res.status(201).json({
            message: 'Account created! Please check your email for the verification code.',
            userId: user._id
        });
        console.log('📤 Response sent!');
        return;
    } catch (error) {
        console.error('❌ SIGNUP ERROR:', error.message);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Security: dev/clear-users route has been removed permanently as per security audit

// POST /api/auth/verify
router.post('/verify', authLimiter, async (req, res) => {
    try {
        const { userId, code } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'الحساب مفعّل بالفعل' });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({ message: 'كود التحقق غير صحيح' });
        }

        if (user.verificationExpires < new Date()) {
            return res.status(400).json({ message: 'كود التحقق منتهي الصلاحية' });
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationExpires = undefined;
        await user.save();

        const token = generateToken(user._id);

        // Send welcome email (non-blocking)
        sendWelcomeEmail(user.email, user.fullName, user.storeName).catch(err =>
            console.error('⚠️ Welcome email failed:', err.message)
        );

        res.json({
            message: 'Account verified successfully! Welcome to SmartGrocer.',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                storeName: user.storeName,
                language: user.language,
                theme: user.theme
            }
        });
    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// POST /api/auth/register-support
router.post('/register-support', async (req, res) => {
    try {
        const { token, fullName, password, phone } = req.body;

        if (!token || !fullName || !password || !phone) {
            return res.status(400).json({ message: 'الرجاء إدخال جميع الحقول المطلوبة' });
        }

        const invite = await Invite.findOne({ token, expiresAt: { $gt: new Date() } });
        if (!invite) return res.status(400).json({ message: 'رابط الدعوة غير صالح أو منتهي الصلاحية' });

        const existingUser = await User.findOne({ email: invite.email });
        if (existingUser) return res.status(400).json({ message: 'البريد الإلكتروني مسجل بالفعل' });

        const user = new User({
            fullName,
            email: invite.email,
            password,
            phone,
            storeName: 'فريق الدعم الفني',
            role: 'support',
            isVerified: true
        });

        await user.save();
        await Invite.deleteOne({ _id: invite._id });

        const jwtToken = generateToken(user._id);

        res.status(201).json({
            message: 'تم إنشاء حساب الدعم الفني بنجاح',
            token: jwtToken,
            user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Support Register Error:', error);
        res.status(500).json({ message: 'حدث خطأ في الخادم', error: error.message });
    }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { password } = req.body;
        const email = String(req.body.email);

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // Check if verified
        if (!user.isVerified) {
            // Resend verification code
            const verificationCode = generateCode();
            user.verificationCode = verificationCode;
            user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();

            // Send email (non-blocking)
            sendVerificationEmail(email, verificationCode, user.fullName).catch(emailErr => {
                console.error('⚠️ Resend email failed:', emailErr.message);
                console.log(`📧 [FALLBACK] New code for ${email}: ${verificationCode}`);
            });

            return res.status(403).json({
                message: 'Account not verified. A new verification code has been sent to your email.',
                userId: user._id,
                needsVerification: true,
                verificationCode: verificationCode // Dev fallback
            });
        }

        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        let cleanIp = clientIp ? clientIp.split(',')[0].trim() : '';

        if (cleanIp === '::1' || cleanIp === '::ffff:127.0.0.1') {
            cleanIp = '127.0.0.1 (Localhost)';
        }

        user.lastIpAddress = cleanIp;
        await user.save();

        const token = generateToken(user._id);

        res.json({
            message: 'تم تسجيل الدخول بنجاح',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                storeName: user.storeName,
                storeType: user.storeType,
                language: user.language,
                theme: user.theme,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET /api/auth/me — get current user
router.get('/me', auth, async (req, res) => {
    res.json({ user: req.user });
});

// PUT /api/auth/settings — update user settings
router.put('/settings', auth, async (req, res) => {
    try {
        const { language, theme } = req.body;
        const updates = {};
        if (language) updates.language = language;
        if (theme) updates.theme = theme;

        const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
        res.json({ user });
    } catch (error) {
        console.error('Settings Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
