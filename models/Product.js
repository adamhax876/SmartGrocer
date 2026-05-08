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
        enum: ['fruits', 'vegetables', 'dairy', 'meat', 'beverages', 'snacks', 'bakery', 'frozen', 'household', 'groceries', 'other']
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
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    },
    batches: [{
        quantity: { type: Number, default: 0 },
        expiryDate: { type: Date },
        costPrice: { type: Number, default: 0 },
        addedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Pre-save hook to sync quantity and nearest expiryDate
productSchema.pre('save', function (next) {
    if (this.batches && this.batches.length > 0) {
        // Remove empty batches
        this.batches = this.batches.filter(b => b.quantity > 0);
        
        // Sum total quantity
        this.quantity = this.batches.reduce((sum, b) => sum + b.quantity, 0);
        
        // Find nearest expiry date
        const dates = this.batches
            .filter(b => b.expiryDate)
            .map(b => b.expiryDate);
        
        if (dates.length > 0) {
            this.expiryDate = new Date(Math.min(...dates.map(d => d.getTime())));
        } else {
            this.expiryDate = undefined;
        }

        // Set cost price to latest batch cost price
        if (this.batches.length > 0) {
            this.costPrice = this.batches[this.batches.length - 1].costPrice || this.costPrice;
        }
    } else {
        // If it was batch-based but now empty, quantity should be 0
        // (Unless manually set, but we assume batches are the source of truth if present)
    }
    next();
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
