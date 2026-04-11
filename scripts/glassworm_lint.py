import os
import re
import sys


# U+E0100-E01EF (Variation Selectors Supplement)
# U+E0000-E007F (Tags)
# U+202A-202E (Bidi Overrides)
# U+200B-200F, U+FEFF (Zero width spaces / BOM)
INVISIBLE_PATTERN = re.compile(r"[\u200B-\u200F\uFEFF\u202A-\u202E\U000E0000-\U000E007F\U000E0100-\U000E01EF]")


def scan_file(file_path):
    issues = []
    try:
        with open(file_path, encoding="utf-8", errors="ignore") as f:
            for line_num, line in enumerate(f, 1):
                match = INVISIBLE_PATTERN.search(line)
                if match:
                    issues.append((line_num, line.strip()))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return issues


if __name__ == "__main__":
    print("🔍 Scanning for GlassWorm invisible characters...")
    found_issue = False

    # Files and directories to exclude from scan
    exclude_parts = {".git", "node_modules", "venv", "site-packages", "dist", "build", "__pycache__", ".pytest_cache"}

    for root, dirs, files in os.walk("."):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_parts]

        # Additional deep-check: if any part of the path is in exclude_parts, skip it
        path_parts = set(os.path.normpath(root).split(os.sep))
        if path_parts.intersection(exclude_parts):
            continue

        for file in files:
            if file.endswith((".py", ".ts", ".js", ".md", ".txt", ".yml", ".yaml", ".json")):
                path = os.path.join(root, file)
                issues = scan_file(path)
                if issues:
                    found_issue = True
                    print(f"❌ 🐛 GlassWorm Alert in {path}:")
                    for ln, _ in issues:
                        print(f"  Line {ln}: Found malicious invisible Unicode character!")

    if found_issue:
        print(
            "\n🛑 SECURITY FAILURE: Invisible characters detected. They might be used for malware injection or prompt hijacking."
        )
        sys.exit(1)
    else:
        print("\n✅ Clean: No GlassWorm-style invisible characters found in source code.")
        sys.exit(0)
