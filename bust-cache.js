const fs = require('fs');
const path = require('path');

const walk = (dir) => {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            const ts = Date.now();
            content = content.replace(/\/css\/global\.css(\?v=\d+)?/g, '/css/global.css?v=' + ts);
            content = content.replace(/\/js\/user-lang\.js(\?v=\d+)?/g, '/js/user-lang.js?v=' + ts);
            content = content.replace(/\/js\/app\.js(\?v=\d+)?/g, '/js/app.js?v=' + ts);
            content = content.replace(/\/js\/admin-lang\.js(\?v=\d+)?/g, '/js/admin-lang.js?v=' + ts);
            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated ' + file);
            }
        }
    });
};

walk('./public');
console.log('Cache busting complete!');
