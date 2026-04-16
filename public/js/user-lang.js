const userTranslations = {
    en: {
        nav_dashboard: "Dashboard", nav_products: "Products", nav_inventory: "Inventory", nav_pos: "POS System", nav_sales: "Sales History", nav_reports: "Reports", nav_support: "Support",
        btn_theme: "Theme", btn_logout: "Logout", btn_home: "🏠 Home", btn_delete_account: "Delete Account",
        title_dashboard: "Dashboard Overview",
        kpi_revenue: "Total Revenue", kpi_orders: "Orders Count", kpi_low_stock: "Low Stock Alerts", kpi_products: "Total Products",
        chart_sales: "Monthly Sales", chart_categories: "Category Distribution", btn_upgrade: "Upgrade Plan 🚀",

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
        settings_title: "Store Settings"
    },
    ar: {
        nav_dashboard: "لوحة التحكم", nav_products: "المنتجات", nav_inventory: "المخزون", nav_pos: "نقطة البيع (POS)", nav_sales: "المبيعات", nav_reports: "التقارير", nav_support: "الدعم الفني",
        btn_theme: "المظهر", btn_logout: "تسجيل الخروج", btn_home: "🏠 الرئيسية", btn_delete_account: "حذف حساب المتجر",
        title_dashboard: "نظرة عامة",
        kpi_revenue: "إجمالي المبيعات", kpi_orders: "الطلبات", kpi_low_stock: "تنبيهات المخزون", kpi_products: "إجمالي المنتجات",
        chart_sales: "المبيعات الشهرية", chart_categories: "توزيع الفئات", btn_upgrade: "ترقية الباقة 🚀",

        title_products: "قائمة المنتجات", btn_add_product: "إضافة منتج +", btn_import_excel: "استيراد من إكسيل 📊",
        title_sales: "سجل المبيعات والفواتير", btn_refresh: "تحديث السجل 🔄",
        th_invoice: "رقم الفاتورة", th_date: "التاريخ والوقت", th_items: "عدد العناصر", th_total: "الإجمالي", th_method: "طريقة الدفع", th_details: "تفاصيل",
        th_name: "اسم المنتج", th_category: "الفئة", th_price: "سعر البيع", th_cost: "التكلفة", th_qty: "الكمية بالمخزون", th_status: "الحالة",
        btn_view: "استعراض", pay_cash: "نقدي", no_sales: "لا توجد مبيعات", invoice_title: "الفاتورة",

        modal_title: "إضافة منتج جديد", label_pname: "اسم المنتج", label_pcat: "الفئة", label_pcost: "التكلفة", label_pprice: "سعر البيع", label_pqty: "الكمية الابتدائية", btn_save: "حفظ المنتج",
        label_punit: "الوحدة", unit_piece: "قطعة", unit_kg: "كيلو", unit_liter: "لتر", unit_box: "كرتونة", unit_pack: "عبوة", label_pbarcode: "الباركود (اختياري)",
        
        settings_title: "إعدادات المتجر"
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
                el.textContent = userTranslations[currentUserLang][key];
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
