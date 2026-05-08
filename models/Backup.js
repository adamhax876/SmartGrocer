const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    data: { type: Object, required: true }, // Contains { products: [], sales: [] }
    counts: {
        products: { type: Number, default: 0 },
        sales: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now }
});

// Index to quickly find latest backups for a user
backupSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Backup', backupSchema);
