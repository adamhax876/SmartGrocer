const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: { // Legacy
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'answered', 'closed'],
        default: 'open'
    },
    adminReply: { // Legacy
        type: String,
        default: ''
    },
    repliedAt: {
        type: Date
    },
    messages: [{
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['user', 'admin', 'support'] },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    hasUnreadUser: { type: Boolean, default: false }, // User Bell Notification
    hasUnreadAdmin: { type: Boolean, default: true } // Admin Tab Badge Notification
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
