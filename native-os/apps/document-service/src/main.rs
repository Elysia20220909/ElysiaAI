#![no_std]
#![no_main]
use core::arch::{asm, global_asm};
global_asm!(include_str!("entry.S"));
#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    unsafe {
        asm!("ud2", options(noreturn));
    }
}
