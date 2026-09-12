//! Fixed q35 single-CPU PIT/PIC timer. Kernel handlers remain non-preemptible.
use crate::platform;
use core::arch::asm;
unsafe fn out(port: u16, value: u8) {
    unsafe {
        asm!("out dx,al",in("dx") port,in("al") value,options(nomem,nostack));
        asm!("out 0x80,al",in("al") 0u8,options(nomem,nostack));
    }
}
/// Called at CPL0 with IF clear. Disable the local APIC for legacy PIC delivery
/// in this fixed VM only; real hardware discovery/APIC support is a later task.
pub unsafe fn install() {
    unsafe {
        let mut low: u32;
        let high: u32;
        asm!("rdmsr",in("ecx") 0x1bu32,out("eax") low,out("edx") high,options(nostack));
        if low & (1 << 10) != 0 {
            platform::fail("x2apic-unsupported");
        }
        low &= !(1 << 11);
        asm!("wrmsr",in("ecx") 0x1bu32,in("eax") low,in("edx") high,options(nostack));
        out(0x21, 0xff);
        out(0xa1, 0xff);
        out(0x20, 0x11);
        out(0xa0, 0x11);
        out(0x21, 0x20);
        out(0xa1, 0x28);
        out(0x21, 4);
        out(0xa1, 2);
        out(0x21, 1);
        out(0xa1, 1);
        // 1,193,182 Hz / 11,932 ~= 100 Hz, periodic mode 2, low byte then high.
        out(0x43, 0x34);
        out(0x40, 11932u16 as u8);
        out(0x40, (11932u16 >> 8) as u8);
        out(0xa1, 0xff);
        out(0x21, 0xfe);
    }
    platform::log(format_args!("kernel:timer-ready source=pit irq=0 hz=100"));
}
pub unsafe fn acknowledge() {
    unsafe { out(0x20, 0x20) };
}
