const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Not authorized - no token' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'Not authorized - user not found' });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'حسابك موقوف من قبل الإدارة', isSuspended: true });
        }

        req.user = user;

        // Async IP Tracking
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        let cleanIp = clientIp ? clientIp.split(',')[0].trim() : '';

        // Format localhost IPs to be more user-friendly
        if (cleanIp === '::1' || cleanIp === '::ffff:127.0.0.1') {
            cleanIp = '127.0.0.1 (Localhost)';
        }

        if (cleanIp && cleanIp !== user.lastIpAddress && user.role === 'store_owner') {
            User.updateOne({ _id: user._id }, { $set: { lastIpAddress: cleanIp } })
                .catch(err => console.error('Error updating IP in middleware:', err.message));
        }

        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized - invalid token' });
    }
};
