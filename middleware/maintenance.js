const { getSettings } = require('../utils/settings');

module.exports = async function (req, res, next) {
    const settings = await getSettings();

    // If not in maintenance mode, proceed
    if (!settings.maintenance_mode) return next();

    // Allow Admin API and Auth APIs
    if (req.path.startsWith('/api/admin') ||
        req.path === '/api/auth/login' ||
        req.path === '/api/auth/reset-password' ||
        req.path === '/api/auth/forgot-password') {
        return next();
    }

    // Allow internal admin panel requests
    if (req.path.startsWith('/admin/') || req.path === '/login.html') {
        return next();
    }

    // Allow static assets (css, js, images)
    if (req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.endsWith('.png') || req.path.endsWith('.svg')) {
        return next();
    }

    // If it's an API request not allowed above, block it
    if (req.path.startsWith('/api/')) {
        return res.status(503).json({ success: false, message: 'النظام حالياً في وضع الصيانة للتطوير. سيتم إعادته للعمل قريباً.', maintenance: true });
    }

    // For any other HTML page, send custom maintenance block page
    res.status(503).send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>النظام في وضع الصيانة</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                h1 { color: #f59e0b; margin-bottom: 10px; font-size: 2.5rem; }
                p { color: #cbd5e1; font-size: 1.2rem; max-width: 600px; line-height: 1.6; }
                .icon { font-size: 4rem; margin-bottom: 20px; color: #3b82f6; }
            </style>
        </head>
        <body>
            <div class="icon">🚧</div>
            <h1>تحديث النظام</h1>
            <p>نعمل حالياً على إجراء بعض التحديثات والتحسينات المهمة لتجربتكم. سيرجع النظام للعمل قريباً جداً، نعتذر عن الإزعاج!</p>
        </body>
        </html>
    `);
};
