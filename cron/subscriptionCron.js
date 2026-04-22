const cron = require('node-cron');
const User = require('../models/User');
const Message = require('../models/Message');
const { sendSubscriptionWarningEmail } = require('../utils/email');

// Run every hour at minute 0
cron.schedule('0 * * * *', async () => {
    console.log('⏳ Running Subscription Expiration Cron Job...');
    try {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

        // 1. Check for 3-Day Warnings
        // Users whose subscription ends between now and 3 days from now, and haven't received the 3-day warning
        const users3Days = await User.find({
            subscriptionEndDate: { $gt: now, $lte: threeDaysFromNow },
            hasSent3DayWarning: false
        });

        for (const user of users3Days) {
            await sendSubscriptionWarningEmail(user.email, user.fullName, 3);

            // Send In-App Bell Notification
            await Message.create({
                receiver: user._id,
                title: 'تنبيه: اقتراب موعد التجديد',
                content: 'تنتهي باقتك الحالية خلال 3 أيام. يرجى شحن محفظتك وتجديد الباقة لتجنب إيقاف الحساب وتحويله للقراءة فقط.',
                isGlobal: false
            });

            // Mark as sent
            user.hasSent3DayWarning = true;
            await user.save();
        }

        // 2. Check for 12-Hour Warnings
        // Users whose subscription ends between now and 12 hours from now, and haven't received the 12-hour warning
        const users12Hours = await User.find({
            subscriptionEndDate: { $gt: now, $lte: twelveHoursFromNow },
            hasSent12HourWarning: false
        });

        for (const user of users12Hours) {
            await sendSubscriptionWarningEmail(user.email, user.fullName, 0.5); // 0.5 days = 12 hours

            // Send In-App Bell Notification
            await Message.create({
                receiver: user._id,
                title: 'عاجل: باقتك تنتهي قريباً جداً',
                content: 'تنتهي باقتك الحالية خلال أقل من 12 ساعة! بادر بالتجديد الآن لضمان استمرار عمل متجرك دون توقف.',
                isGlobal: false
            });

            // Mark as sent
            user.hasSent12HourWarning = true;
            await user.save();
        }

        // 3. Handle ACTUALLY EXPIRED subscriptions
        // Users whose subscription has already ended, who got warnings but never renewed
        const expiredUsers = await User.find({
            subscriptionEndDate: { $lte: now },
            hasSent12HourWarning: true, // They already received warnings
            status: 'active' // Only process active accounts (not already suspended)
        });

        for (const user of expiredUsers) {
            // Send expiration email
            try {
                await sendSubscriptionWarningEmail(user.email, user.fullName, 0);
            } catch (emailErr) {
                console.warn(`[Cron] Failed to send expiry email to ${user.email}:`, emailErr.message);
            }

            // Send In-App Bell Notification
            await Message.create({
                receiver: user._id,
                title: '⛔ تم إيقاف حسابك - انتهت الباقة',
                content: 'انتهت باقتك. أصبح حسابك الآن للقراءة فقط ولا يمكنك إضافة منتجات أو إجراء مبيعات جديدة. يرجى شحن محفظتك وتجديد الباقة لاستعادة الصلاحيات الكاملة.',
                isGlobal: false
            });

            // Reset warning flags so they can receive warnings again if they renew later
            user.hasSent3DayWarning = false;
            user.hasSent12HourWarning = false;
            await user.save();
        }

        if (users3Days.length > 0 || users12Hours.length > 0 || expiredUsers.length > 0) {
            console.log(`✅ Cron Finished: ${users3Days.length} 3-day, ${users12Hours.length} 12-hour, ${expiredUsers.length} expired.`);
        }

    } catch (err) {
        console.error('❌ Error executing Subscription Cron Job:', err.message);
    }
});

module.exports = cron;
