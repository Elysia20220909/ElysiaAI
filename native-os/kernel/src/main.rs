#![no_std]
#![no_main]

mod exceptions;
#[path = "../../platform.rs"]
mod platform;

use core::{
    arch::{asm, global_asm},
    panic::PanicInfo,
};
use elysia_boot_protocol::{BootInfo, BootMode};

global_asm!(
    ".section .text.entry, \"ax\"",
    ".global _start",
    "_start:",
    "cli",
    "cld",
    "lea rsp, [rip + kernel_stack_top]",
    "and rsp, -16",
    "xor rbp, rbp",
    "call kernel_main",
    "ud2",
    ".section .bss.stack, \"aw\", @nobits",
    ".balign 16",
    "kernel_stack_bottom:",
    ".skip 65536",
    "kernel_stack_top:",
    ".section .text, \"ax\"",
);

#[unsafe(no_mangle)]
extern "sysv64" fn kernel_main(info: *const BootInfo) -> ! {
    platform::init_console();
    platform::log(format_args!("kernel:entered"));
    // SAFETY: interrupts are disabled and this is the only CPU; tables remain static.
    unsafe {
        exceptions::install();
    }
    platform::log(format_args!("kernel:exceptions-ready"));
    if info.is_null() || !(info as usize).is_multiple_of(core::mem::align_of::<BootInfo>()) {
        platform::fail("boot-info-pointer");
    }
    // SAFETY: our loader supplies a live, identity-mapped BootInfo in its retained image.
    // M1 does not accept arbitrary third-party loaders or reclaim their memory.
    let info = unsafe { &*info };
    if let Err(reason) = info.validate() {
        platform::log(format_args!("kernel:boot-info-rejected:{reason}"));
        platform::exit(0x11);
    }
    platform::log(format_args!(
        "kernel:boot-info-valid descriptors={}",
        info.memory_map_size / info.descriptor_size
    ));
    if info.mode == BootMode::InvalidOpcode as u32 {
        exceptions::expect_invalid_opcode();
        platform::log(format_args!("kernel:injecting-invalid-opcode"));
        // SAFETY: the intentional fault test terminates through our vector-6 handler.
        unsafe {
            asm!("ud2", options(noreturn));
        }
    }
    platform::log(format_args!("kernel:ready"));
    platform::exit(0x10)
}

#[panic_handler]
fn panic(info: &PanicInfo<'_>) -> ! {
    platform::log(format_args!("kernel:panic {info}"));
    platform::exit(0x7f)
}
