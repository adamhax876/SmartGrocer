// Centralized Localization for Admin Dashboard
let adminLang = localStorage.getItem('sg_admin_lang') || 'ar';
const adminDict = {
    ar: {
        // General Navigation
        langBtn: 'English', dir: 'rtl', overview: 'نظرة عامة',
        nav_dashboard: 'الرئيسية', nav_stores: 'المتاجر المشتركة', 
        nav_payments: 'طرق الدفع', nav_settings: 'إعدادات النظام', 
        nav_tickets: 'تذاكر الدعم', nav_logout: 'تسجيل خروج',
        
        // Status & Common
        statusActive: 'نشط', statusSuspended: 'موقوف',
        saveBtn: 'حفظ التعديلات', saveAllBtn: 'حفظ جميع التعديلات',
        cancelBtn: 'إلغاء', addBtn: 'إضافة طريقة جديدة',

        // Dashboard specific
        statStores: 'المتاجر النشطة', statSubs: 'الاشتراكات الفعالة', statTickets: 'تذاكر الدعم المفتوحة',
        chartTitle: 'نمو المشتركين', chartBadge: '📊 حسب الباقات النشطة',
        latest: 'أحدث المتاجر', viewAll: 'عرض الكل →', 
        noStores: 'لا توجد متاجر مسجلة بعد', noGrowth: 'لا توجد بيانات نمو بعد',
        chartLabel: 'مشتركين جدد', last6months: '📈 آخر 6 أشهر',
        
        // Stores specific
        usersTitle: 'المتاجر المشتركة', 
        btn_inviteSupport: 'دعوة فريق دعم', btn_sendAll: 'إرسال إشعار للجميع',
        search_placeholder: 'ابحث باسم المتجر...',
        th_store: 'المتجر / المالك', th_email: 'البريد الإلكتروني', th_type: 'النوع',
        th_join: 'تاريخ الانضمام', th_plan: 'الباقة وانتهاء الصلاحية', th_ip: 'IP الدخول', 
        th_status: 'الحالة', th_action: 'إجراءات',
        
        // Payments specific
        title_payments: 'إدارة طرق الدفع', btn_addPay: 'إضافة طريقة جديدة', 
        th_details: 'التفاصيل', no_payments: 'لا توجد طرق دفع مضافة. اضغط على أضف طريقة جديدة.',
        
        // Settings specific
        title_settings: 'إعدادات النظام العامة', 
        lbl_siteName: 'اسم المنصة (Site Name)', lbl_supportEmail: 'البريد الإلكتروني للدعم (Support Email)',
        lbl_currency: 'العملة الافتراضية للنظام (Currency)', lbl_maintenance: 'وضع الصيانة (Maintenance Mode)',
        lbl_maintenance_hint: 'سوف يمنع المتاجر من تسجيل الدخول لحين إيقافه.',
        
        // Tickets specific
        title_tickets: 'تذاكر الدعم', th_subj: 'الموضوع', th_date: 'التاريخ',
        tk_conversations: 'المحادثات', tk_all: 'الكل', tk_open: 'تنتظر الرد', tk_answered: 'مجابة',
        tk_no_chats: 'لا توجد محادثات', tk_select: 'اختر محادثة', tk_reply_hint: 'للرد على العميل',
        tk_placeholder: 'اكتب ردك هنا...'
    },
    en: {
        // General Navigation
        langBtn: 'عربي', dir: 'ltr', overview: 'Overview',
        nav_dashboard: 'Dashboard', nav_stores: 'Stores', 
        nav_payments: 'Payments', nav_settings: 'Settings', 
        nav_tickets: 'Support Tickets', nav_logout: 'Logout',
        
        // Status & Common
        statusActive: 'Active', statusSuspended: 'Suspended',
        saveBtn: 'Save Changes', saveAllBtn: 'Save All Changes',
        cancelBtn: 'Cancel', addBtn: 'Add New Method',

        // Dashboard specific
        statStores: 'Active Stores', statSubs: 'Active Subscriptions', statTickets: 'Open Support Tickets',
        chartTitle: 'Subscriber Growth', chartBadge: '📊 Active Plans',
        latest: 'Latest Stores', viewAll: 'View All →', 
        noStores: 'No stores registered yet', noGrowth: 'No growth data yet',
        chartLabel: 'New Subscribers', last6months: '📈 Last 6 months',
        
        // Stores specific
        usersTitle: 'Stores', 
        btn_inviteSupport: 'Invite Support', btn_sendAll: 'Send Push Notification',
        search_placeholder: 'Search by store name...',
        th_store: 'Store / Owner', th_email: 'Email', th_type: 'Type',
        th_join: 'Joined At', th_plan: 'Plan & Expiry', th_ip: 'Login IP', 
        th_status: 'Status', th_action: 'Actions',
        
        // Payments specific
        title_payments: 'Payment Methods', btn_addPay: 'Add New Method', 
        th_details: 'Details', no_payments: 'No payment methods added. Click Add New Method.',
        
        // Settings specific
        title_settings: 'General Settings', 
        lbl_siteName: 'Site Name', lbl_supportEmail: 'Support Email',
        lbl_currency: 'System Currency', lbl_maintenance: 'Maintenance Mode',
        lbl_maintenance_hint: 'Prevents stores from logging in until disabled.',
        
        // Tickets specific
        title_tickets: 'Support Tickets', th_subj: 'Subject', th_date: 'Date',
        tk_conversations: 'Conversations', tk_all: 'All', tk_open: 'Pending', tk_answered: 'Answered',
        tk_no_chats: 'No Conversations', tk_select: 'Select Chat', tk_reply_hint: 'To reply to customer',
        tk_placeholder: 'Type your reply here...'
    }
};

function applyAdminLang() {
    document.documentElement.dir = adminDict[adminLang].dir;
    document.documentElement.lang = adminLang;
    
    const btn = document.getElementById('adminLangBtn');
    if (btn) btn.textContent = adminDict[adminLang].langBtn;
    
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (adminDict[adminLang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = adminDict[adminLang][key];
            } else {
                el.innerHTML = adminDict[adminLang][key]; // changed to innerHTML to preserve spans or icons
            }
        }
    });

    // Fix alignment for specific elements that switch on language
    if (adminLang === 'en') {
        document.querySelectorAll('.text-right').forEach(el => {
            el.classList.remove('text-right');
            el.classList.add('text-left');
        });
    } else {
        document.querySelectorAll('.text-left').forEach(el => {
            el.classList.remove('text-left');
            el.classList.add('text-right');
        });
    }
}

window.toggleAdminLang = function() {
    adminLang = adminLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('sg_admin_lang', adminLang);
    applyAdminLang();
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    applyAdminLang();
    
    // Global Mobile Menu Logic
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    if (mobileBtn && sidebar) {
        // Create overlay for admin
        let adminOverlay = document.getElementById('adminMobileOverlay');
        if (!adminOverlay) {
            adminOverlay = document.createElement('div');
            adminOverlay.id = 'adminMobileOverlay';
            adminOverlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:39;';
            adminOverlay.addEventListener('click', () => {
                sidebar.classList.add('hidden');
                sidebar.classList.remove('absolute', 'z-40', 'h-full', 'w-64', 'flex', 'flex-col');
                adminOverlay.style.display = 'none';
            });
            document.body.appendChild(adminOverlay);
        }

        mobileBtn.addEventListener('click', () => {
            if (sidebar.classList.contains('hidden')) {
                sidebar.classList.remove('hidden');
                sidebar.classList.add('absolute', 'z-40', 'h-full', 'w-64', 'flex', 'flex-col');
                adminOverlay.style.display = 'block';
            } else {
                sidebar.classList.add('hidden');
                sidebar.classList.remove('absolute', 'z-40', 'h-full', 'w-64', 'flex', 'flex-col');
                adminOverlay.style.display = 'none';
            }
        });
    }

    // Active Sidebar Link Logic
    const currentPage = window.location.pathname.split('/').pop().split('.')[0];
    const activeLinks = document.querySelectorAll(`[data-page="${currentPage}"]`);
    activeLinks.forEach(link => {
        link.classList.remove('text-gray-300', 'hover:bg-gray-800', 'hover:text-white');
        link.classList.add('bg-blue-600', 'text-white');
    });
});
