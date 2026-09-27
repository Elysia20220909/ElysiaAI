#![no_std]
#![no_main]
use core::{
    arch::{asm, global_asm},
    ptr,
};
use elysia_inference_client::document::{Batch, COUNT};

global_asm!(
    ".section .text.entry,\"ax\"",
    "ud2",
    ".space 14",
    ".global _start",
    "_start:",
    "call document_run",
    "ud2",
    ".section .data,\"aw\"",
    ".space 32",
);
const ARENA: usize = 0x90000000;
fn syscall(number: u64, arg: u64, length: u64) -> u64 {
    let result;
    unsafe {
        asm!("int 0x80", inout("rax") number => result, in("rdi") arg, in("rsi") length);
    }
    result
}
fn exit(status: u64) -> ! {
    syscall(2, status, 0);
    loop {
        core::hint::spin_loop();
    }
}
fn log(values: [u64; 4]) {
    for (i, value) in values.iter().enumerate() {
        unsafe {
            ptr::write_volatile((0x60000000 as *mut u64).add(i), *value);
        }
    }
    if syscall(0, 0x60000000, 32) != 32 {
        exit(1);
    }
}

#[unsafe(no_mangle)]
extern "sysv64" fn document_run() -> ! {
    syscall(1, 0, 0);
    let length = unsafe { ptr::read_volatile(0x600003f0 as *const u64) } as usize;
    if length > 3072 || syscall(9, 1, 0) != ARENA as u64 {
        exit(1);
    }
    // The kernel copies the explicit input bundle into the unpublished data page.
    // Its features, weights and document IDs are validated before producing results.
    unsafe {
        ptr::copy_nonoverlapping(0x60000400 as *const u8, ARENA as *mut u8, length);
    }
    let bytes = unsafe { core::slice::from_raw_parts(ARENA as *const u8, length) };
    match Batch::decode(bytes) {
        Ok(batch) => {
            for index in 0..COUNT {
                let (id, score, class) = batch.predict(index).unwrap();
                log([
                    u64::from_le_bytes(*b"DCLRES01"),
                    id as u64,
                    score as i64 as u64,
                    class,
                ]);
            }
        }
        Err(reason) => log([u64::from_le_bytes(*b"DCLERR01"), reason as u64, 0, 0]),
    }
    if syscall(9, 0, 0) != 0 {
        exit(1);
    }
    exit(0);
}
#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    exit(1);
}
