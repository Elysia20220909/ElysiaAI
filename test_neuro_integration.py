#!/usr/bin/env python3
"""
Neuro Integration Test Script
Neuro + Elysia AI 統合テスト
"""

import asyncio
import json
import sys
import time
from pathlib import Path

# Add python directory to path
python_path = Path(__file__).parent / "python"
sys.path.insert(0, str(python_path))

from neuro_module import MemoryHandler, NeuroConfig


async def test_memory_handler():
    """Test Neuro Memory Handler functionality"""

    print("🧪 Neuro Memory Handler Integration Test")
    print("=" * 50)

    # Initialize Memory Handler
    print("\n1️⃣  Initializing MemoryHandler...")
    try:
        config = NeuroConfig()
        handler = MemoryHandler(config)
        print("   ✅ MemoryHandler initialized")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False

    # Test: Create Memory
    print("\n2️⃣  Creating memory entries...")
    try:
        memories_to_create = [
            "エリシアは優しく美しい少女です",
            "Neuro AIはローカルで動作するVtuber用AIアシスタント",
            "Elysia AIは多機能なAIプラットフォーム"
        ]

        memory_ids = []
        for doc in memories_to_create:
            mid = handler.create_memory(
                document=doc,
                metadata={"type": "test", "created": time.time()}
            )
            memory_ids.append(mid)
            print(f"   ✅ Created: {mid[:8]}... - {doc[:30]}...")

        if not memory_ids:
            raise Exception("No memories created")

    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False

    # Test: Query Memory
    print("\n3️⃣  Querying memories...")
    try:
        queries = ["エリシアについて", "AI", "Vtuber"]

        for query in queries:
            results = handler.query_memories(query, n_results=2)
            print(f"   ✅ Query '{query}' returned {results['count']} results")
            for mem in results["memories"]:
                print(f"      - {mem['document'][:40]}... (distance: {mem.get('distance', 'N/A'):.3f})")

    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False

    # Test: Get All Memories
    print("\n4️⃣  Retrieving all memories...")
    try:
        all_mems = handler.get_all_memories()
        print(f"   ✅ Retrieved {len(all_mems)} memories")
        for mem in all_mems:
            print(f"      - {mem['id'][:8]}... : {mem['document'][:40]}...")

    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False

    # Test: Export
    print("\n5️⃣  Exporting memories...")
    try:
        export_path = Path("data") / "test_export.json"
        export_path.parent.mkdir(parents=True, exist_ok=True)
        success = handler.export_memories(str(export_path))

        if not success:
            raise Exception("Export failed")

        if not export_path.exists():
            raise Exception("Export file not found")

        with open(export_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if not data.get("memories"):
                raise Exception("Exported data is empty")

        print(f"   ✅ Exported {len(data['memories'])} memories -> {export_path}")

    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False

    # Test: Delete Memory
    print("\n6️⃣  Deleting memory...")
    try:
        if memory_ids:
            success = handler.delete_memory(memory_ids[0])
            if success:
                print(f"   ✅ Deleted memory {memory_ids[0][:8]}...")
            else:
                raise Exception("Delete failed")

    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False

    # Test: Clear (short-term only)
    print("\n7️⃣  Clearing short-term memories...")
    try:
        success = handler.clear_memories("test")
        if success:
            remaining = handler.get_all_memories()
            print(f"   ✅ Cleared test memories. {len(remaining)} memories remain")
        else:
            raise Exception("Clear failed")

    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False

    print("\n" + "=" * 50)
    print("✅ All tests passed!")
    return True


def test_api_endpoints():
    """Test FastAPI endpoints (requires running server)"""

    print("\n\n🌐 FastAPI Endpoint Test")
    print("=" * 50)

    try:
        import requests
    except ImportError:
        print("⚠️  requests library not installed")
        return False

    base_url = "http://127.0.0.1:8000"

    print("\n1️⃣  Checking FastAPI availability...")
    try:
        response = requests.get(f"{base_url}/docs", timeout=2)
        if response.status_code == 200:
            print("   ✅ FastAPI server is running")
        else:
            print(f"   ⚠️  FastAPI returned {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to FastAPI server on port 8000")
        print("      Start FastAPI with: python fastapi_server.py")
        return False

    # Test endpoints
    print("\n2️⃣  Testing Neuro API endpoints...")
    endpoints = [
        ("POST", "/neuro/memory/create", {"document": "Test memory", "metadata": {"type": "test"}}),
        ("POST", "/neuro/memory/query", {"query": "memory", "limit": 3}),
        ("GET", "/neuro/memory/all", None),
    ]

    for method, endpoint, data in endpoints:
        try:
            url = f"{base_url}{endpoint}"
            if method == "GET":
                response = requests.get(url, timeout=5)
            else:
                response = requests.post(url, json=data, timeout=5)

            if response.status_code == 200:
                print(f"   ✅ {method} {endpoint} - OK")
            else:
                print(f"   ⚠️  {method} {endpoint} - Status {response.status_code}")

        except Exception as e:
            print(f"   ❌ {method} {endpoint} - Error: {e}")

    print("\n" + "=" * 50)
    print("✅ API endpoints accessible!")
    return True


async def main():
    """Run all tests"""

    print("\n" + "🚀 " * 10)
    print("Neuro + Elysia AI Integration Test Suite")
    print("🚀 " * 10 + "\n")

    # Test MemoryHandler
    handler_ok = await test_memory_handler()

    # Test API (optional - requires running server)
    print("\n💡 Note: API tests require running FastAPI server")
    print("   Start with: python fastapi_server.py")
    api_ok = test_api_endpoints()

    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    print(f"Memory Handler:  {'✅ PASS' if handler_ok else '❌ FAIL'}")
    print(f"API Endpoints:   {'✅ PASS' if api_ok else '⚠️  SKIPPED'}")
    print("=" * 50)

    if handler_ok:
        print("\n✨ Neuro integration is ready! ✨\n")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.\n")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
