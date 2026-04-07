#!/usr/bin/env python3
"""
Elysia OS - Pre-flight Diagnostic Tool (v1.0.0)
Validates the environment for Windows, MacOS, and Ubuntu. 🌸
"""
import sys
import os
import shutil
import subprocess
import socket
import json

def print_result(check_name, status, message=""):
    color = "\033[92m[OK]\033[0m" if status else "\033[91m[FAIL]\033[0m"
    print(f"{color} {check_name}: {message}")

def check_service(host, port, name):
    try:
        with socket.create_connection((host, port), timeout=1):
            print_result(name, True, f"Running on {host}:{port}")
            return True
    except:
        print_result(name, False, f"Not reachable on {host}:{port}")
        return False

def validate_environment():
    print("--- Elysia OS Diagnostic Report ---")
    all_ok = True

    # 1. Python Check
    py_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    print_result("Python", True, f"v{py_ver}")

    # 2. Dependencies Check
    try:
        import fastapi, httpx, psutil, pydantic_settings, rich
        print_result("Library Dependencies", True, "All core libraries verified")
    except ImportError as e:
        print_result("Library Dependencies", False, f"Missing: {e}")
        all_ok = False

    # 3. Bun Check
    bun_path = shutil.which("bun")
    if bun_path:
        print_result("Bun Runtime", True, bun_path)
    else:
        print_result("Bun Runtime", False, "Not found in PATH")
        all_ok = False

    # 4. Ollama Check
    ollama_ok = check_service("127.0.0.1", 11434, "Ollama API")
    if not ollama_ok:
        print("\033[93m[TIP]\033[0m Run 'ollama serve' to start the AI engine.")
        all_ok = False

    # 5. VOICEVOX Check
    voicevox_ok = check_service("127.0.0.1", 50021, "VOICEVOX API")
    if not voicevox_ok:
        print("\033[93m[TIP]\033[0m Start VOICEVOX to enable the AI's soul (voice).")
        # all_ok = False # Non-critical if user doesn't need voice

    print("----------------------------------")
    if all_ok:
        print("\033[96mElysia OS is ready for resonance. ฅ(՞៸៸> ᗜ <៸៸՞)ฅ\033[0m")
    else:
        print("\033[91mInitialization blocked due to missing components.\033[0m")
    
    return all_ok

if __name__ == "__main__":
    if not validate_environment():
        sys.exit(1)
