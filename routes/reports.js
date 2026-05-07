const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const axios = require('axios');
const auth = require('../middleware/auth');
const { enforceLockout } = require('../middleware/subscription');

router.use(auth);
router.use(enforceLockout);

router.get('/overview', async (req, res) => {
    try {
        const userId = req.user._id;

        // Products
        const products = await Product.find({ userId });
        const totalProducts = products.length;
        const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const lowStock = products.filter(p => p.quantity <= p.lowStockThreshold).length;
        const nearExpiry = products.filter(p => {
            if (!p.expiryDate || p.quantity <= 0) return false;
            const days = (p.expiryDate - new Date()) / (1000 * 60 * 60 * 24);
            return days <= 30; // Included expired items too (days <= 0)
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
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        // Gather comprehensive data
        const [recentSales, products, allSales] = await Promise.all([
            Sale.find({ userId: user._id, createdAt: { $gte: thirtyDaysAgo } }),
            Product.find({ userId: user._id }),
            Sale.find({ userId: user._id })
        ]);

        const totalRevenue = recentSales.reduce((sum, s) => sum + s.total, 0);
        const avgOrder = recentSales.length ? (totalRevenue / recentSales.length) : 0;

        // Low stock & expiry analysis
        const lowStockItems = products.filter(p => p.quantity <= p.lowStockThreshold);
        const outOfStock = products.filter(p => p.quantity === 0);
        const nearExpiry = products.filter(p => {
            if (!p.expiryDate) return false;
            const days = (p.expiryDate - now) / (1000 * 60 * 60 * 24);
            return days <= 30 && days > 0;
        });

        // Top 5 best-selling products (by sales count)
        const productSalesMap = {};
        recentSales.forEach(sale => {
            sale.items.forEach(item => {
                const key = item.name || item.productId?.toString() || 'Unknown';
                if (!productSalesMap[key]) productSalesMap[key] = { qty: 0, revenue: 0 };
                productSalesMap[key].qty += item.quantity;
                productSalesMap[key].revenue += (item.unitPrice || item.price || 0) * item.quantity;
            });
        });
        const topProducts = Object.entries(productSalesMap)
            .sort((a, b) => b[1].qty - a[1].qty)
            .slice(0, 5)
            .map(([name, d]) => `${name}: ${d.qty} units sold, revenue ${d.revenue.toFixed(0)} EGP`);

        // Bottom 5 slow-selling products (products with stock but low/no sales)
        const soldProductNames = new Set(Object.keys(productSalesMap));
        const slowProducts = products
            .filter(p => p.quantity > 0)
            .map(p => ({
                name: p.name,
                stock: p.quantity,
                sales: productSalesMap[p.name]?.qty || 0,
                price: p.price
            }))
            .sort((a, b) => a.sales - b.sales)
            .slice(0, 5)
            .map(p => `${p.name}: only ${p.sales} sold (${p.stock} in stock, price ${p.price} EGP)`);

        // Category distribution
        const categoryMap = {};
        products.forEach(p => {
            if (!categoryMap[p.category]) categoryMap[p.category] = { count: 0, value: 0 };
            categoryMap[p.category].count++;
            categoryMap[p.category].value += p.price * p.quantity;
        });
        const categoryBreakdown = Object.entries(categoryMap)
            .map(([cat, d]) => `${cat}: ${d.count} products, stock value ${d.value.toFixed(0)} EGP`)
            .join('\n');

        // Daily revenue trend (last 7 days)
        const dailyRevenue = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);
            const daySales = recentSales.filter(s => s.createdAt >= day && s.createdAt < dayEnd);
            const dayLabel = day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            dailyRevenue.push(`${dayLabel}: ${daySales.reduce((s, x) => s + x.total, 0).toFixed(0)} EGP (${daySales.length} orders)`);
        }

        // Payment methods
        const paymentBreakdown = {};
        recentSales.forEach(s => {
            const m = s.paymentMethod || 'cash';
            paymentBreakdown[m] = (paymentBreakdown[m] || 0) + s.total;
        });
        const paymentStr = Object.entries(paymentBreakdown)
            .map(([m, v]) => `${m}: ${v.toFixed(0)} EGP`)
            .join(', ');

        // Profit estimation
        let totalCost = 0;
        recentSales.forEach(sale => {
            sale.items.forEach(item => {
                const product = products.find(p => p._id.toString() === (item.productId?.toString() || ''));
                const cost = product?.costPrice || ((item.unitPrice || item.price || 0) * 0.7);
                totalCost += cost * item.quantity;
            });
        });
        const estimatedProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? ((estimatedProfit / totalRevenue) * 100).toFixed(1) : 0;

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error("GROQ_API_KEY is missing in server environment");

        const isAr = lang === 'ar';
        const prompt = `You are a world-class retail business analyst. Create a professional, high-impact performance report for SmartGrocer SaaS.

STORE OWNER: "${user.fullName}" (${user.storeName || 'N/A'})

====== DATA TO ANALYZE ======
- Revenue (30d): ${totalRevenue.toFixed(2)} EGP
- Orders (30d): ${recentSales.length}
- Avg Order: ${avgOrder.toFixed(2)} EGP
- Estimated Profit: ${estimatedProfit.toFixed(2)} EGP
- Margin: ${profitMargin}%
- Payments: ${paymentStr || 'N/A'}

- Top Products: ${topProducts.join(', ') || 'N/A'}
- Slow Products: ${slowProducts.join(', ') || 'N/A'}

- Inventory: Total ${products.length}, Low Stock ${lowStockItems.length}, OOS ${outOfStock.length}, Near Expiry ${nearExpiry.length}
- Categories: ${categoryBreakdown || 'N/A'}
- Trend (7d): ${dailyRevenue.join(' | ')}

---

Write a CONCISE and STUNNING report in ${isAr ? 'Arabic' : 'English'}.
Structure it using these EXACT sections (use emojis):

1. 📊 Executive Summary: Quick overview of the store's health.
2. 💰 Financial Insights: Deep dive into revenue, profit, and margins.
3. 🏆 Inventory & Product Strategy: Analysis of top vs slow items and inventory alerts.
4. 📈 Trend Analysis: Insights from the 7-day revenue trend.
5. 🎯 Actionable Roadmap: 5 specific, data-backed steps to grow the business.

RULES:
- DO NOT REPEAT TEXT. Be concise.
- Use the provided numbers and product names.
- Do NOT use markdown. Use clean HTML with <h3>, <h4>, <ul>, <li>, and <strong>.
- Use <div> tags with a class "ai-card" for sections (I will provide the CSS).
- Keep the total length around 350 words. Focus on QUALITY over quantity.
- Start directly with the first header.`;

        let aiRes = null;
        try {
            aiRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { 
                        role: 'system', 
                        content: `You are a premium retail business analyst. Respond ONLY with clean HTML.
                        Wrap each section in <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        Use <h3> for titles with color #1e293b. Use <strong> for numbers and product names.
                        Ensure the tone is professional and the Arabic is perfect.`
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 1200,
                temperature: 0.5
            }, {
                headers: {
                    'Authorization': 'Bearer ' + apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 20000
            });

        } catch (err) {
            console.error('Groq AI Model failed:', err.response?.data?.error?.message || err.message);
            throw new Error("Groq AI failed to generate the report.");
        }

        const aiData = aiRes.data;
        let analysisHtml = (aiData.choices && aiData.choices[0] && aiData.choices[0].message && aiData.choices[0].message.content) ? aiData.choices[0].message.content : "";
        analysisHtml = analysisHtml.replace(/```html/g, '').replace(/```/g, '').trim();

        // Inject global styling for the report (email and display)
        const reportStyle = `
        <style>
            .ai-report { font-family: 'Cairo', sans-serif; color: #334155; line-height: 1.6; }
            .ai-report h3 { color: #1e293b; margin-top: 0; font-size: 1.25rem; border-bottom: 2px solid #10b981; display: inline-block; padding-bottom: 5px; margin-bottom: 15px; }
            .ai-report h4 { color: #475569; margin-bottom: 10px; }
            .ai-report ul { padding-inline-start: 20px; margin-bottom: 15px; }
            .ai-report li { margin-bottom: 8px; }
            .ai-report strong { color: #10b981; }
            .ai-report-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        </style>
        <div class="ai-report">
            ${analysisHtml}
        </div>
        `;
        analysisHtml = reportStyle;


        const { sendAIReportEmail } = require('../utils/email');
        const subject = isAr ? '📊 تقريرك التحليلي من SmartGrocer' : '📊 Your SmartGrocer AI Report';
        try {
            await sendAIReportEmail(user.email, subject, analysisHtml);
        } catch (emailErr) {
            console.warn("[EMAIL] AI report email failed:", emailErr.message);
        }

        res.json({ message: 'AI Report generated', reportHtml: analysisHtml });
    } catch (error) {
        let msg = error.message;
        if (error.response && error.response.data) {
            msg = JSON.stringify(error.response.data);
        }
        console.error("[AI ERROR]:", msg);
        res.status(500).json({ message: 'حدث خطأ (AI Error): ' + msg, error: msg });
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
            'رقم الفاتورة (Invoice ID)': s._id.toString().slice(-8),
            'التاريخ (Date)': s.createdAt.toLocaleDateString('ar-EG'),
            'الوقت (Time)': s.createdAt.toLocaleTimeString('ar-EG'),
            'عدد العناصر (Items)': s.items.reduce((acc, curr) => acc + curr.quantity, 0),
            'المجموع الفرعي (Subtotal)': parseFloat((s.subtotal || (s.total / 1.14)).toFixed(2)),
            'الضريبة (Tax 14%)': parseFloat((s.tax || (s.total - (s.total / 1.14))).toFixed(2)),
            'خصم النقاط (Loyalty Discount)': s.discount || 0,
            'الإجمالي النهائي (Total)': s.total,
            'طريقة الدفع (Payment Method)': s.paymentMethod === 'cash' ? 'نقدي' : s.paymentMethod
        }));
        
        const inventoryData = products.map(p => ({
            'الباركود (Barcode)': p.barcode || 'N/A',
            'اسم المنتج (Name)': p.name,
            'الفئة (Category)': p.category,
            'الوحدة (Unit)': p.unit === 'piece' ? 'قطعة' : (p.unit === 'kg' ? 'كيلو' : p.unit),
            'الكمية الحالية (Stock)': p.quantity,
            'تكلفة الشراء (Cost)': p.costPrice || 0,
            'سعر البيع (Price)': p.price || 0,
            'إجمالي التكلفة بالمخزون (Total Cost)': parseFloat(((p.costPrice || 0) * p.quantity).toFixed(2)),
            'قيمة المبيعات المتوقعة (Expected Revenue)': parseFloat(((p.price || 0) * p.quantity).toFixed(2)),
            'تنبيهات (Alerts)': p.quantity === 0 ? 'نفذت الكمية' : (p.quantity <= 10 ? 'أوشك على النفاذ' : 'متوفر')
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

// GET /api/reports/low-stock — products running low
router.get('/low-stock', async (req, res) => {
    try {
        const products = await Product.find({ userId: req.user._id })
            .sort('quantity')
            .limit(50);

        const lowStockItems = products
            .filter(p => p.quantity <= p.lowStockThreshold)
            .slice(0, 10)
            .map(p => ({
                _id: p._id,
                name: p.name,
                quantity: p.quantity,
                threshold: p.lowStockThreshold,
                category: p.category,
                unit: p.unit
            }));

        res.json({
            success: true,
            count: lowStockItems.length,
            totalLow: products.filter(p => p.quantity <= p.lowStockThreshold).length,
            items: lowStockItems
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// GET /api/reports/monthly-comparison — current vs previous month
router.get('/monthly-comparison', async (req, res) => {
    try {
        const userId = req.user._id;
        const lang = req.query.lang || 'ar';
        const now = new Date();

        // Current month range
        const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Previous month range
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const [currentSales, prevSales] = await Promise.all([
            Sale.find({ userId, createdAt: { $gte: currentStart, $lte: currentEnd } }),
            Sale.find({ userId, createdAt: { $gte: prevStart, $lte: prevEnd } })
        ]);

        const currentRevenue = currentSales.reduce((s, sale) => s + sale.total, 0);
        const prevRevenue = prevSales.reduce((s, sale) => s + sale.total, 0);
        const currentOrders = currentSales.length;
        const prevOrders = prevSales.length;
        const currentAvg = currentOrders > 0 ? currentRevenue / currentOrders : 0;
        const prevAvg = prevOrders > 0 ? prevRevenue / prevOrders : 0;

        function calcChange(current, previous) {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        }

        res.json({
            success: true,
            current: {
                revenue: currentRevenue,
                orders: currentOrders,
                avgOrder: currentAvg,
                monthLabel: currentStart.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { month: 'long', year: 'numeric' })
            },
            previous: {
                revenue: prevRevenue,
                orders: prevOrders,
                avgOrder: prevAvg,
                monthLabel: prevStart.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { month: 'long', year: 'numeric' })
            },
            change: {
                revenue: calcChange(currentRevenue, prevRevenue).toFixed(1),
                orders: calcChange(currentOrders, prevOrders).toFixed(1),
                avgOrder: calcChange(currentAvg, prevAvg).toFixed(1)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// GET /api/reports/expiry-alerts — products expired or near expiry
router.get('/expiry-alerts', async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

        const products = await Product.find({ 
                userId: req.user._id, 
                quantity: { $gt: 0 },
                expiryDate: { $lte: thirtyDaysFromNow, $ne: null } 
            })
            .sort('expiryDate')
            .limit(20);

        const alerts = products.map(p => ({
                _id: p._id,
                name: p.name,
                expiryDate: p.expiryDate,
                isExpired: p.expiryDate < now,
                daysLeft: Math.ceil((p.expiryDate - now) / (1000 * 60 * 60 * 24))
            }));

        res.json({
            success: true,
            items: alerts
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

module.exports = router;
