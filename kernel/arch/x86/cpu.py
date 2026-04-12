import logging


logger = logging.getLogger("AbyssRTOS_GDT")


class GDTDescriptor:
    def __init__(self, base: int, limit: int, access: int, flags: int):
        self.base = base
        self.limit = limit
        self.access = access
        self.flags = flags

    def to_dict(self):
        return {"base": hex(self.base), "limit": hex(self.limit), "access": bin(self.access), "flags": bin(self.flags)}


class VirtualGDT:
    """
    Simulation of the Global Descriptor Table.
    Reference: pritamzope/OS/NEW KERNEL/Paging/src/gdt.c
    """

    def __init__(self):
        self.entries: list[GDTDescriptor] = []
        self._initialize_default_gdt()

    def _initialize_default_gdt(self):
        # Null Segment
        self.set_entry(0, 0, 0, 0, 0)
        # Kernel Code (0x08): Base 0, Limit 4GB, Type: Code/Read, DPL 0
        self.set_entry(1, 0, 0xFFFFFFFF, 0x9A, 0xCF)
        # Kernel Data (0x10): Base 0, Limit 4GB, Type: Data/Write, DPL 0
        self.set_entry(2, 0, 0xFFFFFFFF, 0x92, 0xCF)
        # User Code (0x18): Base 0, Limit 4GB, Type: Code/Read, DPL 3
        self.set_entry(3, 0, 0xFFFFFFFF, 0xFA, 0xCF)
        # User Data (0x20): Base 0, Limit 4GB, Type: Data/Write, DPL 3
        self.set_entry(4, 0, 0xFFFFFFFF, 0xF2, 0xCF)

        logger.info("🛡️ AbyssRTOS: GDT initialized with 5 segments (Flat Memory Model).")

    def set_entry(self, index: int, base: int, limit: int, access: int, flags: int):
        descriptor = GDTDescriptor(base, limit, access, flags)
        if index < len(self.entries):
            self.entries[index] = descriptor
        else:
            self.entries.append(descriptor)

    def get_status(self) -> list[dict]:
        return [e.to_dict() for e in self.entries]


# --- IDT Section ---


class IDTDescriptor:
    def __init__(self, offset: int, selector: int, flags: int):
        self.offset = offset
        self.selector = selector
        self.flags = flags

    def to_dict(self):
        return {"offset": hex(self.offset), "selector": hex(self.selector), "flags": bin(self.flags)}


class VirtualIDT:
    """
    Simulation of the Interrupt Descriptor Table.
    Reference: pritamzope/OS/NEW KERNEL/Paging/src/idt.c
    """

    def __init__(self):
        self.entries: dict[int, IDTDescriptor] = {}
        self._initialize_default_idt()

    def _initialize_default_idt(self):
        # 0x08 is the Kernel Code Selector from GDT
        # 0x8E is the flag for 32-bit Interrupt Gate, present, DPL 0
        for i in range(256):
            self.set_gate(i, 0x0, 0x08, 0x8E)

        logger.info("🛡️ AbyssRTOS: IDT initialized with 256 gates.")

    def set_gate(self, num: int, offset: int, selector: int, flags: int):
        self.entries[num] = IDTDescriptor(offset, selector, flags)

    def get_status(self) -> dict[int, dict]:
        return {k: v.to_dict() for k, v in self.entries.items() if v.offset != 0 or k < 32}


# Global Instances for the Workbench
gdt = VirtualGDT()
idt = VirtualIDT()
