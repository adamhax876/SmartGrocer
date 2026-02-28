const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');

// Get messages for the logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { isGlobal: true },
                { receiver: req.user._id }
            ]
        }).sort({ createdAt: -1 }).populate('sender', 'name');

        res.json({ success: true, count: messages.length, data: messages });
    } catch (error) {
        console.error('Fetch user messages error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// Mark message as read
router.patch('/:id/read', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        if (!message.readBy.includes(req.user._id)) {
            message.readBy.push(req.user._id);
            await message.save();
        }

        res.json({ success: true, message: 'Message marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

module.exports = router;
