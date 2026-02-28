const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const auth = require('../middleware/auth');
const { enforceLockout } = require('../middleware/subscription');

router.use(auth);
router.use(enforceLockout);

// GET /api/branches - List all branches for a store owner
router.get('/', async (req, res) => {
    try {
        const userId = req.user.role === 'cashier' ? req.user.ownerId : req.user._id;
        const branches = await Branch.find({ userId });
        res.json({ success: true, count: branches.length, branches });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
    }
});

// POST /api/branches - Create a new branch (Pro Plan Only)
router.post('/', async (req, res) => {
    try {
        if (req.user.role !== 'store_owner') {
            return res.status(403).json({ success: false, message: 'غير مصرح' });
        }

        const plan = req.user.subscriptionPlan || 'Free Trial';
        if (plan === 'Basic Plan') {
            return res.status(403).json({ success: false, message: 'الفروع المتعددة متاحة فقط في الباقة الاحترافية' });
        }

        const { name, location, phone } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'اسم الفرع مطلوب' });
        }

        const branch = await Branch.create({
            userId: req.user._id,
            name,
            location,
            phone
        });

        res.status(201).json({ success: true, branch });
    } catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
    }
});

module.exports = router;
