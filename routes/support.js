const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendTicketReplyEmail } = require('../utils/email');

router.use(auth);

// GET /api/support — fetch all user tickets
router.get('/', async (req, res) => {
    try {
        const tickets = await Ticket.find({ userId: req.user._id }).sort('-createdAt');
        res.json({ tickets });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// GET /api/support/unread — fetch unread count for user
router.get('/unread', async (req, res) => {
    try {
        const count = await Ticket.countDocuments({ userId: req.user._id, hasUnreadUser: true });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// POST /api/support — create new ticket
router.post('/', async (req, res) => {
    try {
        const { subject, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ message: 'الرجاء إدخال الموضوع والرسالة' });
        }

        const ticket = await Ticket.create({
            userId: req.user._id,
            subject,
            messages: [{
                sender: req.user._id,
                role: 'user',
                content: message,
                createdAt: new Date()
            }],
            hasUnreadAdmin: true,
            hasUnreadUser: false
        });

        res.status(201).json({ message: 'تم إرسال تذكرتك بنجاح، سيتم الرد عليك قريباً', ticket });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// POST /api/support/:id/reply — user replies to a ticket
router.post('/:id/reply', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ message: 'لا يمكن إرسال رسالة فارغة' });

        const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user._id });
        if (!ticket) return res.status(404).json({ message: 'التذكرة غير موجودة' });

        ticket.messages.push({
            sender: req.user._id,
            role: 'user',
            content: message,
            createdAt: new Date()
        });

        ticket.status = 'open';
        ticket.hasUnreadAdmin = true;
        await ticket.save();

        // Notify Admins
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@smartgrocer.app'; // Fallback or configured admin email
            sendTicketReplyEmail(
                adminEmail,
                'إدارة الدعم الفني',
                ticket.subject,
                `رد جديد من العميل:\n${message}`
            ).catch(e => console.error('Admin Ticket Reply Email Error:', e));
        } catch (e) { }

        res.json({ message: 'تم إرسال ردك بنجاح', ticket });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// PUT /api/support/:id/read — mark ticket as read by user
router.put('/:id/read', async (req, res) => {
    try {
        await Ticket.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { hasUnreadUser: false }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ' });
    }
});

module.exports = router;
