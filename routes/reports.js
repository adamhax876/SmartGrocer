const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const fetch = require('node-fetch');

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

        // Calculate Cost of Goods Sold (COGS) based on actual sales
        let totalCOGS = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
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

// POST /api/reports/ai-analysis — generate AI report via OpenRouter
router.post('/ai-analysis', async (req, res) => {
    try {
        const { lang } = req.body;
        const user = req.user;

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        const recentSales = await Sale.find({ userId: user._id, createdAt: { $gte: thirtyDaysAgo } });
        const totalRevenue = recentSales.reduce((sum, s) => sum + s.total, 0);
        const products = await Product.find({ userId: user._id });
        const lowStockCount = products.filter(p => p.quantity <= p.lowStockThreshold).length;

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing in server environment");

        const isAr = lang === 'ar';
        const prompt = `You are an expert retail business consultant for SmartGrocer SaaS.
Analyze this data for store owner "${user.fullName}":
- Revenue (30 days): ${totalRevenue.toFixed(2)} EGP
- Transactions: ${recentSales.length}
- Avg Order: ${recentSales.length ? (totalRevenue / recentSales.length).toFixed(2) : 0} EGP
- Low Stock Items: ${lowStockCount}
- Total Products: ${products.length}

Write a professional HTML report in ${isAr ? 'Arabic' : 'English'}.
Include: performance summary, low stock alert, 3 actionable tips.
Under 200 words. Start with <h3>. Use <strong>, <ul>, <li>, emojis.`;

        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://smartgrocer.me',
                'X-Title': 'SmartGrocer AI'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-maverick:free',
                messages: [
                    { role: 'system', content: 'You are a retail analyst. Respond with clean HTML only, no markdown.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 600
            })
        });

        if (!aiRes.ok) {
            const errBody = await aiRes.text();
            throw new Error('OpenRouter error ' + aiRes.status + ': ' + errBody);
        }

        const aiData = await aiRes.json();
        let analysisHtml = aiData.choices[0].message.content;
        analysisHtml = analysisHtml.replace(/```html/g, '').replace(/```/g, '').trim();

        const { sendAIReportEmail } = require('../utils/email');
        const subject = isAr ? '📊 تقريرك التحليلي من SmartGrocer' : '📊 Your SmartGrocer AI Report';
        try {
            await sendAIReportEmail(user.email, subject, analysisHtml);
        } catch (emailErr) {
            console.warn("[EMAIL] AI report email failed:", emailErr.message);
        }

        res.json({ message: 'AI Report generated', reportHtml: analysisHtml });
    } catch (error) {
        console.error("[AI ERROR]:", error.message);
        res.status(500).json({ message: 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي', error: error.message });
    }
});

// GET /api/reports/export-excel
router.get('/export-excel', async (req, res) => {
    try {
        const userId = req.user._id;
        const XLSX = require('xlsx');

        const sales = await Sale.find({ userId }).populate('items.productId');
        const products = await Product.find({ userId });

        const salesData = sales.map(s => ({
            'Invoice ID': s._id.toString(),
            'Date': s.createdAt.toLocaleDateString(),
            'Total Amount': s.total,
            'Payment Method': s.paymentMethod,
            'Status': s.status
        }));
        
        const inventoryData = products.map(p => ({
            'Barcode': p.barcode || 'N/A',
            'Name': p.name,
            'Category': p.category,
            'Price': p.price,
            'Cost': p.costPrice,
            'Stock': p.quantity
        }));

        const wb = XLSX.utils.book_new();
        
        const wsSales = XLSX.utils.json_to_sheet(salesData.length ? salesData : [{ 'Notice': 'No Sales Found' }]);
        XLSX.utils.book_append_sheet(wb, wsSales, "Sales");
        
        const wsInventory = XLSX.utils.json_to_sheet(inventoryData.length ? inventoryData : [{ 'Notice': 'No Products Found' }]);
        XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory");

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        res.send(buf);

    } catch (error) {
        console.error("Excel Export Error:", error);
        res.status(500).json({ message: 'فشل تصدير التقرير' });
    }
});

module.exports = router;
