const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/support — fetch user tickets
router.get('/', async (req, res) => {
    try {
        const tickets = await Ticket.find({ userId: req.user._id }).sort('-createdAt');
        res.json({ tickets });
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
            message
        });

        res.status(201).json({ message: 'تم إرسال تذكرتك بنجاح، سيتم الرد عليك قريباً', ticket });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

module.exports = router;
