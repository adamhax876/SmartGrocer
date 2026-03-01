const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ success: false, message: 'مطلوب تسجيل الدخول' }); // Login required
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ success: false, message: 'المستخدم غير موجود' }); // User not found
        }

        if (user.role !== 'admin' && user.role !== 'support') {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بالدخول، هذه الصفحة للإدارة والدعم الفني فقط' }); // Not authorized, admin only
        }

        req.admin = user;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'جلسة غير صالحة', error: error.message }); // Invalid session
    }
};

module.exports = isAdmin;
