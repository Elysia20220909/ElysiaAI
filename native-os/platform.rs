//! QEMU q35 bootstrap I/O. Privileged, single-CPU use only; never a host executable.
use core::arch::asm;
use core::fmt::{self, Write};

#[cfg(not(any(target_os = "uefi", target_os = "none")))]
compile_error!("bootstrap I/O requires a firmware or bare-metal target");

fn out_byte(port: u16, value: u8) {
    // SAFETY: both supported targets run at CPL0; these ports belong to our fixed QEMU machine.
    unsafe {
        asm!("out dx, al", in("dx") port, in("al") value, options(nomem, nostack));
    }
}
fn in_byte(port: u16) -> u8 {
    let value;
    // SAFETY: see out_byte; the COM1 line-status register has no memory side effects.
    unsafe {
        asm!("in al, dx", in("dx") port, out("al") value, options(nomem, nostack));
    }
    value
}
pub fn init_console() {
    out_byte(0x3f9, 0);
    out_byte(0x3fb, 0x80);
    out_byte(0x3f8, 1);
    out_byte(0x3f9, 0);
    out_byte(0x3fb, 3);
    out_byte(0x3fa, 0xc7);
    out_byte(0x3fc, 0x0b);
}
struct Serial;
impl Write for Serial {
    fn write_str(&mut self, text: &str) -> fmt::Result {
        for byte in text.bytes() {
            let mut ready = false;
            for _ in 0..100_000 {
                if in_byte(0x3fd) & 0x20 != 0 {
                    ready = true;
                    break;
                }
                core::hint::spin_loop();
            }
            if !ready {
                return Err(fmt::Error);
            }
            out_byte(0x3f8, byte);
        }
        Ok(())
    }
}
pub fn log(args: fmt::Arguments<'_>) {
    let _ = Serial.write_fmt(args);
    let _ = Serial.write_str("\r\n");
}
/// Exit the test VM. An absent debug-exit device yields a halted CPU, then a host timeout.
pub fn exit(code: u32) -> ! {
    // SAFETY: the runner exclusively installs isa-debug-exit at 0xf4 in the test VM.
    unsafe {
        asm!("cli", options(nomem, nostack));
        asm!("out dx, eax", in("dx") 0xf4u16, in("eax") code, options(nomem, nostack));
    }
    loop {
        // SAFETY: interrupts are disabled; this is the terminal failure path.
        unsafe {
            asm!("hlt", options(nomem, nostack));
        }
    }
}
pub fn fail(reason: &str) -> ! {
    log(format_args!("failure:{reason}"));
    exit(0x7f)
}
