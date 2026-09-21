#![no_std]
#![no_main]

mod address_space;
mod elf_loader;
mod exceptions;
mod journal_disk;
mod memory;
mod operator;
mod paging;
mod persistent;
#[path = "../../platform.rs"]
mod platform;
mod timer;
mod userspace;

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
    let info_address = info as u64;
    let info = unsafe { *info };
    if let Err(reason) = info.validate() {
        platform::log(format_args!("kernel:boot-info-rejected:{reason}"));
        platform::exit(0x11);
    }
    platform::log(format_args!(
        "kernel:boot-info-valid descriptors={}",
        info.memory_map_size / info.descriptor_size
    ));
    // Consume the firmware map while its old identity mapping is present. Only our copy
    // of BootInfo and the allocator's bitmaps are used after switching the address space.
    unsafe {
        let frames = memory::initialize(&info, info_address);
        paging::activate(frames, &info);
    }
    match BootMode::from_raw(info.mode) {
        Some(BootMode::UnmappedPage) => {
            exceptions::expect_page_fault(0x13, paging::UNMAPPED, 0);
            platform::log(format_args!("kernel:injecting-unmapped"));
            // SAFETY: deliberate fault in a terminal test; no Rust reference is formed.
            unsafe {
                asm!("mov rax, [{address}]", address = in(reg) paging::UNMAPPED, out("rax") _, options(nostack));
            }
            platform::fail("unmapped-access-succeeded");
        }
        Some(BootMode::ReadOnlyPage) => {
            let address = paging::readonly_address();
            exceptions::expect_page_fault(0x14, address, 3);
            platform::log(format_args!("kernel:injecting-readonly"));
            // SAFETY: terminal write-protection test; normal execution must never resume.
            unsafe {
                asm!("mov byte ptr [{address}], 0", address = in(reg) address, options(nostack));
            }
            platform::fail("readonly-write-succeeded");
        }
        Some(BootMode::NoExecutePage) => {
            let address = paging::noexecute_address();
            exceptions::expect_page_fault(0x15, address, 0x11);
            platform::log(format_args!("kernel:injecting-noexecute"));
            // SAFETY: the NX page contains RET; a missing NX protection returns to failure.
            unsafe {
                asm!("call {address}", address = in(reg) address, clobber_abi("sysv64"));
            }
            platform::fail("noexecute-call-succeeded");
        }
        _ => {}
    }
    if info.mode == BootMode::InvalidOpcode as u32 {
        exceptions::expect_invalid_opcode();
        platform::log(format_args!("kernel:injecting-invalid-opcode"));
        // SAFETY: the intentional fault test terminates through our vector-6 handler.
        unsafe {
            asm!("ud2", options(noreturn));
        }
    }
    if info.mode == 54 {
        persistent::boot(info.mode);
        unsafe { userspace::run(45) }
    }
    if (50..=53).contains(&info.mode) {
        persistent::boot(info.mode);
        unsafe { userspace::run(45) }
    }
    if info.mode >= BootMode::UserCooperate as u32 {
        unsafe { userspace::run(info.mode) }
    }
    platform::log(format_args!("kernel:ready"));
    platform::exit(0x10)
}

#[panic_handler]
fn panic(info: &PanicInfo<'_>) -> ! {
    platform::log(format_args!("kernel:panic {info}"));
    platform::exit(0x7f)
}
