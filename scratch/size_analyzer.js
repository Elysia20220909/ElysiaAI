import fs from 'fs';
import path from 'path';

function getDirSize(dir) {
    let totalSize = 0;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const name = path.join(dir, file);
            const stats = fs.statSync(name);
            if (stats.isDirectory()) {
                totalSize += getDirSize(name);
            } else {
                totalSize += stats.size;
            }
        }
    } catch (e) {}
    return totalSize;
}

const ignoredDirs = ['node_modules', '.git'];
const dirs = fs.readdirSync('.').filter(f => fs.statSync(f).isDirectory() && !ignoredDirs.includes(f));
const results = dirs.map(d => ({
    name: d,
    sizeMB: Math.round(getDirSize(d) / (1024 * 1024) * 100) / 100
})).sort((a, b) => b.sizeMB - a.sizeMB);

console.log(JSON.stringify(results, null, 2));
