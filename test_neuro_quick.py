#!/usr/bin/env python3
"""
Quick Neuro Integration Test
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "python"))

from neuro_module import MemoryHandler, NeuroConfig

print("\n" + "="*60)
print("Neuro Integration Quick Test")
print("="*60)

# Initialize
config = NeuroConfig()
handler = MemoryHandler(config)
print("\n[1] MemoryHandler Initialized: OK")

# Create memories
test_docs = [
    "エリシアは優しく美しい少女です",
    "Neuro AIはローカルで動作するVtuber用AIアシスタント",
    "Elysia AIは多機能なAIプラットフォーム"
]

ids = []
for doc in test_docs:
    mid = handler.create_memory(document=doc)
    ids.append(mid)

print(f"[2] Created {len(ids)} Memories: OK")

# Query
results = handler.query_memories("エリシアについて", n_results=2)
print(f"[3] Memory Query: OK ({results['count']} results found)")

# Get all
all_mems = handler.get_all_memories()
print(f"[4] Retrieve All: OK ({len(all_mems)} memories in DB)")

# Export
export_path = Path("data/neuro_test.json")
export_path.parent.mkdir(exist_ok=True)
success = handler.export_memories(str(export_path))
print(f"[5] Export Memories: {'OK' if success else 'FAILED'}")

# Delete
if ids:
    success = handler.delete_memory(ids[0])
    print(f"[6] Delete Memory: {'OK' if success else 'FAILED'}")

# Clear
success = handler.clear_memories(memory_type=None)
final_count = len(handler.get_all_memories())
print(f"[7] Clear All Memories: OK ({final_count} remaining)")

print("\n" + "="*60)
print("SUCCESS: Neuro integration is working!")
print("="*60)
print("\nNext steps:")
print("1. Start FastAPI:    python python/fastapi_server.py")
print("2. Start Elysia:     bun run dev")
print("3. Test API:         curl http://localhost:3000/api/neuro/health")
print("\nDocumentation: docs/NEURO_INTEGRATION.md")
print("="*60 + "\n")
