//! Guest probes exercise real page mappings; failures exit with a nonzero status.
use core::{arch::asm, ptr};
pub const BASE: usize = 0x9000_0000;
const PAGE: usize = 4096;
const MAX: usize = 16;

#[inline(never)]
pub fn resize(pages: u64) -> u64 {
    let result;
    unsafe {
        asm!("int 0x80",inout("rax") 9u64 => result,in("rdi") pages);
    }
    result
}
#[inline(never)]
pub fn require(ok: bool) {
    if !ok {
        unsafe {
            asm!("int 0x80",in("rax") 2u64,in("rdi") 1u64);
        }
        loop {
            core::hint::spin_loop();
        }
    }
}
#[inline(never)]
pub fn set_pages(pages: usize) {
    require(resize(pages as u64) == if pages == 0 { 0 } else { BASE as u64 });
}
#[inline(never)]
fn check(start: usize, end: usize, value: u8) {
    for i in start..end {
        require(unsafe { ptr::read_volatile((BASE + i) as *const u8) } == value);
    }
}
#[inline(never)]
fn fill(start: usize, end: usize, value: u8) {
    for i in start..end {
        unsafe {
            ptr::write_volatile((BASE + i) as *mut u8, value);
        }
    }
}
pub fn probe(mode: u64) {
    if mode == 64 {
        set_pages(2);
        check(0, 2 * PAGE, 0);
        fill(0, 2 * PAGE, 0x5a);
        set_pages(MAX);
        check(0, 2 * PAGE, 0x5a);
        check(2 * PAGE, MAX * PAGE, 0);
        // A log crosses two live pages; after shrinking it must be rejected.
        let mut result: u64;
        unsafe {
            asm!("int 0x80",inout("rax") 0u64 => result,in("rdi") BASE+PAGE-1,in("rsi") 2u64);
        }
        require(result == 2);
        set_pages(1);
        unsafe {
            asm!("int 0x80",inout("rax") 0u64 => result,in("rdi") BASE+PAGE-1,in("rsi") 2u64);
        }
        require(result == (-14i64) as u64);
        set_pages(MAX);
        super::log(b"infer:memory-grow");
    } else if mode == 65 {
        set_pages(MAX);
        fill(0, MAX * PAGE, 0x5a);
        require(resize(17) == (-22i64) as u64);
        require(resize(u64::MAX) == (-22i64) as u64);
        check(0, MAX * PAGE, 0x5a);
        super::log(b"infer:memory-limit");
    } else if mode == 66 {
        for _ in 0..8 {
            set_pages(MAX);
            check(0, MAX * PAGE, 0);
            fill(0, MAX * PAGE, 0x5a);
            set_pages(1);
            set_pages(MAX);
            check(0, PAGE, 0x5a);
            check(PAGE, MAX * PAGE, 0);
            set_pages(0);
        }
        super::log(b"infer:memory-release");
    } else {
        set_pages(MAX);
        fill(0, MAX * PAGE, 0x5a);
        match mode {
            67 => {
                super::log(b"infer:memory-fault");
                unsafe {
                    asm!("ud2", options(noreturn));
                }
            }
            68 => {
                super::log(b"infer:memory-budget");
                loop {
                    core::hint::spin_loop();
                }
            }
            69 => {
                set_pages(0);
                super::log(b"infer:memory-rollback");
            }
            70 => {
                super::log(b"infer:memory-guard");
                unsafe {
                    ptr::read_volatile((BASE + MAX * PAGE) as *const u8);
                }
                require(false);
            }
            71 => {
                super::log(b"infer:memory-nx");
                unsafe {
                    ptr::write_volatile(BASE as *mut u8, 0xc3);
                    asm!("call rax",in("rax") BASE,clobber_abi("sysv64"));
                }
                require(false);
            }
            _ => {
                set_pages(0);
                super::log(b"infer:memory-released");
                unsafe {
                    ptr::read_volatile(BASE as *const u8);
                }
                require(false);
            }
        }
    }
}
