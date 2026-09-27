ENTRY(_start)
PHDRS { code PT_LOAD FLAGS(5); data PT_LOAD FLAGS(6); }
SECTIONS {
    . = 0x40000000;
    .text : ALIGN(4096) { KEEP(*(.text.entry)) *(.text .text.*) *(.rodata .rodata.*) } :code
    . = 0x60000000;
    /* Preserve the assembly log buffer; discard unused library panic metadata. */
    .data : ALIGN(4096) { KEEP(*(.data)) *(.data.*) } :data
    .bss (NOLOAD) : ALIGN(16) { *(.bss .bss.*) *(COMMON) } :data
    ASSERT(. <= 0x600003f0, "static data overlaps document input length")
    /DISCARD/ : { *(.eh_frame*) *(.comment*) }
}
