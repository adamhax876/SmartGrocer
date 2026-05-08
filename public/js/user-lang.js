const userTranslations = {
    en: {
        nav_dashboard: "Dashboard", nav_products: "Products", nav_inventory: "Inventory", nav_pos: "POS System", nav_sales: "Sales History", nav_reports: "Reports", nav_settings: "Store Settings", nav_support: "Support",

        btn_theme: "Theme", btn_logout: "Logout", btn_home: "🏠 Home", btn_delete_account: "Delete Account",
        title_dashboard: "Dashboard Overview",
        kpi_revenue: "Total Revenue", kpi_orders: "Orders Count", kpi_low_stock: "Low Stock Alerts", kpi_expiry: "Expiry Alerts", kpi_products: "Total Products",
        chart_sales: "Monthly Sales", chart_categories: "Category Distribution", btn_upgrade: "Upgrade Plan 🚀", btn_renew: "Renew Plan 🚀",
        expiry_alerts: "Expiry Alerts",

        // Sales / Reports / Products
        title_products: "Products Inventory", btn_add_product: "Add Product +", btn_import_excel: "Import Excel 📊",
        title_sales: "Sales & Invoices History", btn_refresh: "Refresh 🔄",
        th_invoice: "Invoice ID", th_date: "Date & Time", th_items: "Items", th_total: "Total", th_method: "Payment", th_details: "Details",
        th_name: "Product Name", th_category: "Category", th_price: "Selling Price", th_cost: "Cost Price", th_qty: "Stock Qty", th_status: "Status",
        btn_view: "View", pay_cash: "Cash", no_sales: "No sales found", invoice_title: "Invoice",

        // Add product modal
        modal_title: "Add New Product", label_pname: "Product Name", label_pcat: "Category", label_pcost: "Cost Price", label_pprice: "Selling Price", label_pqty: "Initial Quantity", btn_save: "Save Product",
        label_punit: "Unit", unit_piece: "Piece", unit_kg: "Kg", unit_liter: "Liter", unit_box: "Box", unit_pack: "Pack", label_pbarcode: "Barcode (Optional)",
        
        // Settings / General
        settings_title: "Store Settings",
        store_info_title: "Store Basic Information",
        label_store_logo: "Store Logo (URL)",
        label_store_name: "Store Name",
        label_store_type: "Business Type",
        label_store_phone: "Store Phone",
        label_currency: "Currency",
        label_vat_rate: "VAT Rate (%)",
        label_language: "Default Language",
        label_store_address: "Full Store Address",
        btn_save_settings: "Save Changes",
        logo_hint: "Logo appears on receipts and reports.",
        account_security_title: "Account Management",
        delete_account_desc: "Deleting the account will permanently erase all data.",

        
        // Billing
        bil_title: "Pricing & Subscriptions",
        bil_heading: "Upgrade Your Business to the Next Level",
        bil_subheading: "Choose the right plan. Advanced cloud tech, AI, and precise analytics at your fingertips.",
        bil_curr_plan: "Your Current Plan",
        bil_loading: "Loading...",
        bil_basic: "Basic Plan",
        bil_basic_desc: "Ideal for startups and medium stores",
        bil_month: "EGP /month",
        bil_pro: "Pro Plan",
        bil_pro_desc: "Power to expand your empire",
        bil_most: "Most Popular",
        bil_pay: "How to Pay & Activate",
        bil_pay_desc: "Transfer via below methods, then send a WhatsApp receipt to activate in minutes.",
        bil_active: "Active Plan",
        bil_expire: "Expired",
        bil_btn_basic: "Activate via WhatsApp",
        bil_btn_pro: "Activate Pro Plan",
        live_rate: "Live Exchange Rate: ",
        bil_feat1: "Manage up to <strong class=\"text-white\">3,000 products</strong> easily",
        bil_feat2: "Issue <strong class=\"text-white\">10,000 receipts</strong> monthly",
        bil_feat3: "Email Technical Support",
        bil_feat_pro1: "<strong class=\"text-white\">Unlimited products & sales</strong>",
        bil_feat_pro2: "Smart <strong class=\"text-white\">AI</strong> data analytics",
        bil_feat_pro3: "Send receipts via <strong class=\"text-white\">WhatsApp</strong>",
        bil_feat_pro4: "Cloud backups, loyalty program & branches",

        // Reports and Receipt
        btn_export_excel: "Export Excel",
        btn_ai_analysis: "AI Analysis",
        chart_trend: "Sales & Profit Trend",
        chart_trend_badge: "Last 30 Days",
        chart_top: "Top Selling Products",
        table_summary: "Financial Categories Summary",
        th_cat: "Category",
        th_qty_sold: "Qty Sold",
        th_rev: "Revenue",
        th_profit: "Net Profit",
        kpi_profit: "Est. Net Profit",
        kpi_cost: "Cost of Goods Sold",
        kpi_margin: "Profit Margin %",
        title_reports: "Advanced Analytical Reports",
        receipt_title: "Retail Sales - Simplified Tax INVOICE",
        receipt_date: "Date:",
        receipt_subtotal: "Subtotal before tax:",
        receipt_tax: "Tax (14%):",
        receipt_total: "Total (incl. tax):",
        receipt_footer: "Thank you for your visit! 🌟",
        btn_print: "🖨️ Print Receipt",
        btn_whatsapp: "Send via WhatsApp (Pro)",
        receipt_discount: "Points Discount:",
        receipt_points: "Current Customer Points:",
        
        // Dashboard new features
        monthly_comparison: "Monthly Performance",
        low_stock_alerts: "Low Stock Alerts",
        comp_revenue: "Revenue",
        comp_orders: "Orders",
        comp_avg: "Avg Order Value",
        stock_healthy: "Stock is healthy",
        val_greeting: "Welcome",
        
        // Delete Account
        del_acc_title: "Delete Account",
        del_acc_text: "Are you sure you want to permanently delete your store account? This action cannot be undone and all data will be lost.",
        del_acc_confirm: "Yes, delete it",
        del_acc_cancel: "Cancel",
        del_acc_deleting: "Deleting Account...",
        del_acc_bye: "Goodbye",
        badge_monthly: "📊 MONTHLY",
        badge_categories: "🏷️ CATEGORIES",
        
        // Settings page translations
        store_info_title: "Basic Store Information",
        label_store_logo: "Store Logo",
        logo_hint: "Appears on invoices and reports. Recommended: 300x300px (PNG/JPG).",
        btn_upload_logo: "Upload Logo Image",
        label_store_name: "Store Name",
        label_full_name: "Full Name (Owner)",
        label_store_type: "Business Type",
        label_store_phone: "Store Phone",
        label_auto_print: "Auto Print Receipts after Sale",
        label_currency: "Currency",
        label_vat_rate: "VAT Rate (%)",
        label_language: "Default Language",
        label_store_address: "Full Store Address",
        ph_store_address: "Cairo, Nasr St...",
        btn_save_settings: "Save Changes",
        
        // Store Types
        type_supermarket: "Supermarket",
        type_grocery: "Grocery",
        type_minimarket: "Mini Market",
        type_wholesale: "Wholesale",
        type_other: "Other Business",
        
        // Currencies
        curr_egp: "Egyptian Pound (EGP)",
        curr_sar: "Saudi Riyal (SAR)",
        curr_aed: "UAE Dirham (AED)",
        curr_kwd: "Kuwaiti Dinar (KWD)",
        curr_usd: "US Dollar (USD)",
        curr_eur: "Euro (EUR)"

    },
    ar: {
        nav_dashboard: "لوحة التحكم", nav_products: "المنتجات", nav_inventory: "المخزون", nav_pos: "نقطة البيع (POS)", nav_sales: "المبيعات", nav_reports: "التقارير", nav_settings: "إعدادات المتجر", nav_support: "الدعم الفني",

        btn_theme: "المظهر", btn_logout: "تسجيل الخروج", btn_home: "🏠 الرئيسية", btn_delete_account: "حذف حساب المتجر",
        title_dashboard: "نظرة عامة",
        kpi_revenue: "إجمالي المبيعات", kpi_orders: "الطلبات", kpi_low_stock: "تنبيهات المخزون", kpi_expiry: "تنبيهات الصلاحية", kpi_products: "إجمالي المنتجات",
        chart_sales: "المبيعات الشهرية", chart_categories: "توزيع الفئات", btn_upgrade: "ترقية الباقة 🚀", btn_renew: "تجديد الباقة 🚀",
        expiry_alerts: "تنبيهات الصلاحية",

        title_products: "قائمة المنتجات", btn_add_product: "إضافة منتج +", btn_import_excel: "استيراد من إكسيل 📊",
        title_sales: "سجل المبيعات والفواتير", btn_refresh: "تحديث السجل 🔄",
        th_invoice: "رقم الفاتورة", th_date: "التاريخ والوقت", th_items: "عدد العناصر", th_total: "الإجمالي", th_method: "طريقة الدفع", th_details: "تفاصيل",
        th_name: "اسم المنتج", th_category: "الفئة", th_price: "سعر البيع", th_cost: "التكلفة", th_qty: "الكمية الحالية", th_status: "الحالة",
        btn_view: "استعراض", pay_cash: "نقدي", no_sales: "لا توجد مبيعات", invoice_title: "الفاتورة",

        modal_title: "إضافة منتج جديد", label_pname: "اسم المنتج", label_pcat: "الفئة", label_pcost: "التكلفة", label_pprice: "سعر البيع", label_pqty: "الكمية الابتدائية", btn_save: "حفظ المنتج",
        label_punit: "الوحدة", unit_piece: "قطعة", unit_kg: "كيلو", unit_liter: "لتر", unit_box: "كرتونة", unit_pack: "عبوة", label_pbarcode: "الباركود (اختياري)",
        
        settings_title: "إعدادات المتجر",
        store_info_title: "معلومات المتجر الأساسية",
        label_store_logo: "رابط شعار المتجر (Logo URL)",
        label_store_name: "اسم المتجر",
        label_store_type: "نوع النشاط",
        label_store_phone: "رقم هاتف المتجر",
        label_currency: "العملة",
        label_vat_rate: "نسبة ضريبة القيمة المضافة (%)",
        label_language: "اللغة الافتراضية",
        label_store_address: "عنوان المتجر الكامل",
        btn_save_settings: "حفظ التغييرات",
        logo_hint: "يظهر الشعار في أعلى الفواتير والتقارير.",
        account_security_title: "إدارة الحساب",
        delete_account_desc: "حذف الحساب سيؤدي إلى مسح كافة البيانات بشكل نهائي.",

        
        // Billing
        bil_title: "الباقات والاشتراكات",
        bil_heading: "ارتقِ بتجارتك للمستوى التالي",
        bil_subheading: "اختر الباقة التي تناسب طموحك. تقنيات سحابية متقدمة، ذكاء اصطناعي، وتحليلات دقيقة بين يديك.",
        bil_curr_plan: "باقتك الحالية",
        bil_loading: "جاري التحميل...",
        bil_basic: "الباقة الأساسية",
        bil_basic_desc: "مثالية للمتاجر الناشئة والمتوسطة",
        bil_month: "ج.م /شهرياً",
        bil_pro: "الباقة الاحترافية",
        bil_pro_desc: "الطاقة القصوى لتوسيع إمبراطوريتك",
        bil_most: "الأكثر اختياراً",
        bil_pay: "كيفية الدفع والتفعيل",
        bil_pay_desc: "قم بتحويل المبلغ المطلوب عبر أحد الطرق التالية، ثم شاركنا إيصال التحويل عبر الواتساب لاختصار الوقت.",
        bil_active: "باقة نشطة",
        bil_expire: "منتهية الصلاحية",
        bil_btn_basic: "تفعيل عبر واتساب",
        bil_btn_pro: "تفعيل الباقة الفاخرة",
        live_rate: "سعر الصرف الحي: ",
        bil_feat1: "إدارة حتى <strong class=\"text-white\">3,000 منتج</strong> بسهولة تامة",
        bil_feat2: "إصدار <strong class=\"text-white\">10,000 فاتورة</strong> شهرياً",
        bil_feat3: "دعم فني عبر البريد الإلكتروني",
        bil_feat_pro1: "<strong class=\"text-white\">منتجات ومبيعات بلا حدود</strong>",
        bil_feat_pro2: "تحليلات ذكية بالـ <strong class=\"text-white\">AI</strong> للبيانات",
        bil_feat_pro3: "إرسال الفواتير للعملاء عبر <strong class=\"text-white\">واتساب</strong>",
        bil_feat_pro4: "نسخ احتياطي سحابي، ولاء العملاء وإدارة الفروع",

        // Reports and Receipt
        btn_export_excel: "تصدير إكسيل",
        btn_ai_analysis: "تحليل بالذكاء الاصطناعي",
        chart_trend: "اتجاه المبيعات والأرباح",
        chart_trend_badge: "آخر 30 يوم",
        chart_top: "أكثر المنتجات مبيعاً",
        table_summary: "ملخص الأداء المالي للفئات",
        th_cat: "الفئة",
        th_qty_sold: "الكمية المباعة",
        th_rev: "الإيرادات",
        th_profit: "الربح الصافي",
        kpi_profit: "صافي الربح التقديري",
        kpi_cost: "تكلفة البضاعة المباعة",
        kpi_margin: "هامش الربح %",
        title_reports: "التقارير التحليلية المتقدمة",
        receipt_title: "مبيعات تجزئة - فاتورة ضريبية مبسطة",
        receipt_date: "التاريخ:",
        receipt_subtotal: "المجموع قبل الضريبة:",
        receipt_tax: "الضريبة (14%):",
        receipt_total: "الإجمالي (شامل الضريبة):",
        receipt_footer: "شكراً لزيارتكم! 🌟",
        btn_print: "🖨️ طباعة الفاتورة",
        btn_whatsapp: "إرسال عبر واتساب (Pro)",
        receipt_discount: "خصم النقاط:",
        receipt_points: "نقاط العميل الحالية:",
        
        // Dashboard new features
        monthly_comparison: "مقارنة الأداء الشهري",
        low_stock_alerts: "تنبيهات المخزون المنخفض",
        comp_revenue: "الإيرادات",
        comp_orders: "الطلبات",
        comp_avg: "متوسط الفاتورة",
        stock_healthy: "المخزون بحالة جيدة",
        val_greeting: "أهلاً بك",
        
        // Delete Account
        del_acc_title: "حذف الحساب",
        del_acc_text: "هل أنت متأكد أنك تريد حذف حساب المتجر نهائياً؟ لا يمكن التراجع عن هذا الإجراء وسيتم فقدان جميع البيانات.",
        del_acc_confirm: "نعم، احذف الحساب",
        del_acc_cancel: "إلغاء",
        del_acc_deleting: "جاري الحذف...",
        del_acc_bye: "وداعاً",
        badge_monthly: "📊 شهري",
        badge_categories: "🏷️ الفئات",
        
        // Settings page translations
        store_info_title: "معلومات المتجر الأساسية",
        label_store_logo: "شعار المتجر",
        logo_hint: "يظهر الشعار في الفواتير والتقارير. المقاس الموصى به: 300x300 بكسل.",
        btn_upload_logo: "رفع صورة الشعار",
        label_store_name: "اسم المتجر",
        label_full_name: "اسم المالك الكامل",
        label_store_type: "نوع النشاط",
        label_store_phone: "رقم هاتف المتجر",
        label_auto_print: "الطباعة التلقائية بعد البيع",
        label_currency: "العملة",
        label_vat_rate: "نسبة ضريبة القيمة المضافة (%)",
        label_language: "اللغة الافتراضية",
        label_store_address: "عنوان المتجر الكامل",
        ph_store_address: "القاهرة، شارع النصر...",
        btn_save_settings: "حفظ التغييرات",
        
        // Store Types
        type_supermarket: "سوبر ماركت",
        type_grocery: "بقالة",
        type_minimarket: "ميني ماركت",
        type_wholesale: "جملة",
        type_other: "نشاط آخر",
        
        // Currencies
        curr_egp: "جنيه مصري (EGP)",
        curr_sar: "ريال سعودي (SAR)",
        curr_aed: "درهم إماراتي (AED)",
        curr_kwd: "دينار كويتي (KWD)",
        curr_usd: "دولار أمريكي (USD)",
        curr_eur: "يورو (EUR)"

    }
};

let currentUserLang = localStorage.getItem('sg_lang') || 'ar';
const t = (key) => (userTranslations[currentUserLang] && userTranslations[currentUserLang][key]) || key;

function applyUserLang() {
    document.documentElement.dir = currentUserLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentUserLang;
    
    const langToggleBtn = document.getElementById('langToggle');
    if (langToggleBtn) {
        langToggleBtn.textContent = currentUserLang === 'ar' ? 'English' : 'عربي';
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (userTranslations[currentUserLang] && userTranslations[currentUserLang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = userTranslations[currentUserLang][key];
            } else {
                el.innerHTML = userTranslations[currentUserLang][key];
            }
        }
    });
}

function toggleLanguage() {
    currentUserLang = currentUserLang === 'en' ? 'ar' : 'en';
    localStorage.setItem('sg_lang', currentUserLang);
    applyUserLang();
    location.reload();
}

document.addEventListener('DOMContentLoaded', applyUserLang);

function getTranslatedCategory(cat) {
    if (!cat) return '';
        const normalizeMap = {
        'بقالة عادية': 'groceries',
        'بقالة': 'groceries',
        'ألبان وأجبان': 'dairy',
        'لحوم ومجمدات': 'meat',
        'مشروبات وعصائر': 'beverages',
        'تسالي وحلويات': 'snacks',
        'فواكه': 'fruits',
        'خضروات': 'vegetables',
        'منظفات وأدوات منزلية': 'household',
        'منظفات': 'household',
        
        'groceries': 'groceries', 
        'dairy': 'dairy', 
        'meat': 'meat', 
        'beverages': 'beverages', 
        'snacks': 'snacks',
        'Dairy & Cheese': 'dairy',
        'Meat & Frozen': 'meat',
        'Beverages & Juice': 'beverages',
        'Snacks & Sweets': 'snacks',
        'bakery': 'bakery',
        'مخبوزات': 'bakery',
        'frozen': 'frozen',
        'مجمدات': 'frozen',
        'other': 'other',
        'أخرى': 'other',
        'fruits': 'fruits',
        'vegetables': 'vegetables',
        'household': 'household'
    };
    const key = normalizeMap[cat] || cat;
    const catMapAr = { 
        'groceries': 'بقالة عادية', 
        'dairy': 'ألبان وأجبان', 
        'meat': 'لحوم ومجمدات', 
        'beverages': 'مشروبات وعصائر', 
        'snacks': 'تسالي وحلويات',
        'bakery': 'مخبوزات',
        'frozen': 'مجمدات',
        'other': 'أخرى',
        'fruits': 'فواكه',
        'vegetables': 'خضروات',
        'household': 'منظفات وأدوات منزلية'
    };
    const catMapEn = { 
        'groceries': 'Groceries', 
        'dairy': 'Dairy & Cheese', 
        'meat': 'Meat & Frozen', 
        'beverages': 'Beverages', 
        'snacks': 'Snacks & Sweets',
        'bakery': 'Bakery',
        'frozen': 'Frozen Food',
        'other': 'Other',
        'fruits': 'Fruits',
        'vegetables': 'Vegetables',
        'household': 'Household Settings'
    };
    return currentUserLang === 'ar' ? (catMapAr[key] || cat) : (catMapEn[key] || cat);
}

function getTranslatedUnit(unit) {
    if (!unit) return '';
    const normalizeMap = {
        'قطعة': 'piece', 
        'كيلو': 'kg', 
        'لتر': 'liter', 
        'كرتونة': 'box', 
        'عبوة': 'pack',
        'piece': 'piece', 
        'kg': 'kg', 
        'liter': 'liter', 
        'box': 'box', 
        'pack': 'pack'
    };
    const key = normalizeMap[unit] || unit;
    return t('unit_' + key) || unit;
}
