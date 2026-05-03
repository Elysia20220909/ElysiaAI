class _MemoryManager:
    total_blocks = 1024

    def get_stats(self) -> dict[str, int]:
        return {"total_blocks": self.total_blocks, "used_blocks": 128, "free_blocks": 896}


mem_manager = _MemoryManager()
