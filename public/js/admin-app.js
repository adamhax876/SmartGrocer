// admin-app.js - Global admin functionality
function toggleAdminSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar) {
        if (sidebar.classList.contains('hidden')) {
            sidebar.classList.remove('hidden');
            sidebar.classList.add('fixed', 'inset-y-0', 'right-0', 'z-50', 'w-64', 'flex');
            if (overlay) overlay.classList.add('active');
        } else {
            sidebar.classList.add('hidden');
            sidebar.classList.remove('fixed', 'inset-y-0', 'right-0', 'z-50', 'w-64', 'flex');
            if (overlay) overlay.classList.remove('active');
        }
    }
}

function initAdminMobile() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    if (!menuBtn) return;

    // Remove old listeners if any (by cloning)
    const newBtn = menuBtn.cloneNode(true);
    menuBtn.parentNode.replaceChild(newBtn, menuBtn);

    // Add common overlay if missing
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay'; // Reusing global.css overlay class
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:40; display:none; backdrop-filter:blur(2px);';
        overlay.onclick = toggleAdminSidebar;
        document.body.appendChild(overlay);
        
        // Add CSS to make it work with the .active class
        const style = document.createElement('style');
        style.innerText = '.sidebar-overlay.active { display:block !important; }';
        document.head.appendChild(style);
    }

    newBtn.addEventListener('click', toggleAdminSidebar);

    // Close sidebar on link click
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && !sidebar.classList.contains('hidden') && window.innerWidth < 768) {
                toggleAdminSidebar();
            }
        });
    });
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
}

document.addEventListener('DOMContentLoaded', initAdminMobile);
