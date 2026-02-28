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

        // Find all active Pro users
        const proUsers = await User.find({
            subscriptionPlan: 'Pro Plan',
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

            fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
            console.log(`✅ Saved backup for ${user.storeName} at ${filePath}`);
        }

        console.log(`✅ Backup process finished. Backed up ${proUsers.length} Pro accounts.`);

    } catch (err) {
        console.error('❌ Error executing Backup Cron Job:', err.message);
    }
});

module.exports = cron;
