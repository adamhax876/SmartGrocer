const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');
const { enforceLockout, enforceLimits } = require('../middleware/subscription');

router.use(auth);
router.use(enforceLockout);

// POST /api/sales — record a new sale
router.post('/', enforceLimits('sales'), async (req, res) => {
    try {
        const { items, discount, tax, paymentMethod, customerName, customerPhone, usePoints } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'يجب إضافة منتج واحد على الأقل' });
        }

        if (discount < 0) {
            return res.status(400).json({ message: 'الخصم لا يمكن أن يكون قيمة سالبة' });
        }

        let subtotal = 0;
        const saleItems = [];

        for (const item of items) {
            if (item.quantity <= 0) {
                return res.status(400).json({ message: 'يجب أن تكون الكمية أكبر من صفر' });
            }
            const product = await Product.findOne({ _id: item.productId, userId: req.user._id });
            if (!product) {
                return res.status(404).json({ message: `المنتج غير موجود: ${item.productId}` });
            }
            if (product.quantity < item.quantity) {
                return res.status(400).json({ message: `الكمية غير كافية للمنتج: ${product.name}` });
            }

            const total = product.price * item.quantity;
            subtotal += total;

            saleItems.push({
                productId: product._id,
                productName: product.name,
                quantity: item.quantity,
                unitPrice: product.price,
                total
            });

            // Decrease stock using FIFO (First In First Out) for Batches
            let qtyToDeduct = item.quantity;
            
            if (product.batches && product.batches.length > 0) {
                // Sort batches by expiry date (earliest first), items without date at the end
                product.batches.sort((a, b) => {
                    if (!a.expiryDate) return 1;
                    if (!b.expiryDate) return -1;
                    return a.expiryDate - b.expiryDate;
                });

                for (let i = 0; i < product.batches.length && qtyToDeduct > 0; i++) {
                    const batch = product.batches[i];
                    if (batch.quantity >= qtyToDeduct) {
                        batch.quantity -= qtyToDeduct;
                        qtyToDeduct = 0;
                    } else {
                        qtyToDeduct -= batch.quantity;
                        batch.quantity = 0;
                    }
                }
                // Filter out empty batches
                product.batches = product.batches.filter(b => b.quantity > 0);
            } else {
                // Fallback for products without batches
                product.quantity = Math.max(0, product.quantity - qtyToDeduct);
            }

            // The pre-save hook in Product.js will handle summing total qty for batch-based products
            await product.save();
        }

        let finalDiscount = discount || 0;
        let finalTax = tax || 0;
        let finalTotal = subtotal + finalTax - finalDiscount;
        let appliedLoyalty = false;

        // --- CUSTOMER LOYALTY LOGIC (Pro Plan) ---
        const plan = req.user.subscriptionPlan || 'Free Trial';
        let customer = null;

        if ((plan === 'Pro Plan' || plan === 'Free Trial') && customerPhone) {
            customer = await Customer.findOne({ userId: req.user._id, phone: customerPhone });
            if (!customer) {
                customer = new Customer({
                    userId: req.user._id,
                    phone: customerPhone,
                    name: customerName || 'عميل محترم',
                });
            }

            if (usePoints && customer.points > 0) {
                // Redeem Points: 10 points = 1 EGP discount
                const pointsValue = customer.points / 10;

                if (pointsValue >= finalTotal) {
                    // Points cover the whole bill
                    const pointsUsed = finalTotal * 10;
                    finalDiscount += finalTotal;
                    finalTotal = 0;
                    customer.points -= pointsUsed;
                } else {
                    // Points cover part of the bill
                    finalDiscount += pointsValue;
                    finalTotal -= pointsValue;
                    customer.points = 0;
                }
                appliedLoyalty = true;
            }

            // Accumulate Points for final total paid (1 point for every 10 EGP spent)
            if (finalTotal > 0) {
                const earnedPoints = Math.floor(finalTotal / 10);
                customer.points += earnedPoints;
            }

            customer.totalSpent += finalTotal;
            await customer.save();
        }

        const sale = await Sale.create({
            items: saleItems,
            subtotal,
            discount: finalDiscount,
            tax: finalTax,
            total: finalTotal,
            paymentMethod: paymentMethod || 'cash',
            customerName: customer ? customer.name : (customerName || 'عميل'),
            userId: req.user._id
        });

        res.status(201).json({ sale, customerPoints: customer ? customer.points : 0, appliedLoyalty });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// GET /api/sales — list sales
router.get('/', async (req, res) => {
    try {
        const { from, to, limit } = req.query;
        const filter = { userId: req.user._id };

        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }

        const sales = await Sale.find(filter)
            .sort('-createdAt')
            .limit(parseInt(limit) || 50);

        const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);

        res.json({
            count: sales.length,
            totalRevenue,
            sales
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// GET /api/sales/stats — sales statistics
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();

        // Today
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todaySales = await Sale.find({ userId, createdAt: { $gte: todayStart } });
        const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);

        // This month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthSales = await Sale.find({ userId, createdAt: { $gte: monthStart } });
        const monthRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);

        // Last month
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const lastMonthSales = await Sale.find({ userId, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } });
        const lastMonthRevenue = lastMonthSales.reduce((sum, s) => sum + s.total, 0);

        // Growth
        const growth = lastMonthRevenue > 0
            ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
            : 0;

        // Daily sales for current month (for chart)
        const dailySales = {};
        monthSales.forEach(sale => {
            const day = sale.createdAt.getDate();
            dailySales[day] = (dailySales[day] || 0) + sale.total;
        });

        // Top products
        const productSales = {};
        const allSales = await Sale.find({ userId });
        allSales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productSales[item.productName]) {
                    productSales[item.productName] = { quantity: 0, revenue: 0 };
                }
                productSales[item.productName].quantity += item.quantity;
                productSales[item.productName].revenue += item.total;
            });
        });

        const topProducts = Object.entries(productSales)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        res.json({
            today: { count: todaySales.length, revenue: todayRevenue },
            month: { count: monthSales.length, revenue: monthRevenue },
            lastMonth: { count: lastMonthSales.length, revenue: lastMonthRevenue },
            growth: parseFloat(growth),
            dailySales,
            topProducts,
            totalSales: allSales.length,
            totalRevenue: allSales.reduce((sum, s) => sum + s.total, 0)
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// GET /api/sales/customer/:phone — check customer points
router.get('/customer/:phone', async (req, res) => {
    try {
        const phone = req.params.phone;
        const customer = await Customer.findOne({ userId: req.user._id, phone });
        
        if (customer) {
            res.json({ success: true, stats: { points: customer.points || 0, totalSpent: customer.totalSpent || 0 } });
        } else {
            res.json({ success: true, stats: null });
        }
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

module.exports = router;
