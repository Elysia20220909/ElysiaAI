use crate::platform;
use core::{
    arch::{asm, global_asm},
    sync::atomic::{AtomicBool, Ordering},
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
static GDT: [u64; 3] = [0, 0x00af_9a00_0000_ffff, 0x00cf_9200_0000_ffff];
static mut IDT: [Gate; 256] = [Gate::EMPTY; 256];
static EXPECT_UD: AtomicBool = AtomicBool::new(false);

global_asm!(
    ".section .text, \"ax\"",
    ".global invalid_opcode_stub",
    "invalid_opcode_stub:",
    "mov edi, 6",
    "jmp fault_stub",
    ".global page_fault_stub",
    "page_fault_stub:",
    "mov edi, 14",
    "jmp fault_stub",
    ".global unexpected_fault_stub",
    "unexpected_fault_stub:",
    "mov edi, 255",
    "fault_stub:",
    "cld",
    "and rsp, -16",
    "call kernel_fault",
    "ud2",
);
unsafe extern "C" {
    fn invalid_opcode_stub();
    fn page_fault_stub();
    fn unexpected_fault_stub();
}

/// Install our own GDT/IDT. Requires CPL0, interrupts off, and single-CPU initialization.
/// Fault stubs never return, so both error-code and no-error-code frames terminate safely.
/// A dedicated double-fault stack and recoverable exceptions are outside M1.
pub unsafe fn install() {
    let gdt = TablePointer {
        limit: (core::mem::size_of_val(&GDT) - 1) as u16,
        base: GDT.as_ptr() as u64,
    };
    // SAFETY: static valid descriptors; the far return reloads CS and balances its pushes.
    unsafe {
        asm!(
            "lgdt [{table}]",
            "push 8",
            "lea rax, [rip + 2f]",
            "push rax",
            "retfq",
            "2:",
            "mov ax, 16",
            "mov ds, ax",
            "mov es, ax",
            "mov ss, ax",
            table = in(reg) &gdt,
            out("rax") _,
        );
        let entries = core::ptr::addr_of_mut!(IDT).cast::<Gate>();
        for index in 0..256 {
            entries
                .add(index)
                .write(Gate::handler(unexpected_fault_stub as *const () as u64));
        }
        entries
            .add(6)
            .write(Gate::handler(invalid_opcode_stub as *const () as u64));
        entries
            .add(14)
            .write(Gate::handler(page_fault_stub as *const () as u64));
        let idt = TablePointer {
            limit: (core::mem::size_of::<[Gate; 256]>() - 1) as u16,
            base: entries as u64,
        };
        asm!("lidt [{}]", in(reg) &idt, options(readonly, nostack));
    }
}
pub fn expect_invalid_opcode() {
    EXPECT_UD.store(true, Ordering::Relaxed);
}

#[unsafe(no_mangle)]
extern "sysv64" fn kernel_fault(vector: u32) -> ! {
    if vector == 6 && EXPECT_UD.load(Ordering::Relaxed) {
        platform::log(format_args!("kernel:fault:invalid-opcode"));
        platform::exit(0x12);
    }
    platform::log(format_args!("kernel:fault:unexpected vector={vector}"));
    platform::exit(0x7f)
}
