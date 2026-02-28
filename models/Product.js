const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    nameEn: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['fruits', 'vegetables', 'dairy', 'meat', 'beverages', 'snacks', 'bakery', 'frozen', 'household', 'other']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: 0
    },
    costPrice: {
        type: Number,
        min: 0,
        default: 0
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: 0,
        default: 0
    },
    unit: {
        type: String,
        enum: ['piece', 'kg', 'liter', 'box', 'pack'],
        default: 'piece'
    },
    barcode: {
        type: String,
        trim: true
    },
    image: {
        type: String,
        default: ''
    },
    expiryDate: {
        type: Date
    },
    lowStockThreshold: {
        type: Number,
        default: 10
    },
    isActive: {
        type: Boolean,
        default: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Virtual: is low stock
productSchema.virtual('isLowStock').get(function () {
    return this.quantity <= this.lowStockThreshold;
});

// Virtual: is near expiry (within 7 days)
productSchema.virtual('isNearExpiry').get(function () {
    if (!this.expiryDate) return false;
    const daysUntilExpiry = (this.expiryDate - new Date()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
});

// Virtual: is expired
productSchema.virtual('isExpired').get(function () {
    if (!this.expiryDate) return false;
    return this.expiryDate < new Date();
});

// Include virtuals in JSON
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
