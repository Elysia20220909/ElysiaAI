/* 🧧 ABYSS_RTOS LINKER_SCRIPT v1.3 */

ENTRY(kernel_main)

SECTIONS {
    /* For RPi 4, we start at 0x8000. 
       For QEMU x86 -kernel, it usually loads at 1MB or similar.
       We'll use 0x8000 for resonance consistency. */
    . = 0x8000;

    .text : {
        KEEP(*(.text.boot))
        *(.text)
    }

    .rodata : {
        *(.rodata)
    }

    .data : {
        *(.data)
    }

    .bss : {
        *(.bss)
        COMMON
    }

    /DISCARD/ : {
        *(.comment)
        *(.note.GNU-stack)
    }
}
