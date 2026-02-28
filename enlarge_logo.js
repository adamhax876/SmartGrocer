const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'public');
const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.html'));

const regex = /<img src="\/images\/logo\.png"\s+style="[^"]+"[^>]*>/g;
const replacement = '<img src="/images/logo.png" style="height: 85px; width: auto; max-width: 220px; object-fit: contain; margin: -10px 0;" alt="Logo">';

files.forEach(file => {
    const filePath = path.join(targetDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (regex.test(content)) {
        content = content.replace(regex, replacement);
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
});
