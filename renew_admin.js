require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function renew() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        const result = await User.updateMany(
            { role: 'admin' }, 
            { 
                $set: { 
                    subscriptionPlan: 'Pro Plan', 
                    subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    status: 'active'
                } 
            }
        );
        
        if (result.matchedCount === 0) {
            console.log('⚠️ No admin accounts found to update.');
        } else {
            console.log(`✅ Success! Updated ${result.modifiedCount} admin account(s).`);
            console.log('📅 New expiry: ' + new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleString());
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        mongoose.connection.close();
    }
}

renew();
