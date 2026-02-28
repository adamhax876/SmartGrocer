const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

console.log('🔄 جاري بدء إنشاء النسخة الاحتياطية (Backup)...');

try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `SmartGrocer_Backup_${timestamp}.zip`;
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const backupPath = path.join(desktopPath, backupName);

    // Command to zip everything except node_modules, .git, and .env (optional if tracking env safely)
    // Using Windows standard tar command which is available in Windows 10+
    const command = `tar -a -c -f "${backupPath}" --exclude=node_modules --exclude=.git .`;

    console.log('📦 جاري ضغط الملفات، يرجى الانتظار...');
    execSync(command, { stdio: 'inherit' });

    console.log(`\n✅ تمت عملية النسخ الاحتياطي بنجاح!`);
    console.log(`📁 ستجد الملف على سطح المكتب باسم: ${backupName}`);
} catch (error) {
    console.error('\n❌ حدث خطأ أثناء النسخ الاحتياطي:', error.message);
    console.log('💡 تنبيه: تأكد من أن جهازك يدعم صيغة الضغط الأساسية (tar) ومسار سطح المكتب متاح.');
}
