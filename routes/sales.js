const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

router.use(auth);

// POST /api/sales — record a new sale
router.post('/', async (req, res) => {
    try {
        const { items, discount, paymentMethod, customerName } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'يجب إضافة منتج واحد على الأقل' });
        }

        let subtotal = 0;
        const saleItems = [];

        for (const item of items) {
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

            // Decrease stock
            product.quantity -= item.quantity;
            await product.save();
        }

        const sale = await Sale.create({
            items: saleItems,
            subtotal,
            discount: discount || 0,
            total: subtotal - (discount || 0),
            paymentMethod: paymentMethod || 'cash',
            customerName: customerName || 'عميل',
            userId: req.user._id
        });

        res.status(201).json({ sale });
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

module.exports = router;
