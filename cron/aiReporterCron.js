const cron = require('node-cron');
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const { sendEmailViaAPI } = require('../utils/email');

// Run every Monday at 8:00 AM
cron.schedule('0 8 * * 1', async () => {
    console.log('🤖 Starting AI Business Reporter Cron Job...');
    try {
        // Find Pro users
        const proUsers = await User.find({
            subscriptionPlan: 'Pro Plan',
            subscriptionEndDate: { $gt: new Date() } // Active only
        });

        for (const user of proUsers) {
            await generateAndSendAIReport(user);
        }

        console.log(`✅ AI Reporter finished. Sent reports to ${proUsers.length} Pro accounts.`);

    } catch (err) {
        console.error('❌ Error executing AI Reporter Cron Job:', err.message);
    }
});

async function generateAndSendAIReport(user) {
    try {
        const userId = user._id;

        // Date range: Last 7 days
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const sales = await Sale.find({ userId, createdAt: { $gte: lastWeek } });
        const products = await Product.find({ userId });

        const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
        const totalSales = sales.length;

        // Best selling product
        const productSales = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productSales[item.productName]) {
                    productSales[item.productName] = 0;
                }
                productSales[item.productName] += item.quantity;
            });
        });

        let bestProduct = 'لا يوجد';
        let maxQty = 0;
        for (const [name, qty] of Object.entries(productSales)) {
            if (qty > maxQty) {
                maxQty = qty;
                bestProduct = name;
            }
        }

        // Dead inventory (products with > 10 qty but 0 sales this week)
        const deadItems = products.filter(p => p.quantity > 10 && !Object.keys(productSales).includes(p.name));

        // Low stock alerts
        const lowStock = products.filter(p => p.quantity <= p.lowStockThreshold || p.quantity <= 5).slice(0, 5);

        const { generateAIReport } = require('../utils/ai');

        // Build storeData object for Gemini
        const storeData = {
            totalSales: totalRevenue.toFixed(2),
            topProduct: bestProduct,
            worstProduct: deadItems.length > 0 ? deadItems[0].name : 'لا يوجد',
            lowStock: lowStock.length > 0 ? lowStock.map(p => p.name).join('، ') : 'لا يوجد'
        };

        // Fetch AI Insight
        const aiInsightText = await generateAIReport(storeData);

        const html = `
        <div style="font-family: Arial, sans-serif; text-align: right; direction: rtl; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">التقرير الأسبوعي الذكي لمتجرك 🏪</h2>
            <p>أهلاً بك <strong>${user.fullName}</strong>،</p>
            <p>إليك ملخص أداء متجر "${user.storeName}" في الأسبوع الماضي:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; background: #f8fafc;">إجمالي المبيعات:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>${totalRevenue.toFixed(2)} ج.م</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; background: #f8fafc;">عدد الفواتير:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>${totalSales}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; background: #f8fafc;">الأكثر مبيعاً:</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>${bestProduct}</strong></td>
                </tr>
            </table>

            <div style="background: #eff6ff; border-right: 4px solid #3b82f6; padding: 15px; margin-top: 20px; border-radius: 4px;">
                ${aiInsightText.replace(/\n/g, '<br>')}
            </div>

            ${lowStock.length > 0 ? `
            <div style="margin-top: 20px;">
                <h4 style="color: #dc2626;">⚠️ نواقص يجب توفيرها:</h4>
                <ul>
                    ${lowStock.map(p => `<li>${p.name} (المتبقي: ${p.quantity})</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <p style="margin-top: 30px; font-size: 12px; color: #666;">
                هذا التقرير يتم إصداره آلياً وحصرياً لمشتركي الباقة الاحترافية (Pro Plan) 🚀.
            </p>
        </div>
        `;

        // Send Email
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        await sendEmailViaAPI(
            user.email,
            user.fullName,
            `التقرير الأسبوعي لمتجر ${user.storeName} 📊`,
            html,
            aiInsightText
        );

    } catch (e) {
        console.error(`Failed to generate AI report for user ${user._id}:`, e.message);
    }
}

module.exports = cron;
