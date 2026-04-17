// Localization
let adminLang = localStorage.getItem('sg_admin_lang') || 'ar';
const adminDict = {
    ar: {
        langBtn: 'English', dir: 'rtl', overview: 'نظرة عامة',
        nav_dashboard: 'الرئيسية', nav_stores: 'المتاجر المشتركة', nav_payments: 'طرق الدفع', nav_settings: 'إعدادات النظام', nav_logout: 'تسجيل خروج', nav_tickets: 'تذاكر الدعم',
        statStores: 'المتاجر النشطة', statSubs: 'الاشتراكات الفعالة', statTickets: 'تذاكر الدعم المفتوحة',
        chartTitle: 'نمو المشتركين', latest: 'أحدث المتاجر', viewAll: 'عرض الكل →', 
        th_name: 'اسم المتجر', th_status: 'الحالة', th_plan: 'الباقة', active: 'نشط', suspended: 'موقوف',
        noStores: 'لا توجد متاجر مسجلة بعد', noGrowth: 'لا توجد بيانات نمو بعد',
        chartLabel: 'مشتركين جدد', last6months: '📈 آخر 6 أشهر',
        users: 'المتاجر المشتركة', th_store: 'المتجر / المالك', th_email: 'البريد الإلكتروني', th_type: 'النوع',
        th_join: 'تاريخ الانضمام', th_ip: 'IP الدخول', th_action: 'إجراءات',
        title_payments: 'طرق الدفع', btn_addPay: 'إضافة طريقة دفع', th_details: 'التفاصيل',
        title_settings: 'الإعدادات العامة', saveBtn: 'حفظ التعديلات',
        title_tickets: 'تذاكر الدعم', th_subj: 'الموضوع', th_date: 'التاريخ'
    },
    en: {
        langBtn: 'عربي', dir: 'ltr', overview: 'Overview',
        nav_dashboard: 'Dashboard', nav_stores: 'Stores', nav_payments: 'Payments', nav_settings: 'Settings', nav_logout: 'Logout', nav_tickets: 'Support Tickets',
        statStores: 'Active Stores', statSubs: 'Active Subscriptions', statTickets: 'Open Support Tickets',
        chartTitle: 'Subscriber Growth', latest: 'Latest Stores', viewAll: 'View All →', 
        th_name: 'Store Name', th_status: 'Status', th_plan: 'Plan', active: 'Active', suspended: 'Suspended',
        noStores: 'No stores registered yet', noGrowth: 'No growth data yet',
        chartLabel: 'New Subscribers', last6months: '📈 Last 6 months',
        users: 'Stores & Users', th_store: 'Store / Owner', th_email: 'Email Address', th_type: 'Type',
        th_join: 'Date Joined', th_ip: 'Login IP', th_action: 'Actions',
        title_payments: 'Payment Methods', btn_addPay: 'Add Payment Method', th_details: 'Details',
        title_settings: 'General Settings', saveBtn: 'Save Changes',
        title_tickets: 'Support Tickets', th_subj: 'Subject', th_date: 'Date'
    }
};

function applyAdminLang() {
    document.documentElement.dir = adminDict[adminLang].dir;
    const btn = document.getElementById('adminLangBtn');
    if (btn) btn.textContent = adminDict[adminLang].langBtn;
    
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (adminDict[adminLang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = adminDict[adminLang][key];
            } else {
                el.innerHTML = adminDict[adminLang][key];
            }
        }
    });

    // Translate table headers (if not explicitly marked but matching inner text in Arabic)
    document.querySelectorAll('th').forEach(el => {
        const originalText = el.textContent.trim().replace(/\s+/g, ' ');
        if(adminLang === 'en') {
            for(let key in adminDict.ar) {
                if(adminDict.ar[key] === originalText && adminDict.en[key]) {
                    el.textContent = adminDict.en[key];
                    break;
                }
            }
        }
    });
}

window.toggleAdminLang = function() {
    adminLang = adminLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('sg_admin_lang', adminLang);
    applyAdminLang();
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', applyAdminLang);
