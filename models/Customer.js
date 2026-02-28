const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        default: 'عميل'
    },
    phone: {
        type: String,
        required: true
    },
    points: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// A store cannot have duplicate phone numbers for different customers
customerSchema.index({ userId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
