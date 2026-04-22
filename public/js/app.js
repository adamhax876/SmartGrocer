// =============================================
// SmartGrocer - Theme & Language Manager
// =============================================

// Theme Management
function getTheme() {
    return localStorage.getItem('sg_theme') || 'light';
}

function setTheme(theme) {
    localStorage.setItem('sg_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const current = getTheme();
    setTheme(current === 'light' ? 'dark' : 'light');
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Language Management
function getLang() {
    return localStorage.getItem('sg_lang') || 'ar';
}

function setLang(lang) {
    localStorage.setItem('sg_lang', lang);
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.remove('rtl', 'ltr');
    document.body.classList.add(lang === 'ar' ? 'rtl' : 'ltr');

    // Update button states
    document.querySelectorAll('.lang-switch button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

// Auth helpers
function getToken() { return localStorage.getItem('sg_token'); }
function setToken(token) { localStorage.setItem('sg_token', token); }
function removeToken() { localStorage.removeItem('sg_token'); }
function getUser() {
    const u = localStorage.getItem('sg_user');
    return u ? JSON.parse(u) : null;
}
function setUser(user) { localStorage.setItem('sg_user', JSON.stringify(user)); }
function removeUser() { localStorage.removeItem('sg_user'); }

// Sidebar Toggle for Mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

// Auto-inject mobile hamburger button + overlay on every page
function initMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const topbar = document.querySelector('.topbar');
    if (!sidebar || !topbar) return;

    // 1. Inject hamburger button at the start of topbar (if not already there)
    if (!topbar.querySelector('.mobile-menu-btn')) {
        const hamburger = document.createElement('button');
        hamburger.className = 'mobile-menu-btn';
        hamburger.setAttribute('aria-label', 'Menu');
        hamburger.innerHTML = '☰';
        hamburger.onclick = toggleSidebar;
        topbar.insertBefore(hamburger, topbar.firstChild);
    }

    // 2. Inject dark overlay behind sidebar (if not already there)
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = toggleSidebar;
        document.body.appendChild(overlay);
    }

    // 3. Close sidebar when clicking any sidebar link (navigate away)
    sidebar.querySelectorAll('a.sidebar-link, .sidebar-bottom a, .sidebar-bottom button').forEach(link => {
        link.addEventListener('click', () => {
            sidebar.classList.remove('open');
            const ov = document.querySelector('.sidebar-overlay');
            if (ov) ov.classList.remove('active');
        });
    });
}

function logout() {
    removeToken(); removeUser();
    window.location.href = '/login.html';
}

function requireAuth() {
    if (!getToken()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// API helper
async function api(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(url, { ...options, headers });
    const data = await resp.json();

    if (resp.status === 401 || resp.status === 403) {
        if (data.isLocked) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: 'غير مسموح 🔒', text: data.message });
            } else {
                alert(data.message);
            }
            throw new Error(data.message);
        }
        if (data.isSuspended) {
            alert('تم إيقاف حسابك من قبل الإدارة. يرجى التواصل مع الدعم.');
        }
        logout();
        return null;
    }

    if (!resp.ok) throw new Error(data.message || 'Something went wrong');
    return data;
}

// Toast notifications
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    setTheme(getTheme());
    // Apply saved language
    setLang(getLang());

    // Auto-inject mobile sidebar hamburger + overlay
    initMobileSidebar();

    // Fetch and apply public settings (Currency, Site Name)
    fetchPublicSettings();

    // Init real-time push notifications
    if (getToken()) {
        initRealtimeNotifications();
    }
});

window.CURRENCY = localStorage.getItem('sg_currency') || '$';

async function fetchPublicSettings() {
    try {
        const res = await fetch('/api/settings/public');
        const data = await res.json();
        if (data.success) {
            window.CURRENCY = data.currency || '$';
            localStorage.setItem('sg_currency', window.CURRENCY);

            // Dispatch event for components that need to re-render Reactively
            window.dispatchEvent(new CustomEvent('settingsLoaded', { detail: data }));

            // Auto update all elements with data-currency attribute
            document.querySelectorAll('.app-currency').forEach(el => el.textContent = window.CURRENCY);
            if (data.siteName) {
                document.querySelectorAll('.app-site-name').forEach(el => el.textContent = data.siteName);
            }
        }
    } catch (e) {
        console.warn('Could not load public settings', e);
    }
}

function formatMoney(amount) {
    return `<span class="app-currency">${window.CURRENCY}</span>${Number(amount).toFixed(2)}`;
}

// ----------------------------------------------------
// Notifications System
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const topbarActions = document.querySelector('.topbar-actions');
    if (topbarActions && getToken()) {
        const notifHtml = `
            <div style="position: relative; margin-right: 1rem;">
                <button onclick="toggleNotifications()" class="btn btn-outline" style="border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; padding: 0; position: relative;" id="notif-btn">
                    <span>🔔</span>
                    <span id="notif-badge" style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border-radius: 50%; padding: 2px 6px; font-size: 0.7rem; display: none;">0</span>
                </button>
                <div id="notif-dropdown" style="display: none; position: absolute; top: 100%; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); width: 320px; max-height: 400px; overflow-y: auto; box-shadow: var(--shadow-md); z-index: 1000; padding: 1rem; margin-top: 10px;">
                    <h4 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; color: var(--text);">رسائل الإدارة 🔔</h4>
                    <div id="notif-list" style="display: flex; flex-direction: column; gap: 0.8rem;">
                        <div style="text-align: center; color: var(--text-secondary); padding: 1rem; font-size: 0.9rem;">جاري التحميل...</div>
                    </div>
                </div>
            </div>
        `;
        // Insert at the beginning of topbar actions
        topbarActions.insertAdjacentHTML('afterbegin', notifHtml);
        fetchNotifications();
    }
});

function toggleNotifications() {
    const dropdown = document.getElementById('notif-dropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

async function fetchNotifications() {
    try {
        const res = await api('/api/messages');
        const list = document.getElementById('notif-list');
        const badge = document.getElementById('notif-badge');

        if (!res.data || res.data.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 1rem; font-size: 0.9rem;">لا توجد رسائل حالياً</div>`;
            return;
        }

        // Get user ID from JWT payload
        const token = getToken();
        let userId = null;
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.id;
        }

        let unreadCount = 0;
        list.innerHTML = res.data.map(msg => {
            const isRead = userId && msg.readBy && msg.readBy.includes(userId);
            if (!isRead) unreadCount++;

            return `
                <div style="padding: 0.8rem; border-radius: 8px; background: ${isRead ? 'var(--bg-secondary)' : 'var(--primary-light)'}; border-right: 4px solid ${isRead ? 'transparent' : 'var(--primary)'};" onclick="markNotifRead('${msg._id}', this)">
                    <h5 style="margin-bottom: 0.3rem; color: var(--text); font-size: 0.95rem;">${msg.title}</h5>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: ${msg.image ? '0.5rem' : '0'}; line-height: 1.4;">${msg.content}</p>
                    ${msg.image ? `<img src="${msg.image}" style="width: 100%; border-radius: 8px; margin-top: 5px;" alt="Attachment">` : ''}
                    <small style="display: block; margin-top: 0.5rem; color: gray; font-size: 0.7rem;">${new Date(msg.createdAt).toLocaleString('ar-EG')}</small>
                </div>
            `;
        }).join('');

        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    } catch (e) {
        console.error('Failed to load notifications', e);
    }
}

async function markNotifRead(id, element) {
    element.style.background = 'var(--bg-secondary)';
    element.style.borderRight = '4px solid transparent';

    const badge = document.getElementById('notif-badge');
    let count = parseInt(badge.textContent);
    if (count > 0) {
        count--;
        badge.textContent = count;
        if (count === 0) badge.style.display = 'none';
    }

    try {
        await api(`/api/messages/${id}/read`, { method: 'PATCH' });
    } catch (e) {
        console.error('Failed to mark read', e);
    }
}

// ----------------------------------------------------
// Realtime Notifications SSE
// ----------------------------------------------------
function initRealtimeNotifications() {
    const token = getToken();
    if (!token) return;

    // Use SSE (Server-Sent Events) for real-time pushing without WebSockets overhead
    const evtSource = new EventSource(`/api/sse?token=${token}`);

    evtSource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;

        // Display modal popup immediately
        showRealtimePopup(data);

        // Refresh the notifications dropdown & bell badge seamlessly
        if (typeof fetchNotifications === 'function') {
            fetchNotifications();
        }
    };

    evtSource.onerror = function () {
        console.warn('Real-time connection interrupted. Reconnecting automatically...');
    };
}

function showRealtimePopup(msg) {
    let modal = document.getElementById('rt-notif-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'rt-notif-modal';
        modal.className = 'fade-in';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';

        modal.innerHTML = `
            <div style="background:var(--bg-card);color:var(--text);width:90%;max-width:450px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.3);overflow:hidden;position:relative;animation:popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <button onclick="document.getElementById('rt-notif-modal').style.display='none'" style="position:absolute;top:15px;inset-inline-end:15px;background:none;border:none;font-size:1.5rem;color:var(--text-secondary);cursor:pointer;transition:color 0.2s;" onmouseover="this.style.color='var(--error)'" onmouseout="this.style.color='var(--text-secondary)'">&times;</button>
                <div style="padding:20px;background:var(--primary);color:white;font-weight:bold;display:flex;align-items:center;gap:12px;">
                    <span style="font-size:1.8rem;">📣</span>
                    <div>
                        <div style="font-size:0.8rem;opacity:0.9;font-weight:normal;margin-bottom:2px;">رسالة نظام جديدة</div>
                        <div id="rt-title" style="font-size:1.2rem;line-height:1.2;"></div>
                    </div>
                </div>
                <div style="padding:25px;">
                    <p id="rt-content" style="margin-bottom:20px;line-height:1.6;font-size:1rem;color:var(--text);white-space:pre-wrap;"></p>
                    <div id="rt-image-container" style="display:none;margin-bottom:20px;">
                        <img id="rt-image" src="" style="width:100%;border-radius:8px;border:1px solid var(--border);" alt="Attachment">
                    </div>
                    <button onclick="document.getElementById('rt-notif-modal').style.display='none'; if(typeof toggleNotifications==='function'){toggleNotifications()}" class="btn btn-primary" style="width:100%;font-size:1rem;padding:0.8rem;">
                        <i class="fas fa-check"></i> حسناً، فهمت
                    </button>
                </div>
            </div>
            <style>
                @keyframes popIn { 0% { transform:scale(0.8); opacity:0; } 100% { transform:scale(1); opacity:1; } }
            </style>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('rt-title').textContent = msg.title || 'رسالة جديدة';
    document.getElementById('rt-content').textContent = msg.content || '';

    const imgContainer = document.getElementById('rt-image-container');
    if (msg.image) {
        document.getElementById('rt-image').src = msg.image;
        imgContainer.style.display = 'block';
    } else {
        imgContainer.style.display = 'none';
    }

    modal.style.display = 'flex';
}

// Global UI hook for Support Ticket Notifications
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.startsWith('/admin')) return; // Skip for admins
    if (getToken()) {
        const supportLinks = document.querySelectorAll('a[href="/support.html"]');
        supportLinks.forEach(link => {
            if (!link.querySelector('.support-badge')) {
                const badge = document.createElement('span');
                badge.className = 'support-badge';
                badge.style.cssText = 'background: #ef4444; color: white; border-radius: 50px; padding: 2px 8px; font-size: 0.75rem; font-weight: bold; margin-inline-start: auto; display: none; margin-right: auto;'; // fallback flex spacing
                link.appendChild(badge);
            }
        });
        checkUnreadTickets();
        setInterval(checkUnreadTickets, 15000);
    }
});

async function checkUnreadTickets() {
    try {
        const data = await api('/api/support/unread');
        if (data && data.count !== undefined) {
            document.querySelectorAll('.support-badge').forEach(b => {
                b.textContent = data.count > 99 ? '99+' : data.count;
                b.style.display = data.count > 0 ? 'inline-block' : 'none';
            });
        }
    } catch (e) { }
}
