// replaceTakaToDollar.js
const fs = require('fs');
const path = require('path');

// Directory to start from (current folder)
const baseDir = path.resolve(__dirname);

// File extensions to scan
const fileExtensions = ['.js', '.ejs', '.html', '.css', '.ts', '.json'];

function replaceInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('USD')) {
        const updated = content.replace(/USD/g, 'USD'); // replace all instances of $ with $
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
console.log('All occurrences of "$" have been replaced with "$".');
