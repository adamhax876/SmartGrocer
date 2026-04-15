require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // Mongoose Model

async function seed() {
    try {
        console.log('🔗 Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB!');

        const accounts = [
            {
                fullName: 'SmartGrocer Admin',
                email: 'admin@smartgrocer.com',
                password: 'adminpassword',
                storeName: 'SmartGrocer System',
                role: 'admin',
                isVerified: true
            },
            {
                fullName: 'Support Team',
                email: 'support@smartgrocer.com',
                password: 'supportpassword',
                storeName: 'SmartGrocer Helpdesk',
                role: 'support',
                isVerified: true
            }
        ];

        console.log('🗑️ Clearing any existing users just in case...');
        await User.deleteMany({ email: { $in: ['admin@smartgrocer.com', 'support@smartgrocer.com'] } });

        console.log('🌱 Planting the Administration accounts...');
        for (const acc of accounts) {
            await User.create(acc);
            console.log(`✅ Created ${acc.role} user: ${acc.email} / ${acc.password}`);
        }

        console.log('🎉 Done successfully!');
    } catch (err) {
        console.error('❌ Error seeding users:', err.message);
    } finally {
        mongoose.connection.close();
    }
}

seed();
