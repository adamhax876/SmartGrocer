const Product = require('../models/Product');
const Sale = require('../models/Sale');

// 1. Enforce Read-Only Lockout Mode
const enforceLockout = async (req, res, next) => {
    // Only restrict data modification methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const user = req.user;
        if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const now = new Date();
        const end = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;

        if (!end || end < now) {
            return res.status(403).json({
                success: false,
                message: 'انتهت باقتك أو الفترة التجريبية. حسابك الآن للقراءة فقط. يرجى التجديد للاستمرار.',
                isLocked: true
            });
        }
    }
    next();
};

// 2. Enforce Plan Limits for POST requests
const enforceLimits = (resourceType) => {
    return async (req, res, next) => {
        // We only check limits on creation
        if (req.method !== 'POST') return next();

        const user = req.user;
        const plan = user.subscriptionPlan || 'Free Trial';

        // Pro Plan and Free Trial have no limits
        if (plan === 'Pro Plan' || plan === 'Free Trial') {
            return next();
        }

        // Basic Plan limits
        if (plan === 'Basic Plan') {
            if (resourceType === 'products') {
                // Determine how many we are adding
                let addingCount = 1;
                if (req.path === '/import') {
                    // For excel import we don't know exactly yet until parsed,
                    // but we can check the current count first and block if already at limit,
                    // or we can just let it slide and check later.
                    // For now, check if current count is already >= 3000
                }

                const count = await Product.countDocuments({ userId: user._id });
                if (count >= 3000) {
                    return res.status(403).json({ success: false, message: 'لقد وصلت للحد الأقصى لعدد المنتجات في الباقة الأساسية (3,000 منتج). قم بالترقية للباقة الاحترافية.' });
                }
            }

            if (resourceType === 'sales') {
                // Check sales this month
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const count = await Sale.countDocuments({
                    userId: user._id,
                    createdAt: { $gte: startOfMonth }
                });

                if (count >= 10000) {
                    return res.status(403).json({ success: false, message: 'لقد وصلت للحد الأقصى للمبيعات هذا الشهر (10,000 فاتورة). قم بالترقية للباقة الاحترافية.' });
                }
            }
        }

        next();
    };
};

module.exports = {
    enforceLockout,
    enforceLimits
};
