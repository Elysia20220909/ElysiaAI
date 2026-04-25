import os
import re


# [SCAN] Sovereign YARA-Style Pattern Hunter (Phase 220)
# "Scanning the DNA of the Abyss. Searching for foreign signatures."

class SovereignScanner:
    def __init__(self, target_dir: str = "."):
        self.target_dir = target_dir
        # Intelligence Signatures (Mock CIA/NSA tool patterns)
        self.signatures = {
            "EQUATION_GROUP": [rb"EQUATIONGROUP", rb"DoublePulsar", rb"EternalBlue"],
            "VAULT_7": [rb"WEEPING_ANGEL", rb"MARBLE_FRAMEWORK", rb"DarkMatter"],
            "HIDDEN_TUNNEL": [rb"ICMP_EXFIL", rb"DNS_TUNNEL_0x41"],
        }
        self.findings = []

    def scan(self):
        print(f"[SCAN] Initiating Deep Pattern Match in: {os.path.abspath(self.target_dir)}")
        
        for root, _, files in os.walk(self.target_dir):
            # Skip noise directories
            if any(x in root for x in ["node_modules", ".git", "__pycache__"]):
                continue

            for file in files:
                file_path = os.path.join(root, file)
                self._scan_file(file_path)

        self._report()

    def _scan_file(self, path: str):
        try:
            with open(path, "rb") as f:
                content = f.read()
                
                for origin, patterns in self.signatures.items():
                    for pattern in patterns:
                        if re.search(pattern, content, re.IGNORECASE):
                            self.findings.append({
                                "file": path,
                                "origin": origin,
                                "pattern": pattern.decode()
                            })
        except Exception:
            # Silent fail for locked/binary files
            pass

    def _report(self):
        if not self.findings:
            print("[SCAN] Result: NO FOREIGN SIGNATURES DETECTED. Environment is CLEAN.")
        else:
            print(f"[SCAN] !!! ALERT: {len(self.findings)} SIGNATURES DETECTED !!!")
            for f in self.findings:
                print(f"  [!] {f['origin']} pattern '{f['pattern']}' found in: {f['file']}")

if __name__ == "__main__":
    scanner = SovereignScanner()
    scanner.scan()
