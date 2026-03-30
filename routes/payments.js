const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'); // Dummy key for development if env is not set
const auth = require('../middleware/auth');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// 1. Get Available Plans for Store Owners
router.get('/plans', async (req, res) => {
    try {
        const plans = await Plan.find({ isActive: true });
        res.json({ success: true, count: plans.length, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 2. Create Checkout Session
router.post('/create-checkout-session', auth, async (req, res) => {
    const { planId } = req.body;

    try {
        const plan = await Plan.findById(planId);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

        // Ensure user is a store owner
        if (req.user.role !== 'store_owner') {
            return res.status(403).json({ success: false, message: 'Only store owners can subscribe to plans' });
        }

        // In a real application, you'd integrate exactly with Stripe here.
        // For the sake of this graduation project, we will mock the Stripe checkout creation
        // and return a dummy URL that just simulates a successful payment.

        // --- REAL STRIPE CODE (Uncomment and configure if actually using Stripe frontend) ---
        /*
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: req.user.email,
            line_items: [{
                price_data: {
                    currency: plan.currency.toLowerCase(),
                    product_data: { name: `SmartGrocer ${plan.name} Plan` },
                    unit_amount: plan.price * 100, // Stripe expects cents
                },
                quantity: 1,
            }],
            mode: 'payment', // using payment for simplicity instead of 'subscription' for the demo
            success_url: `${req.protocol}://${req.get('host')}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.protocol}://${req.get('host')}/payment-cancel.html`,
            metadata: {
                userId: req.user._id.toString(),
                planId: plan._id.toString()
            }
        });
        
        res.json({ success: true, id: session.id, url: session.url });
        */

        // MOCKED CHECKOUT TO PENDING WORKFLOW
        // In this manual verification mode, requesting an upgrade saves a 'pending' Subscription.
        const pendingSub = new Subscription({
            user: req.user._id,
            plan: plan._id,
            status: 'pending',
            startDate: new Date(),
            endDate: new Date() // Will be updated when Admin activates it
        });
        await pendingSub.save();

        res.json({
            success: true,
            message: "تم استلام طلب الترقية بنجاح! سيتم التفعيل بعد المراجعة من الإدارة.",
            status: 'pending',
            url: "/index.html?payment=pending"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 4. Get Current User Subscription
router.get('/my-subscription', auth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            user: req.user._id,
            status: 'active'
        }).populate('plan');

        if (!subscription) {
            return res.json({ success: true, data: null, message: "No active subscription" });
        }

        res.json({ success: true, data: subscription });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

module.exports = router;
