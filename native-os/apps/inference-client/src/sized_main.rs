#![no_std]
#![no_main]
use core::{
    arch::{asm, global_asm},
    ptr,
};
use elysia_inference_client::sized::SHAPES;

global_asm!(
    ".section .text.entry,\"ax\"",
    "ud2",
    ".space 14",
    ".global _start",
    "_start:",
    "mov rdi, r13",
    "call sized_run",
    "ud2",
    ".section .data,\"aw\"",
    ".space 32",
);
const BASE: usize = 0x90000000;

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

#[unsafe(no_mangle)]
extern "sysv64" fn sized_run(mode: u64) -> ! {
    let Some(shape) = mode
        .checked_sub(75)
        .and_then(|i| SHAPES.get(i as usize))
        .copied()
    else {
        exit(1);
    };
    let Some(layout) = shape.layout() else {
        exit(1);
    };
    syscall(1, 0, 0);
    if syscall(9, layout.pages as u64, 0) != BASE as u64 {
        exit(1);
    }
    // Volatile stores/loads keep every input, weight and output in the real arena.
    // Bounds above keep all products, offsets and integer accumulators in range.
    let inputs = BASE as *mut i32;
    let weights = (BASE + layout.inputs * 4) as *mut i32;
    let outputs = (BASE + layout.output_offset) as *mut i64;
    let mut checksum = 0i64;
    unsafe {
        for i in 0..layout.inputs {
            ptr::write_volatile(inputs.add(i), (i % 5) as i32 - 2);
        }
        for i in 0..layout.weights {
            ptr::write_volatile(weights.add(i), (i % 7) as i32 - 3);
        }
        for b in 0..shape.batch {
            for c in 0..shape.classes {
                let mut sum = 0i64;
                for d in 0..shape.width {
                    sum += ptr::read_volatile(inputs.add(b * shape.width + d)) as i64
                        * ptr::read_volatile(weights.add(c * shape.width + d)) as i64;
                }
                ptr::write_volatile(outputs.add(b * shape.classes + c), sum);
            }
        }
        for i in 0..shape.batch * shape.classes {
            checksum += ptr::read_volatile(outputs.add(i));
        }
        // Fixed little-endian record in the ELF data page; no formatting allocation.
        let record = 0x60000000 as *mut u64;
        ptr::write_volatile(record, shape.batch as u64);
        ptr::write_volatile(record.add(1), shape.width as u64);
        ptr::write_volatile(record.add(2), shape.classes as u64);
        ptr::write_volatile(record.add(3), checksum as u64);
    }
    if syscall(0, 0x60000000, 32) != 32 {
        exit(1);
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
