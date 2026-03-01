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
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'answered', 'closed'],
        default: 'open'
    },
    adminReply: {
        type: String,
        default: ''
    },
    repliedAt: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
