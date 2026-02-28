const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'public');
const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.html'));

const regex = /<svg viewBox="0 0 24 24" width="38" height="38"[\s\S]*?<\/svg>/g;
const replacement = '<img src="/images/logo.png" style="width: 38px; height: 38px; border-radius: 10px;" alt="Logo">';

files.forEach(file => {
    const filePath = path.join(targetDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (regex.test(content)) {
        content = content.replace(regex, replacement);
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
});
