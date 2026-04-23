require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Product = require('./models/Product');
    const categories = await Product.distinct('category');
    console.log("ALL DB CATEGORIES:", categories);
    process.exit(0);
}).catch(console.error);
