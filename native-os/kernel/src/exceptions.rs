use crate::platform;
use core::{
    arch::{asm, global_asm},
    sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering},
};

#[repr(C, packed)]
struct TablePointer {
    limit: u16,
    base: u64,
}

#[derive(Clone, Copy)]
#[repr(C, packed)]
struct Gate {
    low: u16,
    selector: u16,
    ist: u8,
    attributes: u8,
    middle: u16,
    high: u32,
    reserved: u32,
}
impl Gate {
    const EMPTY: Self = Self {
        low: 0,
        selector: 0,
        ist: 0,
        attributes: 0,
        middle: 0,
        high: 0,
        reserved: 0,
    };
    fn handler(address: u64) -> Self {
        Self {
            low: address as u16,
            selector: 8,
            ist: 0,
            attributes: 0x8e,
            middle: (address >> 16) as u16,
            high: (address >> 32) as u32,
            reserved: 0,
        }
    }
}
// Accessed bits are preset. The TSS descriptor is writable because LTR sets busy.
static mut GDT: [u64; 7] = [
    0,
    0x00af_9b00_0000_ffff,
    0x00cf_9300_0000_ffff,
    0x00af_fb00_0000_ffff,
    0x00cf_f300_0000_ffff,
    0,
    0,
];
static mut IDT: [Gate; 256] = [Gate::EMPTY; 256];
#[repr(C, packed)]
struct Tss {
    reserved: u32,
    rsp: [u64; 3],
    reserved2: u64,
    ist: [u64; 7],
    reserved3: u64,
    reserved4: u16,
    iomap: u16,
}
static mut TSS: Tss = Tss {
    reserved: 0,
    rsp: [0; 3],
    reserved2: 0,
    ist: [0; 7],
    reserved3: 0,
    reserved4: 0,
    iomap: 104,
};
#[repr(align(16))]
struct EntryStack([u8; 32768]);
static mut ENTRY_STACK: EntryStack = EntryStack([0; 32768]);
static mut DOUBLE_FAULT_STACK: EntryStack = EntryStack([0; 32768]);
static EXPECT_UD: AtomicBool = AtomicBool::new(false);
static EXPECT_PF: AtomicU32 = AtomicU32::new(0);
static PF_ADDRESS: AtomicU64 = AtomicU64::new(0);
static PF_ERROR: AtomicU64 = AtomicU64::new(0);

global_asm!(include_str!("traps.S"));
unsafe extern "C" {
    fn trap_0();
    fn trap_1();
    fn trap_2();
    fn trap_3();
    fn trap_4();
    fn trap_5();
    fn trap_6();
    fn trap_7();
    fn trap_8();
    fn trap_9();
    fn trap_10();
    fn trap_11();
    fn trap_12();
    fn trap_13();
    fn trap_14();
    fn trap_15();
    fn trap_16();
    fn trap_17();
    fn trap_18();
    fn trap_19();
    fn trap_20();
    fn trap_21();
    fn trap_22();
    fn trap_23();
    fn trap_24();
    fn trap_25();
    fn trap_26();
    fn trap_27();
    fn trap_28();
    fn trap_29();
    fn trap_30();
    fn trap_31();
    fn trap_128();
    fn trap_255();
    pub fn restore_user(frame: *const crate::userspace::Frame) -> !;
}

/// CPL0, one CPU, interrupts off. TSS RSP0 handles untrusted user RSP; IST1
/// provides a distinct emergency stack for double faults, which remain terminal.
pub unsafe fn install() {
    unsafe {
        let tss = core::ptr::addr_of_mut!(TSS);
        core::ptr::addr_of_mut!((*tss).rsp)
            .cast::<u64>()
            .write_unaligned(core::ptr::addr_of_mut!(ENTRY_STACK.0) as u64 + 32768);
        core::ptr::addr_of_mut!((*tss).ist)
            .cast::<u64>()
            .write_unaligned(core::ptr::addr_of_mut!(DOUBLE_FAULT_STACK.0) as u64 + 32768);
        let base = tss as u64;
        let entries = core::ptr::addr_of_mut!(GDT).cast::<u64>();
        entries
            .add(5)
            .write(103 | ((base & 0xffffff) << 16) | (0x89 << 40) | (((base >> 24) & 0xff) << 56));
        entries.add(6).write(base >> 32);
        let gdt = TablePointer {
            limit: 55,
            base: entries as u64,
        };
        asm!("lgdt [{table}]", "push 8", "lea rax, [rip + 2f]", "push rax", "retfq", "2:",
             "mov ax, 16", "mov ds, ax", "mov es, ax", "mov ss, ax", "mov ax, 40", "ltr ax",
             table = in(reg) &gdt, out("rax") _);
        let handlers: [unsafe extern "C" fn(); 32] = [
            trap_0, trap_1, trap_2, trap_3, trap_4, trap_5, trap_6, trap_7, trap_8, trap_9,
            trap_10, trap_11, trap_12, trap_13, trap_14, trap_15, trap_16, trap_17, trap_18,
            trap_19, trap_20, trap_21, trap_22, trap_23, trap_24, trap_25, trap_26, trap_27,
            trap_28, trap_29, trap_30, trap_31,
        ];
        let entries = core::ptr::addr_of_mut!(IDT).cast::<Gate>();
        for index in 0..256 {
            entries
                .add(index)
                .write(Gate::handler(trap_255 as *const () as u64));
        }
        for (index, handler) in handlers.iter().enumerate() {
            let mut gate = Gate::handler(*handler as *const () as u64);
            if index == 8 {
                gate.ist = 1;
            }
            entries.add(index).write(gate);
        }
        let mut syscall = Gate::handler(trap_128 as *const () as u64);
        syscall.attributes = 0xee; // present interrupt gate, callable at DPL3
        entries.add(128).write(syscall);
        let idt = TablePointer {
            limit: (core::mem::size_of::<[Gate; 256]>() - 1) as u16,
            base: entries as u64,
        };
        asm!("lidt [{}]", in(reg) &idt, options(readonly, nostack));
    }
}

#[unsafe(no_mangle)]
extern "sysv64" fn dispatch_trap(
    frame: *mut crate::userspace::Frame,
) -> *const crate::userspace::Frame {
    // SAFETY: assembly saved all GPRs and normalized the exception frame on a
    // supervisor stack; interrupts stay disabled until IRET.
    let frame = unsafe { &mut *frame };
    let address: u64;
    unsafe {
        asm!("mov {}, cr2", out(reg) address, options(nomem, nostack));
    }
    if frame.cs & 3 == 3 {
        unsafe { crate::userspace::trap(frame, address) }
    } else {
        kernel_fault(frame.vector as u32, frame.error, address)
    }
}
pub fn expect_invalid_opcode() {
    EXPECT_UD.store(true, Ordering::Relaxed);
}

pub fn expect_page_fault(code: u32, address: u64, error: u64) {
    PF_ADDRESS.store(address, Ordering::Relaxed);
    PF_ERROR.store(error, Ordering::Relaxed);
    EXPECT_PF.store(code, Ordering::Release);
}

#[unsafe(no_mangle)]
extern "sysv64" fn kernel_fault(vector: u32, error: u64, address: u64) -> ! {
    if vector == 6 && EXPECT_UD.load(Ordering::Relaxed) {
        platform::log(format_args!("kernel:fault:invalid-opcode"));
        platform::exit(0x12);
    }
    let expected = EXPECT_PF.load(Ordering::Acquire);
    if vector == 14
        && (0x13..=0x15).contains(&expected)
        && address == PF_ADDRESS.load(Ordering::Relaxed)
        && error == PF_ERROR.load(Ordering::Relaxed)
    {
        let label = match expected {
            0x13 => "unmapped",
            0x14 => "readonly",
            _ => "noexecute",
        };
        platform::log(format_args!(
            "kernel:fault:{label} address={address:#x} error={error:#x}"
        ));
        platform::exit(expected);
    }
    platform::log(format_args!(
        "kernel:fault:unexpected vector={vector} address={address:#x} error={error:#x}"
    ));
    platform::exit(0x7f)
}
