const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'public');
const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.html'));

const logoRegex = /<img src="\/images\/logo\.png"\s+style="height: 110[a-zA-Z\s0-px:;\%-]*?"\s*(alt="Logo">|\n\s*alt="Logo">)/g;
const replacementLogo = '<img src="/images/logo.png" style="width: 100%; max-height: 100px; object-fit: contain;" alt="Logo">';

const sidebarTextRegex = /<div class="sidebar-logo-text">SmartGrocer<\/div>/g;

files.forEach(file => {
    const filePath = path.join(targetDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Replace logo style
    if (logoRegex.test(content)) {
        content = content.replace(logoRegex, replacementLogo);
        changed = true;
    }

    // Remove sidebar text
    if (sidebarTextRegex.test(content)) {
        content = content.replace(sidebarTextRegex, '');
        changed = true;
    }

    // Custom fix for index.html text next to brand
    if (file === 'index.html') {
        content = content.replace(/alt="Logo">\s*SmartGrocer\s*<\/div>/g, 'alt="Logo">\n    </div>');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
});
