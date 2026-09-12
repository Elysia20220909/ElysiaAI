ENTRY(_start)
PHDRS {
    code PT_LOAD FLAGS(5);
    data PT_LOAD FLAGS(6);
}
SECTIONS {
    . = 0x02000000;
    .text : ALIGN(4096) { KEEP(*(.text.entry)) *(.text .text.*) } :code
    .rodata : ALIGN(4096) { *(.rodata .rodata.*) } :code
    .data : ALIGN(4096) { *(.data .data.*) *(.got .got.*) } :data
    .bss (NOLOAD) : ALIGN(4096) { *(.bss .bss.*) *(COMMON) } :data
    /DISCARD/ : { *(.eh_frame*) *(.comment*) }
}
