ENTRY(_start)
PHDRS {
    code PT_LOAD FLAGS(5);
    data PT_LOAD FLAGS(6);
}
SECTIONS {
    . = 0x02000000;
    .text : ALIGN(4096) { KEEP(*(.text.entry)) *(.text .text.*) . = ALIGN(4096); } :code
    rodata_start = .;
    .rodata : ALIGN(4096) { *(.rodata .rodata.*) . = ALIGN(4096); } :code
    data_start = .;
    .data : ALIGN(4096) { *(.data .data.*) *(.got .got.*) } :data
    .bss (NOLOAD) : ALIGN(4096) { *(.bss .bss.*) *(COMMON) } :data
    kernel_end = ALIGN(4096);
    /DISCARD/ : { *(.eh_frame*) *(.comment*) }
}
