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
                const key = item.productName || item.name || 'Unknown';
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

        // --- NEW: Advanced AI Insights Data ---
        // 1. Peak Hours (Hourly distribution)
        const hourlyStats = Array(24).fill(0);
        recentSales.forEach(s => {
            const hr = new Date(s.createdAt).getHours();
            hourlyStats[hr]++;
        });
        const peakHour = hourlyStats.indexOf(Math.max(...hourlyStats));
        
        // 2. Basket Analysis (Commonly bought together)
        const pairs = {};
        recentSales.forEach(s => {
            if (s.items.length > 1) {
                const names = s.items.map(i => i.productName || i.name).filter(n => n && n !== 'Unknown').sort();
                for (let i = 0; i < names.length; i++) {
                    for (let j = i + 1; j < names.length; j++) {
                        const p = `${names[i]} & ${names[j]}`;
                        pairs[p] = (pairs[p] || 0) + 1;
                    }
                }
            }
        });
        const commonPairs = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);

        // 3. Customer Loyalty
        const uniqueCustomers = new Set(recentSales.map(s => s.customerName).filter(c => c && c !== 'عميل')).size;
        const repeatRate = recentSales.length > 0 ? ((uniqueCustomers / recentSales.length) * 100).toFixed(0) : 0;


        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error("GROQ_API_KEY is missing in server environment");

        const isAr = lang === 'ar';
        const prompt = `You are a world-class retail business analyst and CEO consultant. 
        Create a high-impact, professional performance report for the store "${user.storeName || 'N/A'}".

STORE OWNER: "${user.fullName}"
STORE NAME: "${user.storeName || 'N/A'}" (IMPORTANT: ALWAYS use this name, NEVER call it "SmartGrocer" in the report).

====== DATA TO ANALYZE ======
- Revenue (30d): ${totalRevenue.toFixed(2)} EGP
- Orders (30d): ${recentSales.length}
- Avg Order: ${avgOrder.toFixed(2)} EGP
- Estimated Profit: ${estimatedProfit.toFixed(2)} EGP
- Margin: ${profitMargin}%
- Payments: ${paymentStr || 'N/A'}

- Top Products: ${topProducts.join(' | ') || 'N/A'}
- Slow Products: ${slowProducts.join(' | ') || 'N/A'}

- Inventory: Total ${products.length} types.
- Low Stock: ${lowStockItems.length} items (⚠️ ${lowStockItems.slice(0, 5).map(p => `${p.name}: ${p.quantity} left`).join(', ')})
- Out of Stock: ${outOfStock.length} items (🔴 ${outOfStock.slice(0, 3).map(p => p.name).join(', ')})
- Near Expiry: ${nearExpiry.length} items (⏰ ${nearExpiry.slice(0, 5).map(p => `${p.name} expires on ${p.expiryDate?.toLocaleDateString()}`).join(', ')})

- Trend (7d Revenue): ${dailyRevenue.join(' -> ')}

--- UNIQUE AI INSIGHTS (NOT VISIBLE ON DASHBOARD) ---
- Peak Hour: Busiest time is around ${peakHour}:00 (24h format).
- Cross-Selling: Customers frequently buy these together: ${commonPairs.join(' | ') || 'No pairs detected'}.
- Loyalty: Unique known customers: ${uniqueCustomers} out of ${recentSales.length} total orders.

---

Write a CONCISE and STUNNING report in ${isAr ? 'Arabic' : 'English'}.
Structure it using these EXACT sections (use emojis):

1. 📊 Executive Summary: Start by mentioning "${user.storeName || 'the store'}" health.
2. 💰 Financial & Growth: Insights on profit and how to improve the ${avgOrder.toFixed(0)} EGP average order.
3. 🏆 Winning Products & Bundles: Use the "Cross-Selling" data to suggest specific bundles (e.g., "Sell Product A with Product B at a discount").
4. ⏰ Critical Inventory & Expiry: Focus on products about to expire with their dates.
5. 🎯 Strategic Action Plan: 5 BOLD steps to grow the store.

RULES:
- NEVER use the word "SmartGrocer" for the store name. Use "${user.storeName || 'المتجر'}".
- BE SPECIFIC with numbers and product names.
- USE the Cross-selling and Peak Hour data to give "Expert" advice.
- DO NOT USE IDs. DO NOT USE FOREIGN LANGUAGES.
- Wrap response in <div> tags as instructed.
- Total length: ~450 words. Focus on being an "AI Consultant".`;



        const systemContent = `You are a premium retail business analyst. Respond ONLY with clean HTML.
                        Wrap each section in <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);">
                        Use <h3> for titles with color var(--primary). Use <strong> for highlights.
                        Strictly use ${isAr ? 'Arabic' : 'English'}. NO mixed languages.`;

        // Send the prompt and key to the frontend so the browser can make the request directly
        // This bypasses the Cloudflare block on Render.com datacenter IPs
        res.json({
            success: true,
            apiKey: apiKey,
            systemPrompt: systemContent,
            userPrompt: prompt
        });

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
