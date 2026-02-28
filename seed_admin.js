require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Plan = require('./models/Plan');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgrocer';

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB for seeding');

        // 1. Seed Plans
        await Plan.deleteMany({});
        const plans = [
            {
                name: 'Basic',
                price: 0,
                maxProducts: 50,
                maxUsers: 1,
                features: ['Up to 50 Products', 'Basic Analytics', 'Standard Support'],
                durationDays: 30
            },
            {
                name: 'Pro',
                price: 199,
                maxProducts: 500,
                maxUsers: 3,
                features: ['Up to 500 Products', 'Advanced Analytics', 'Priority Support', 'Custom Domain'],
                durationDays: 30
            },
            {
                name: 'Premium',
                price: 499,
                maxProducts: 2000,
                maxUsers: 10,
                features: ['Unlimited Products', 'Full Analytics Suite', '24/7 Dedicated Support', 'API Access', 'Custom Domain'],
                durationDays: 30
            }
        ];
        await Plan.insertMany(plans);
        console.log('✅ Plans seeded successfully');

        // 2. Seed Admin User
        await User.deleteOne({ email: 'admin@smartgrocer.com' });
        const adminUser = new User({
            storeName: 'SmartGrocer HQ',
            storeType: 'other',
            fullName: 'System Administrator',
            email: 'admin@smartgrocer.com',
            password: 'adminpassword123', // In a real app, this should be set via env var, but for testing this is fine
            role: 'admin',
            isVerified: true
        });
        await adminUser.save();
        console.log('✅ Super Admin account created successfully (admin@smartgrocer.com / adminpassword123)');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding error:', err);
        process.exit(1);
    }
};

seedDatabase();
