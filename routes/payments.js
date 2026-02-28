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

        // --- MOCKED CHECKOUT FOR DEMO PURPOSES ---
        // We simulate a successful payment locally without actually hitting Stripe for the MVP
        // In reality, this would be an actual stripe URL.
        const mockSessionId = 'cs_test_' + Math.random().toString(36).substring(7);
        const successUrl = `/api/payments/mock-webhook?session_id=${mockSessionId}&user_id=${req.user._id}&plan_id=${plan._id}`;

        res.json({
            success: true,
            id: mockSessionId,
            url: successUrl, // Redirects user directly to success handler
            message: "Using mocked payment gateway for demo purposes"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
});

// 3. Mock Webhook for Development/Demo
// In production, this would be a POST from Stripe to '/webhook' with raw body parsing
router.get('/mock-webhook', async (req, res) => {
    const { user_id, plan_id, session_id } = req.query;

    try {
        const plan = await Plan.findById(plan_id);
        const user = await User.findById(user_id);

        if (!plan || !user) {
            return res.status(400).send("Invalid data");
        }

        // Calculate end date (e.g., 30 days from now)
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.durationDays);

        // Cancel previous active subscriptions for this user
        await Subscription.updateMany(
            { user: user._id, status: 'active' },
            { status: 'canceled' }
        );

        // Create new active subscription
        const subscription = new Subscription({
            user: user._id,
            plan: plan._id,
            status: 'active',
            startDate: new Date(),
            endDate: endDate,
            stripeSubscriptionId: session_id // usually sub_xxx
        });

        await subscription.save();

        // Redirect user back to dashboard or success page
        res.redirect('/index.html?payment=success');

    } catch (error) {
        res.status(500).send("Webhook processing failed");
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
