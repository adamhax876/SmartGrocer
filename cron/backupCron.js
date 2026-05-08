const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

// Run every night at 2:00 AM
cron.schedule('0 2 * * *', async () => {
    console.log('☁️ Starting Automated Cloud DB Backup for Pro Users...');
    try {
        const backupsDir = path.join(__dirname, '..', 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir);
        }

        // Find all active Pro and Free Trial users
        const proUsers = await User.find({
            subscriptionPlan: { $in: ['Pro Plan', 'Free Trial'] },
            subscriptionEndDate: { $gt: new Date() } // Active only
        });

        const dateStr = new Date().toISOString().split('T')[0];

        for (const user of proUsers) {
            const userId = user._id;

            // Gather all user data
            const products = await Product.find({ userId });
            const sales = await Sale.find({ userId });

            const backupData = {
                metadata: {
                    user: user.email,
                    storeName: user.storeName,
                    backupDate: new Date(),
                    counts: {
                        products: products.length,
                        sales: sales.length
                    }
                },
                products,
                sales
            };

            const fileName = `backup_${user._id}_${dateStr}.json`;
            const filePath = path.join(backupsDir, fileName);
            const jsonStr = JSON.stringify(backupData, null, 2);

            fs.writeFileSync(filePath, jsonStr);
            console.log(`✅ Saved backup for ${user.storeName} at ${filePath}`);

            // NEW: Send backup to owner email for ultimate safety
            try {
                const { sendEmailWithFallback } = require('../utils/email');
                const subject = `نسخة احتياطية لمتجرك - ${user.storeName} (${dateStr})`;
                const html = `
                    <div style="direction: rtl; text-align: right; font-family: sans-serif;">
                        <h2>مرحباً ${user.fullName || 'بك'}،</h2>
                        <p>هذه هي النسخة الاحتياطية التلقائية لبيانات متجرك <strong>${user.storeName}</strong> ليوم ${dateStr}.</p>
                        <p>يحتوي الملف المرفق على كافة المنتجات والمبيعات الخاصة بك.</p>
                        <hr>
                        <p style="color: #666; font-size: 12px;">هذا الإجراء يتم تلقائياً لضمان سلامة بياناتك.</p>
                    </div>
                `;
                await sendEmailWithFallback(user.email, user.fullName, subject, html, "Backup File Attached.", [
                    { filename: fileName, content: jsonStr }
                ]);
                console.log(`📧 Email backup sent to ${user.email}`);
            } catch (e) {
                console.error(`❌ Failed to send backup email to ${user.email}:`, e.message);
            }
        }

        console.log(`✅ Backup process finished. Backed up and Emailed ${proUsers.length} Pro accounts.`);

    } catch (err) {
        console.error('❌ Error executing Backup Cron Job:', err.message);
    }
});

module.exports = cron;
