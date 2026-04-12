import logging


logger = logging.getLogger("AbyssRTOS_IDT")


class IDTEntry:
    def __init__(self, selector: int, offset: int, access: int):
        self.selector = selector  # GDT selector
        self.offset = offset
        self.access = access


class VirtualIDT:
    """
    Virtual Interrupt Descriptor Table (IDT) simulation.
    Based on pritamzope/OS idt.c logic.
    Handles 'Signals' from the Abyss.
    """

    def __init__(self):
        self.entries: list[IDTEntry] = [None] * 256
        self._setup_default_idt()

    def _setup_default_idt(self):
        """
        Initializes common interrupt vectors:
        - 0x00: Division by Zero
        - 0x0E: Page Fault
        - 0x21: Keyboard Interrupt (IRQ 1)
        - 0x80: System Call
        """
        # (selector, offset, access) 0x08 = Kernel Code, 0x8E = Interrupt Gate
        self.entries[0x00] = IDTEntry(0x08, 0xDEADBEEF, 0x8E)  # Div0
        self.entries[0x0E] = IDTEntry(0x08, 0x0000000E, 0x8E)  # PageFault
        self.entries[0x21] = IDTEntry(0x08, 0x00000021, 0x8E)  # Keyboard
        self.entries[0x80] = IDTEntry(0x08, 0x00000080, 0xEE)  # Syscall (User permitted)

        logger.info("📡 AbyssRTOS: IDT initialized. Vector 0x80 (Syscall) open.")

    def get_vectors(self) -> list[dict]:
        """Returns occupied interrupt vectors."""
        occupied = []
        for i, e in enumerate(self.entries):
            if e:
                occupied.append(
                    {"vector": hex(i), "selector": hex(e.selector), "offset": hex(e.offset), "access": hex(e.access)}
                )
        return occupied


# Global Instance
idt = VirtualIDT()
