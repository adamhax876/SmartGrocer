const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');
const { enforceLockout } = require('../middleware/subscription');

router.use(auth);
router.use(enforceLockout);

// GET /api/customers/by-phone/:phone
router.get('/by-phone/:phone', async (req, res) => {
    try {
        const user = req.user;
        const plan = user.subscriptionPlan || 'Free Trial';

        if (plan === 'Basic Plan') {
            return res.status(403).json({ success: false, message: 'ميزة تفقد نقاط الولاء متاحة في الباقة الاحترافية فقط.' });
        }

        const customer = await Customer.findOne({ userId: req.user._id, phone: req.params.phone });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        res.json({ success: true, customer });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
    }
});

// GET /api/customers
router.get('/', async (req, res) => {
    try {
        const customers = await Customer.find({ userId: req.user._id }).sort('-points');
        res.json({ success: true, count: customers.length, customers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
    }
});

module.exports = router;
