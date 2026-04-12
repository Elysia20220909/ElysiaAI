import os
import sys


# Ensure python directory is in path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from python.lib.guardian import guardian


def verify_prompts():
    prompt_dir = "prompts"
    if not os.path.exists(prompt_dir):
        print(f"⚠️ Prompt directory {prompt_dir} not found.")
        return

    errors = 0
    for filename in os.listdir(prompt_dir):
        if filename.endswith(".txt"):
            path = os.path.join(prompt_dir, filename)
            with open(path, encoding="utf-8") as f:
                content = f.read()
                try:
                    guardian.validate_chat_input(content)
                    print(f"✅ {filename}: Passed Guardian validation.")
                except Exception as e:
                    print(f"❌ {filename}: Failed validation - {e}")
                    errors += 1

    if errors > 0:
        print(f"\n🛑 Total Prompt Errors: {errors}")
        sys.exit(1)
    else:
        print("\n✨ All prompts are secure and within limits.")


if __name__ == "__main__":
    verify_prompts()
