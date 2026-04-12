import logging


logger = logging.getLogger("AbyssRTOS_GDT")


class GDTEntry:
    def __init__(self, base: int, limit: int, access: int, gran: int):
        self.base = base
        self.limit = limit
        self.access = access
        self.granularity = gran


class VirtualGDT:
    """
    Virtual Global Descriptor Table (GDT) simulation.
    Based on pritamzope/OS gdt.c logic.
    Defines memory segments for the AbyssRTOS kernel.
    """

    def __init__(self):
        self.entries: list[GDTEntry] = []
        self._setup_default_gdt()

    def _setup_default_gdt(self):
        """
        Initializes the standard segments:
        - Null Segment (Entry 0)
        - Kernel Code (Entry 1)
        - Kernel Data (Entry 2)
        - User Code (Entry 3)
        - User Data (Entry 4)
        """
        # (base, limit, access, gran)
        self.entries = [
            GDTEntry(0, 0, 0, 0),  # Null
            GDTEntry(0, 0xFFFFFFFF, 0x9A, 0xCF),  # Kernel Code
            GDTEntry(0, 0xFFFFFFFF, 0x92, 0xCF),  # Kernel Data
            GDTEntry(0, 0xFFFFFFFF, 0xFA, 0xCF),  # User Code
            GDTEntry(0, 0xFFFFFFFF, 0xF2, 0xCF),  # User Data
        ]
        logger.info("🛡️ AbyssRTOS: GDT initialized with 5 segments.")

    def get_segments(self) -> list[dict]:
        """Returns readable segment information for the UI."""
        labels = ["NULL", "K_CODE", "K_DATA", "U_CODE", "U_DATA"]
        return [
            {
                "index": i,
                "label": labels[i],
                "base": hex(e.base),
                "limit": hex(e.limit),
                "access": hex(e.access),
                "granularity": hex(e.granularity),
            }
            for i, e in enumerate(self.entries)
        ]


# Global Instance
gdt = VirtualGDT()
