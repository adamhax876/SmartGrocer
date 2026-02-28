require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartgrocer';

async function clearUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        await User.deleteMany({});
        console.log('✅ All users deleted successfully from the database.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error deleting users:', err);
        process.exit(1);
    }
}
clearUsers();
