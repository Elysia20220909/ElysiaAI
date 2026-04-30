import sys
import os
from pathlib import Path

# Force UTF-8 for IO in Windows environments
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stdin.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        # Python < 3.7 doesn't have reconfigure
        pass

targets = [
    "*.md", "*.txt", "*.json", "*.yml", "*.yaml",
    "*.ts", "*.js", "*.py", "*.rs", "*.sh"
]

failed = []

# Exclude directories from check
exclude_dirs = {".git", "node_modules", ".venv", "dist", "kernel", "etc", "var", "usr"}

for pattern in targets:
    for path in Path(".").rglob(pattern):
        # Check if any part of the path is in exclude_dirs
        if any(part in exclude_dirs for part in path.parts):
            continue
            
        try:
            # Try reading the file as UTF-8
            path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            failed.append(str(path))
        except Exception as e:
            # Ignore other errors like permission issues for this check
            pass

if failed:
    print("❌ UTF-8で読めないファイルが見つかりました (Potential Mojibake):")
    for f in failed:
        print(f"  - {f}")
    sys.exit(1)

print("✅ Success: All targeted text files are valid UTF-8.")
sys.exit(0)
