const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname); // Root of your project
let totalWords = 0;
let totalLetters = 0;

function countWordsAndLetters(content) {
    const words = content.match(/\b\w+\b/g);
    const letters = content.replace(/\s/g, '').length;
    return {
        words: words ? words.length : 0,
        letters
    };
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (file === 'node_modules') continue; // skip node_modules

        const fullPath = path.join(dir, file);
        let stats;
        try {
            stats = fs.lstatSync(fullPath); // lstat to handle symlinks
        } catch {
            continue; // skip files that can't be read
        }

        if (stats.isSymbolicLink()) {
            continue; // skip symlinks
        } else if (stats.isDirectory()) {
            walkDir(fullPath);
        } else if (stats.isFile()) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const { words, letters } = countWordsAndLetters(content);
                totalWords += words;
                totalLetters += letters;
            } catch {
                // skip binary or unreadable files
            }
        }
    }
}

walkDir(ROOT_DIR);

console.log('Total Words:', totalWords);
console.log('Total Letters (excluding spaces):', totalLetters);
