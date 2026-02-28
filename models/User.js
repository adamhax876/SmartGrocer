const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Store info
    storeName: {
        type: String,
        required: [true, 'Store name is required'],
        trim: true
    },
    storeType: {
        type: String,
        enum: ['supermarket', 'grocery', 'minimarket', 'wholesale', 'other'],
        default: 'supermarket'
    },
    role: {
        type: String,
        enum: ['admin', 'store_owner', 'cashier'],
        default: 'store_owner'
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    },
    // User info
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6
    },
    // Verification
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationCode: String,
    verificationExpires: Date,
    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // Settings
    status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active'
    },
    language: {
        type: String,
        enum: ['ar', 'en'],
        default: 'ar'
    },
    theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light'
    },
    // SaaS Subscription Data
    walletBalance: {
        type: Number,
        default: 0
    },
    subscriptionPlan: {
        type: String,
        enum: ['Free Trial', 'Basic Plan', 'Pro Plan'],
        default: 'Free Trial'
    },
    subscriptionEndDate: {
        type: Date,
        // Default sets to 14 days from creation for new users
        default: () => new Date(+new Date() + 14 * 24 * 60 * 60 * 1000)
    },
    country: {
        type: String,
        default: 'Egypt'
    },
    hasSent3DayWarning: {
        type: Boolean,
        default: false
    },
    hasSent12HourWarning: {
        type: Boolean,
        default: false
    },
    lastIpAddress: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
