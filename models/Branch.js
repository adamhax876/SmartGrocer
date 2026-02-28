const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // The Store Owner
    },
    name: {
        type: String,
        required: [true, 'Branch name is required'],
        trim: true
    },
    location: {
        type: String,
        trim: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Branch', branchSchema);
