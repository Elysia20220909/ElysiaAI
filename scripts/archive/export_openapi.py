import json
import os
import sys


# Setup environment
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from usr.lib.elysia.kernel import app


def export_openapi():
    """Exports the FastAPI app OpenAPI schema to a static JSON file."""
    openapi_schema = app.openapi()

    docs_dir = os.path.join(PROJECT_ROOT, "docs")
    os.makedirs(docs_dir, exist_ok=True)

    target_path = os.path.join(docs_dir, "openapi.json")

    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)

    print(f"✅ API Schema exported to: {target_path}")


if __name__ == "__main__":
    export_openapi()
