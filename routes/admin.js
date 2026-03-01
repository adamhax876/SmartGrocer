const express = require('express');
const router = express.Router();
const isAdmin = require('../middleware/adminAuth');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Setting = require('../models/Setting');
const Subscription = require('../models/Subscription');
const Ticket = require('../models/Ticket');
const { clearSettingsCache } = require('../utils/settings');

// =====================================
// Admin Endpoints
// All routes here should be protected by isAdmin middleware
// =====================================

// 1. Get Dashboard Stats
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'store_owner' });
        const totalPlans = await Plan.countDocuments();
        const activeSubscriptions = await User.countDocuments({
            role: 'store_owner',
            subscriptionPlan: { $ne: 'Free Trial' },
            subscriptionEndDate: { $gt: new Date() }
        });

        // Calculate subscription growth for the last 6 months (by new users)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const growthData = await User.aggregate([
            { $match: { role: 'store_owner', createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        res.json({
            success: true,
            data: {
                totalUsers,
                totalPlans,
                activeSubscriptions,
                growthData
            }
        });
    } catch (error) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 2. Get All Users (Store Owners)
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'store_owner' }).select('-password');
        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 3. Suspend User (Store Owner)
router.patch('/users/:id/suspend', isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User suspended successfully', data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 4. Activate User (Store Owner)
router.patch('/users/:id/activate', isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User activated successfully', data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 5. Delete User (Store Owner)
router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        // NOTE: In production, it's safer to soft delete, or clean up (delete products, sales, etc.)
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 6. Get Single User Details (Store Owner)
router.get('/users/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const subscription = await Subscription.findOne({ user: user._id, status: 'active' }).populate('plan');
        const plans = await Plan.find();

        res.json({ success: true, data: { user, subscription, plans } });
    } catch (error) {
        console.error('Admin user detail fetch error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 7. Update User Profile (Admin manual edit)
router.patch('/users/:id/profile', isAdmin, async (req, res) => {
    try {
        const { storeName, password } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (storeName && storeName.trim() !== '') {
            user.storeName = storeName.trim();
        }

        if (password && password.trim() !== '') {
            user.password = password.trim();
        }

        await user.save();

        res.json({ success: true, message: 'Store profile updated successfully', data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 7.5 Update User Role (Assign as Support)
router.patch('/users/:id/role', isAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        if (!['admin', 'store_owner', 'cashier', 'support'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.role === 'admin' && role !== 'admin') {
            return res.status(400).json({ success: false, message: 'Cannot demote an admin from here' });
        }

        user.role = role;
        await user.save();

        res.json({ success: true, message: `تم تحديث الصلاحية إلى ${role === 'support' ? 'الدعم الفني' : 'صاحب متجر'} بنجاح` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 8. Get System Settings
router.get('/settings', isAdmin, async (req, res) => {
    try {
        const settings = await Setting.find();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 9. Update/Create System Settings
router.post('/settings', isAdmin, async (req, res) => {
    try {
        const { settings } = req.body; // Array of { key, value }
        if (!Array.isArray(settings)) {
            return res.status(400).json({ success: false, message: 'Invalid format' });
        }

        for (const item of settings) {
            await Setting.findOneAndUpdate(
                { key: item.key },
                { value: item.value },
                { upsert: true, new: true }
            );
        }

        clearSettingsCache(); // Ensure next request fetches fresh settings

        res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 10. Send a Message/Notification
router.post('/messages', isAdmin, async (req, res) => {
    try {
        const { receiverId, title, content, image } = req.body;
        const Message = require('../models/Message');

        const newMessage = new Message({
            sender: req.admin._id,
            receiver: receiverId || null,
            title,
            content,
            image: image || '',
            isGlobal: !receiverId
        });

        await newMessage.save();

        const { sendRealtimeNotification } = require('../utils/sse');
        sendRealtimeNotification(receiverId, newMessage);

        res.status(201).json({ success: true, message: 'Message sent successfully', data: newMessage });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 11. Get sent messages
router.get('/messages', isAdmin, async (req, res) => {
    try {
        const Message = require('../models/Message');
        const messages = await Message.find({ sender: req.admin._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 13. Assign Subscription Directly (SaaS Feature)
router.post('/users/:id/assign-subscription', isAdmin, async (req, res) => {
    try {
        const { planName, endDate } = req.body;
        if (!planName || !endDate) {
            return res.status(400).json({ success: false, message: 'Invalid data' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.subscriptionPlan = planName;

        let exactEndDate = new Date(endDate);
        if (planName === 'Free Trial') {
            exactEndDate = new Date();
            exactEndDate.setDate(exactEndDate.getDate() + 14);
        }
        // Use exact date from picker, set to end of that day
        exactEndDate.setHours(23, 59, 59, 999);

        user.subscriptionEndDate = exactEndDate;
        user.hasSent3DayWarning = false;
        user.hasSent12HourWarning = false;

        await user.save();

        const { sendSubscriptionActivatedEmail } = require('../utils/email');
        const startDate = new Date().toLocaleDateString('ar-EG');
        const endDateStr = exactEndDate.toLocaleDateString('ar-EG');
        sendSubscriptionActivatedEmail(user.email, user.fullName, planName, startDate, endDateStr)
            .catch(err => console.error("Activation Email Error:", err));

        res.json({ success: true, message: `Subscription assigned: ${planName}`, data: user });
    } catch (error) {
        console.error('Assign Subscription Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// =====================================
// Support Tickets (Admin)
// =====================================

// 14. Get All Tickets
router.get('/tickets', isAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status) query.status = status;

        const tickets = await Ticket.find(query)
            .populate('userId', 'fullName email storeName phone')
            .sort({ status: 1, createdAt: -1 });

        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Admin Tickets Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 15. Reply to Ticket
router.post('/tickets/:id/reply', isAdmin, async (req, res) => {
    try {
        const { reply } = req.body;
        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
        }

        ticket.adminReply = reply;
        ticket.status = 'answered';
        ticket.repliedAt = new Date();
        await ticket.save();

        res.json({ success: true, message: 'تم إرسال الرد بنجاح', ticket });
    } catch (error) {
        console.error('Ticket Reply Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

module.exports = router;
