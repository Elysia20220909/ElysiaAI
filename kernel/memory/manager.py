import logging
import math


logger = logging.getLogger("AbyssRTOS_Memory")


class MemoryManager:
    """
    Simulates Physical Memory Management (PMM) and Paging.
    Based on pritamzope/OS pmm.c / paging.c logic.
    """

    def __init__(self, total_mem_mb: int = 128):
        self.block_size = 4096  # 4KB Pages
        self.total_mem = total_mem_mb * 1024 * 1024
        self.total_blocks = self.total_mem // self.block_size

        # Bitmap: 1 bit per block. (Simplified as list of booleans)
        self.bitmap = [0] * self.total_blocks

        # Reserve Kernel Space (First 4MB)
        self._reserve_region(0, 4 * 1024 * 1024)

        # Virtual Pages (For UI display)
        self.page_directory = {}  # Virtual -> Physical

    def _reserve_region(self, start: int, size: int):
        start_block = start // self.block_size
        num_blocks = math.ceil(size / self.block_size)
        for i in range(start_block, start_block + num_blocks):
            if i < len(self.bitmap):
                self.bitmap[i] = 1  # Used
        logger.info(f"🧠 AbyssRTOS Memory: Reserved {num_blocks} blocks for Kernel.")

    def allocate_block(self) -> int:
        """Finds a free block in the bitmap."""
        for i, status in enumerate(self.bitmap):
            if status == 0:
                self.bitmap[i] = 1
                return i * self.block_size
        raise MemoryError("Out of Abyssal memory frames.")

    def get_stats(self) -> dict:
        used = sum(self.bitmap)
        return {
            "total_blocks": self.total_blocks,
            "used_blocks": used,
            "free_blocks": self.total_blocks - used,
            "usage_percent": (used / self.total_blocks) * 100,
            "page_size_kb": self.block_size // 1024,
        }


# Global Instance
mem_manager = MemoryManager()
