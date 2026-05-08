const cron = require('node-cron');
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Backup = require('../models/Backup');

// Run every night at 2:00 AM
cron.schedule('0 2 * * *', async () => {
    console.log('☁️ Starting Automated Persistent DB Backup for Pro Users...');
    try {
        // Find all active Pro and Free Trial users
        const proUsers = await User.find({
            subscriptionPlan: { $in: ['Pro Plan', 'Free Trial'] },
            subscriptionEndDate: { $gt: new Date() } // Active only
        });

        for (const user of proUsers) {
            const userId = user._id;

            // Gather all user data
            const products = await Product.find({ userId });
            const sales = await Sale.find({ userId });

            const backupData = {
                products,
                sales
            };

            // Save to MongoDB collection (Atlas) - Permanent & Free
            await Backup.create({
                userId,
                data: backupData,
                counts: {
                    products: products.length,
                    sales: sales.length
                }
            });

            // Keep only last 7 backups per user to save space
            const backups = await Backup.find({ userId }).sort({ createdAt: -1 });
            if (backups.length > 7) {
                const toDelete = backups.slice(7);
                await Backup.deleteMany({ _id: { $in: toDelete.map(b => b._id) } });
            }

            console.log(`✅ MongoDB Backup created for ${user.storeName}`);
        }

        console.log(`✅ Backup process finished. Saved snapshots for ${proUsers.length} Pro accounts in Atlas.`);

    } catch (err) {
        console.error('❌ Error executing Backup Cron Job:', err.message);
    }
});

module.exports = cron;
