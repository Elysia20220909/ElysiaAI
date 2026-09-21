#![no_std]
#![no_main]
use core::arch::{asm, global_asm};
use elysia_inference_client::{Error, INPUT_SIZE, Model, fixture_model};
// Share the checked proposal/IPC client, but select inference only in this ELF.
global_asm!(
    ".set INFERENCE_CLIENT, 1",
    include_str!("../../document-client/src/entry.S")
);
fn log(bytes: &[u8]) {
    unsafe {
        asm!("int 0x80",inout("rax") 0u64 => _,in("rdi") bytes.as_ptr(),in("rsi") bytes.len());
    }
}
#[unsafe(no_mangle)]
extern "sysv64" fn inference_propose(mode: u64) -> u64 {
    // Allow the independently scheduled service to enter its receive loop first.
    unsafe {
        asm!("int 0x80",inout("rax") 1u64 => _);
    }
    if mode == 60 {
        log(b"infer:budget");
        loop {
            core::hint::spin_loop();
        }
    }
    if mode == 61 {
        log(b"infer:fault");
        unsafe {
            asm!("ud2", options(noreturn));
        }
    }
    let mut input = [0u8; INPUT_SIZE];
    for (i, b) in input.iter_mut().enumerate() {
        // Kernel supplied runtime input in this process's private data page.
        *b = unsafe { core::ptr::read_volatile((0x60000400usize + i) as *const u8) };
    }
    let mut bytes = fixture_model();
    if mode == 58 {
        bytes[12] ^= 1;
    }
    let result = Model::decode(core::hint::black_box(&bytes)).and_then(|m| m.predict(&input));
    match result {
        Ok(prediction) => match prediction.bytes {
            Some(8) => {
                log(b"infer:length8");
                8
            }
            Some(16) => {
                log(b"infer:length16");
                16
            }
            _ => {
                log(b"infer:abstain");
                0
            }
        },
        Err(Error::Model) => {
            log(b"infer:model-rejected");
            0
        }
        Err(Error::Input) => {
            log(b"infer:input-rejected");
            0
        }
    }
}
#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    unsafe {
        asm!("ud2", options(noreturn));
    }
}
