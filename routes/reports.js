const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/reports/overview — main dashboard report
router.get('/overview', async (req, res) => {
    try {
        const userId = req.user._id;

        // Products
        const products = await Product.find({ userId });
        const totalProducts = products.length;
        const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const lowStock = products.filter(p => p.quantity <= p.lowStockThreshold).length;
        const nearExpiry = products.filter(p => {
            if (!p.expiryDate) return false;
            const days = (p.expiryDate - new Date()) / (1000 * 60 * 60 * 24);
            return days <= 7 && days > 0;
        }).length;

        // Sales & Profit estimate
        const sales = await Sale.find({ userId });
        const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
        const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);
        const totalTransactions = sales.length;

        // Calculate Cost of Goods Sold (COGS) based on actual sales, not entire unsold inventory
        let totalCOGS = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                // Safely handle missing product ID or old schema data
                const pId = item.productId || item._id;
                const product = pId ? products.find(p => p._id.toString() === pId.toString()) : null;
                const unitCost = product && product.costPrice ? product.costPrice : ((item.unitPrice || item.price || 0) * 0.7);
                totalCOGS += (unitCost * item.quantity);
            });
        });

        const estimatedProfit = totalRevenue - totalCOGS;

        // Category distribution
        const categories = {};
        products.forEach(p => {
            if (!categories[p.category]) categories[p.category] = { products: 0, value: 0 };
            categories[p.category].products++;
            categories[p.category].value += p.price * p.quantity;
        });

        // Monthly revenue (last 6 months)
        const monthlyRevenue = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
            const monthSales = sales.filter(s => s.createdAt >= month && s.createdAt <= monthEnd);
            monthlyRevenue[monthKey] = monthSales.reduce((sum, s) => sum + s.total, 0);
        }

        // Payment method breakdown
        const paymentMethods = { cash: 0, card: 0, digital: 0 };
        sales.forEach(s => {
            paymentMethods[s.paymentMethod] = (paymentMethods[s.paymentMethod] || 0) + s.total;
        });

        res.json({
            products: { total: totalProducts, lowStock, nearExpiry, inventoryValue: totalInventoryValue },
            sales: { totalRevenue, totalDiscount, totalTransactions, estimatedProfit },
            categories,
            monthlyRevenue,
            paymentMethods
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// GET /api/reports/inventory — full inventory report
router.get('/inventory', async (req, res) => {
    try {
        const products = await Product.find({ userId: req.user._id }).sort('category name');

        const report = products.map(p => ({
            name: p.name,
            category: p.category,
            quantity: p.quantity,
            price: p.price,
            value: p.price * p.quantity,
            status: p.quantity === 0 ? 'out_of_stock'
                : p.quantity <= p.lowStockThreshold ? 'low_stock'
                    : 'in_stock',
            expiryDate: p.expiryDate,
            isExpired: p.expiryDate ? p.expiryDate < new Date() : false
        }));

        res.json({ report });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// POST /api/reports/ai-analysis — generate and email AI report on demand
router.post('/ai-analysis', async (req, res) => {
    try {
        const { lang } = req.body;
        const user = req.user;
        const plan = user.subscriptionPlan || 'Free Trial';

        if (plan !== 'Pro Plan' && plan !== 'Free Trial') {
            return res.status(403).json({ message: 'This feature requires the Pro Plan or Free Trial.' });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        // Get recent sales
        const recentSales = await Sale.find({
            userId: user._id,
            createdAt: { $gte: thirtyDaysAgo }
        });

        const totalRevenue = recentSales.reduce((sum, s) => sum + s.total, 0);

        // Count low stock products
        const products = await Product.find({ userId: user._id });
        const lowStockCount = products.filter(p => p.quantity <= p.lowStockThreshold).length;

        // In a real app, you'd call the Gemini API or OpenAI here with prompt engineering.
        // For now, we simulate an intelligent analysis strictly formatted for the user.

        const isAr = lang === 'ar';
        const analysisHtml = isAr ? `
            <h3>تحليل أداء متجرك (آخر 30 يوماً)</h3>
            <p>مرحباً <strong>${user.fullName}</strong>،</p>
            <p>بناءً على نشاط متجرك الأخير، لقد حققت إيرادات بقيمة <strong>${totalRevenue.toFixed(2)} ج.م</strong> من خلال <strong>${recentSales.length}</strong> عملية بيع.</p>
            <h4>النقاط المضيئة 💡</h4>
            <ul>
                <li>متوسط قيمة الفاتورة هو <strong>${recentSales.length ? (totalRevenue / recentSales.length).toFixed(2) : 0} ج.م</strong>. حافظ على اقتراح منتجات إضافية للعملاء لزيادة سلة مشترياتهم.</li>
            </ul>
            <h4>نقاط تحتاج للانتباه ⚠️</h4>
            <ul>
                <li>لديك <strong>${lowStockCount}</strong> منتج يوشك على النفاذ أو نفذ بالفعل. نوصي بإعادة الطلب فوراً من الموردين لتجنب فقدان المبيعات.</li>
            </ul>
            <p>نتمنى لك دوام التوفيق والنجاح!</p>
            <p>— الذكاء الاصطناعي لـ SmartGrocer</p>
        ` : `
            <h3>Store Performance Analysis (Last 30 Days)</h3>
            <p>Hello <strong>${user.fullName}</strong>,</p>
            <p>Based on your recent activity, you generated <strong>${totalRevenue.toFixed(2)} EGP</strong> in revenue across <strong>${recentSales.length}</strong> transactions.</p>
            <h4>Highlights 💡</h4>
            <ul>
                <li>Your average order value is <strong>${recentSales.length ? (totalRevenue / recentSales.length).toFixed(2) : 0} EGP</strong>. Keep up-selling to increase basket size.</li>
            </ul>
            <h4>Action Items ⚠️</h4>
            <ul>
                <li>You have <strong>${lowStockCount}</strong> products running low on stock. We recommend re-ordering soon to prevent lost sales.</li>
            </ul>
            <p>Wishing you continued success!</p>
            <p>— SmartGrocer AI</p>
        `;

        const { sendAIReportEmail } = require('../utils/email');
        const subject = isAr ? '📊 تقريرك التحليلي الذكي من SmartGrocer' : '📊 Your SmartGrocer AI Analysis Report';

        await sendAIReportEmail(user.email, subject, analysisHtml);

        res.json({ message: 'AI Report sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي', error: error.message });
    }
});

module.exports = router;
