const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    currency: {
        type: String,
        default: 'EGP' // or USD depending on payment gateway support
    },
    features: [{
        type: String
    }],
    maxProducts: {
        type: Number, // Example feature: Limit max products a store can have
        default: 50
    },
    maxUsers: {
        type: Number, // Example feature: Limit store staff
        default: 1
    },
    durationDays: {
        type: Number,
        default: 30 // Monthly subscription
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Plan', planSchema);
