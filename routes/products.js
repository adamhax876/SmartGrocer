const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { enforceLockout, enforceLimits } = require('../middleware/subscription');

// All routes require authentication and lockout check
router.use(auth);
router.use(enforceLockout);

// Multer config for Excel upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'application/csv'
        ];
        if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel/CSV files (.xlsx, .xls, .csv) are allowed'));
        }
    }
});

// GET /api/products — list all products for this user
router.get('/', async (req, res) => {
    try {
        const { category, search, sort, lowStock, nearExpiry } = req.query;
        const filter = { userId: req.user._id };

        if (category && category !== 'all') filter.category = category;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { nameEn: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } }
            ];
        }

        let query = Product.find(filter);

        // Sort
        if (sort === 'name') query = query.sort('name');
        else if (sort === 'price') query = query.sort('-price');
        else if (sort === 'quantity') query = query.sort('quantity');
        else query = query.sort('-createdAt');

        const products = await query;

        // Filter low stock and near expiry in JS (virtuals)
        let result = products;
        if (lowStock === 'true') {
            result = result.filter(p => p.quantity <= p.lowStockThreshold);
        }
        if (nearExpiry === 'true') {
            const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            result = result.filter(p => p.expiryDate && p.expiryDate <= weekFromNow && p.expiryDate > new Date());
        }

        res.json({
            count: result.length,
            products: result
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// GET /api/products/stats — product statistics
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user._id;
        const total = await Product.countDocuments({ userId });
        const products = await Product.find({ userId });

        const lowStock = products.filter(p => p.quantity <= p.lowStockThreshold).length;
        const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const nearExpiry = products.filter(p => p.expiryDate && p.expiryDate <= weekFromNow && p.expiryDate > new Date()).length;
        const expired = products.filter(p => p.expiryDate && p.expiryDate < new Date()).length;
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);

        // Category breakdown
        const categories = {};
        products.forEach(p => {
            if (!categories[p.category]) categories[p.category] = { count: 0, value: 0 };
            categories[p.category].count++;
            categories[p.category].value += p.price * p.quantity;
        });

        res.json({
            total, lowStock, nearExpiry, expired, totalValue, categories
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// POST /api/products — create product
router.post('/', enforceLimits('products'), async (req, res) => {
    try {
        if (req.body.price < 0 || req.body.costPrice < 0 || req.body.quantity < 0) {
            return res.status(400).json({ message: 'الأسعار والكميات لا يمكن أن تكون قيم سالبة' });
        }
        
        const product = await Product.create({
            ...req.body,
            userId: req.user._id
        });
        res.status(201).json({ product });
    } catch (error) {
        res.status(400).json({ message: 'بيانات غير صحيحة', error: error.message });
    }
});

// PUT /api/products/:id — update product
router.put('/:id', async (req, res) => {
    try {
        if (req.body.price < 0 || req.body.costPrice < 0 || req.body.quantity < 0) {
            return res.status(400).json({ message: 'الأسعار والكميات لا يمكن أن تكون قيم سالبة' });
        }

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );
        if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });
        res.json({ product });
    } catch (error) {
        res.status(400).json({ message: 'بيانات غير صحيحة', error: error.message });
    }
});

// DELETE /api/products/:id — delete product
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });
        res.json({ message: 'تم حذف المنتج بنجاح' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ', error: error.message });
    }
});

// POST /api/products/import — import from Excel
router.post('/import', enforceLimits('products'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'يرجى رفع ملف Excel' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data.length === 0) {
            return res.status(400).json({ message: 'الملف فارغ' });
        }

        const products = [];
        const errors = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                const product = {
                    name: row['اسم المنتج'] || row['name'] || row['Name'],
                    nameEn: row['الاسم بالإنجليزية'] || row['nameEn'] || row['Name (English)'] || '',
                    category: mapCategory(row['الفئة'] || row['category'] || row['Category']),
                    price: parseFloat(row['السعر'] || row['price'] || row['Price'] || 0),
                    costPrice: parseFloat(row['سعر التكلفة'] || row['costPrice'] || row['Cost'] || 0),
                    quantity: parseInt(row['الكمية'] || row['quantity'] || row['Quantity'] || 0),
                    unit: mapUnit(row['الوحدة'] || row['unit'] || row['Unit']),
                    barcode: String(row['الباركود'] || row['barcode'] || row['Barcode'] || ''),
                    expiryDate: parseExcelDate(row['تاريخ الانتهاء'] || row['expiryDate'] || row['Expiry']),
                    userId: req.user._id
                };

                if (!product.name) {
                    errors.push(`Row ${i + 2}: Missing product name`);
                    continue;
                }

                if (product.price < 0 || product.costPrice < 0 || product.quantity < 0) {
                    errors.push(`Row ${i + 2}: Negative values are not allowed for price or quantity`);
                    continue;
                }

                products.push(product);
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        if (products.length > 0) {
            await Product.insertMany(products);
        }

        res.json({
            message: `تم استيراد ${products.length} منتج بنجاح`,
            imported: products.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في قراءة الملف', error: error.message });
    }
});

// GET /api/products/template — download Excel template
router.get('/template', (req, res) => {
    const data = [
        {
            'اسم المنتج': 'حليب طازج',
            'الاسم بالإنجليزية': 'Fresh Milk',
            'الفئة': 'dairy',
            'السعر': 15.50,
            'سعر التكلفة': 10,
            'الكمية': 100,
            'الوحدة': 'piece',
            'الباركود': '123456789',
            'تاريخ الانتهاء': '2025-06-30'
        }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=smartgrocer_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
});

// Helpers
function mapCategory(cat) {
    const map = {
        'فواكه': 'fruits', 'خضروات': 'vegetables', 'ألبان': 'dairy',
        'لحوم': 'meat', 'مشروبات': 'beverages', 'وجبات خفيفة': 'snacks',
        'مخبوزات': 'bakery', 'مجمدات': 'frozen', 'منزلية': 'household',
        'أخرى': 'other'
    };
    return map[cat] || cat || 'other';
}

function mapUnit(unit) {
    const map = { 'قطعة': 'piece', 'كيلو': 'kg', 'لتر': 'liter', 'صندوق': 'box', 'عبوة': 'pack' };
    return map[unit] || unit || 'piece';
}

function parseExcelDate(val) {
    if (!val) return undefined;
    if (typeof val === 'number') {
        // Excel serial date
        const utc_days = Math.floor(val - 25569);
        return new Date(utc_days * 86400 * 1000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
}

module.exports = router;
