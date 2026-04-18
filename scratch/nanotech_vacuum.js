import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---

const TARGET_DIRECTORIES = [
  '__pycache__', '.mypy_cache', '.ruff_cache', '.pytest_cache', '.tsbuildinfo',
  'dist', 'target', 'out', 'build', 'playwright-report', 'test-results'
];

const TARGET_FILE_EXTENSIONS = [
  '.log', '.tmp', '.vmem', '.nvram', '.vmsd', '.vmxf', '.scoreboard'
];

const TARGET_FILE_PREFIXES = [
  'mksSandbox', 'vmware'
];

// Folders that are completely OFF-LIMITS for recursive deletion of their own name
// e.g. even if 'src' contained 'out', we don't delete 'src'.
const PROTECTED_PARENT_DIRS = ['src', 'packages', 'kernel', 'python', 'usr', 'lib'];

// Files that should NEVER be deleted
const PROTECTED_FILES = ['build.rs', 'build.ps1', 'build.ts', 'build.sh', 'Makefile', 'Dockerfile', 'Kbuild'];

const EXCLUDE_WALK = ['node_modules', '.git'];

// --- ENGINE ---

let totalFreed = 0;
let fileCount = 0;
const isSimulation = process.argv.includes('--sim');

function vacuum(dir, depth = 0) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        let stats;
        try {
            stats = fs.statSync(fullPath);
        } catch (e) { continue; }

        if (stats.isDirectory()) {
            if (EXCLUDE_WALK.includes(file)) continue;

            // Check if this directory should be purged
            // MUST be an EXACT match for security
            const isTargetDir = TARGET_DIRECTORIES.includes(file);
            const isProtected = PROTECTED_PARENT_DIRS.includes(file) && depth === 0;

            if (isTargetDir && !isProtected) {
                const size = getDirSize(fullPath);
                if (!isSimulation) {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                    console.log(`[PURGED DIR] ${fullPath} (${formatSize(size)})`);
                } else {
                    console.log(`[FOUND DIR]  ${fullPath} (${formatSize(size)})`);
                }
                totalFreed += size;
                fileCount++;
            } else {
                vacuum(fullPath, depth + 1);
            }
        } else {
            // Check if this file should be purged
            if (PROTECTED_FILES.includes(file)) continue;

            const shouldPurge = 
                TARGET_FILE_EXTENSIONS.some(ext => file.endsWith(ext)) ||
                TARGET_FILE_PREFIXES.some(pre => file.startsWith(pre));

            if (shouldPurge) {
                const size = stats.size;
                if (!isSimulation) {
                    fs.unlinkSync(fullPath);
                    console.log(`[PURGED]     ${fullPath} (${formatSize(size)})`);
                } else {
                    console.log(`[FOUND]      ${fullPath} (${formatSize(size)})`);
                }
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

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

console.log(`>>> ELYSIA.SYSTEM // NANOTECH VACUUM CORE v5.0 [${isSimulation ? 'SIMULATION' : 'ACTIVE'}] <<<`);
if (isSimulation) console.log('NOTE: Running in safety simulation mode. No files will be deleted.');
console.log('----------------------------------------------------');

vacuum('.');

console.log('====================================================');
console.log(`${isSimulation ? 'POTENTIAL SAVINGS' : 'SYSTEM LIGHTWEIGHTED'}: ${formatSize(totalFreed)}`);
console.log(`FILES/DIRS ${isSimulation ? 'DETECTED' : 'REMOVED'}: ${fileCount}`);
if (isSimulation) console.log('To execute for real, run with: node scratch/nanotech_vacuum.js');
