//! Dedicated QEMU ISA IDE master, PIO only. Never probes other ports or formats media.
use core::arch::asm;
use elysia_kernel::journal::{DISK_SECTORS, SECTOR, SLOTS};
unsafe fn input(port: u16) -> u8 {
    let value: u8;
    unsafe {
        asm!("in al, dx",in("dx") port,out("al") value,options(nomem,nostack));
    }
    value
}
unsafe fn output(port: u16, value: u8) {
    unsafe {
        asm!("out dx, al",in("dx") port,in("al") value,options(nomem,nostack));
    }
}
fn delay() {
    for _ in 0..4 {
        unsafe {
            input(0x3f6);
        }
    }
}
fn wait(data: bool) -> Result<(), &'static str> {
    for _ in 0..2_000_000 {
        let s = unsafe { input(0x1f7) };
        if s == 0 || s == 255 {
            return Err("disk-absent");
        }
        if s & 0x80 == 0 {
            if s & 0x21 != 0 {
                return Err("disk-status");
            }
            if (s & 8 != 0) == data {
                return Ok(());
            }
        }
        core::hint::spin_loop();
    }
    Err("disk-timeout")
}
fn words() -> [u8; SECTOR] {
    let mut bytes = [0; SECTOR];
    for pair in bytes.chunks_exact_mut(2) {
        let word: u16;
        unsafe {
            asm!("in ax, dx",in("dx") 0x1f0u16,out("ax") word,options(nomem,nostack));
        }
        pair.copy_from_slice(&word.to_le_bytes());
    }
    bytes
}
pub fn initialize() -> Result<(), &'static str> {
    unsafe {
        output(0x3f6, 2);
        output(0x1f6, 0xa0);
    }
    delay();
    unsafe {
        output(0x1f2, 0);
        output(0x1f3, 0);
        output(0x1f4, 0);
        output(0x1f5, 0);
        output(0x1f7, 0xec);
    }
    delay();
    wait(true)?;
    let identity = words();
    wait(false)?;
    if u32::from_le_bytes(identity[120..124].try_into().unwrap()) != DISK_SECTORS {
        return Err("disk-size");
    }
    if read(0)? != elysia_kernel::journal::header() {
        return Err("disk-label");
    }
    Ok(())
}
fn command(lba: u32, op: u8) -> Result<(), &'static str> {
    if lba >= DISK_SECTORS {
        return Err("disk-range");
    }
    wait(false)?;
    unsafe {
        output(0x1f6, 0xe0);
    }
    delay();
    unsafe {
        output(0x1f2, 1);
        output(0x1f3, lba as u8);
        output(0x1f4, 0);
        output(0x1f5, 0);
        output(0x1f7, op);
    }
    delay();
    wait(true)
}
pub fn read(lba: u32) -> Result<[u8; SECTOR], &'static str> {
    command(lba, 0x20)?;
    let bytes = words();
    wait(false)?;
    Ok(bytes)
}
pub fn write(lba: u32, bytes: &[u8; SECTOR]) -> Result<(), &'static str> {
    if !(1..=SLOTS as u32).contains(&lba) {
        return Err("disk-write-range");
    }
    write_sector(lba, bytes)
}
pub fn write_agent(lba: u32, bytes: &[u8; SECTOR]) -> Result<(), &'static str> {
    use elysia_kernel::agent_budget::{FIRST_LBA, SLOTS};
    if !(FIRST_LBA..FIRST_LBA + SLOTS as u32).contains(&lba) {
        return Err("agent-disk-write-range");
    }
    write_sector(lba, bytes)
}
fn write_sector(lba: u32, bytes: &[u8; SECTOR]) -> Result<(), &'static str> {
    command(lba, 0x30)?;
    for pair in bytes.chunks_exact(2) {
        let word = u16::from_le_bytes(pair.try_into().unwrap());
        unsafe {
            asm!("out dx, ax",in("dx") 0x1f0u16,in("ax") word,options(nomem,nostack));
        }
    }
    wait(false)?;
    unsafe {
        output(0x1f7, 0xe7);
    }
    delay();
    wait(false)?;
    if read(lba)? != *bytes {
        return Err("disk-readback");
    }
    Ok(())
}
