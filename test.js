// replaceChips.js
const fs = require('fs');
const path = require('path');

// Directory to start from (current folder)
const baseDir = path.resolve(__dirname);

// File extensions to scan (you can add more if needed)
const fileExtensions = ['.js', '.ejs', '.html', '.css', '.ts', '.json'];

function replaceInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('balance')) {
        const updated = content.replace(/\bchips\b/g, 'balance'); // replace whole word only
        fs.writeFileSync(filePath, updated, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walkDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            walkDir(fullPath);
        } else if (fileExtensions.includes(path.extname(fullPath))) {
            replaceInFile(fullPath);
        }
    });
}

walkDir(baseDir);
console.log('All occurrences of "balance" have been replaced with "balance".');
