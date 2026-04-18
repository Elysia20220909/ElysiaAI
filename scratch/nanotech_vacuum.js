import fs from 'fs';
import path from 'path';

const cleanupPatterns = [
  // Caches (Directory match)
  '__pycache__', '.mypy_cache', '.ruff_cache', '.pytest_cache', '.tsbuildinfo',
  // Build Artifacts (Directory match)
  'dist', 'target', 'out', 'build',
  // Logs & Temp (Extension match)
  '.log', '.tmp', 'playwright-report', 'test-results',
  // Infrastructure (Specific match)
  '.scoreboard', 'mksSandbox', 'vmware', '.vmem', '.nvram', '.vmsd', '.vmxf'
];

// Files that should NEVER be deleted even if they match a pattern
const protectedFiles = ['build.rs', 'build.ps1', 'build.ts', 'build.sh', 'Makefile', 'Dockerfile'];

const excludeDirs = ['node_modules', '.git'];

let totalFreed = 0;
let fileCount = 0;

function vacuum(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            if (excludeDirs.includes(file)) continue;
            
            if (cleanupPatterns.some(p => file.includes(p))) {
                const size = getDirSize(fullPath);
                fs.rmSync(fullPath, { recursive: true, force: true });
                console.log(`[REMOVED DIR] ${fullPath} (${Math.round(size / 1024 / 1024 * 100) / 100} MB)`);
                totalFreed += size;
                fileCount++;
            } else {
                vacuum(fullPath);
            }
        } else {
            if (protectedFiles.includes(file)) continue;
            
            if (cleanupPatterns.some(p => file.endsWith(p) || file.startsWith(p))) {
                const size = stats.size;
                fs.unlinkSync(fullPath);
                console.log(`[REMOVED] ${fullPath} (${Math.round(size / 1024 * 100) / 100} KB)`);
                totalFreed += size;
                fileCount++;
            }
        }
    }
  } catch (e) {}
}

function getDirSize(dir) {
    let size = 0;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stats = fs.statSync(fullPath);
            size += stats.isDirectory() ? getDirSize(fullPath) : stats.size;
        }
    } catch (e) {}
    return size;
}

console.log('>>> ELYSIA.SYSTEM // NANOTECH VACUUM CORE (JS ENGINE) <<<');
vacuum('.');
console.log('=========================================');
console.log(`SYSTEM LIGHTWEIGHTED: ${Math.round(totalFreed / 1024 / 1024 * 100) / 100} MB freed.`);
console.log(`FILES/DIRS REMOVED: ${fileCount}`);
