const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// POST /api/subscription/renew
// Deduct wallet balance and renew subscription
router.post('/renew', auth, async (req, res) => {
    try {
        const { planName, cost } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.walletBalance < cost) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        }

        // Deduct cost
        user.walletBalance -= cost;
        user.subscriptionPlan = planName;

        // Calculate new end date (add 30 days)
        // If the current end date is in the future, add 30 days to it.
        // If it's in the past, add 30 days from today.
        const now = new Date();
        const currentEnd = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : now;

        if (currentEnd > now) {
            currentEnd.setDate(currentEnd.getDate() + 30);
            user.subscriptionEndDate = currentEnd;
        } else {
            const nextEnd = new Date();
            nextEnd.setDate(nextEnd.getDate() + 30);
            user.subscriptionEndDate = nextEnd;
        }

        // Reset warning flags so user gets notified again on next expiration
        user.hasSent3DayWarning = false;
        user.hasSent12HourWarning = false;

        await user.save();

        res.json({ success: true, message: 'Subscription renewed successfully', data: user });

    } catch (error) {
        console.error('Subscription Renew Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

module.exports = router;
