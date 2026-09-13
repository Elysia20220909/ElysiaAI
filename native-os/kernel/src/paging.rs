//! A fresh four-level address space. All mappings are built before switching CR3.
use crate::platform;
use core::{
    arch::{asm, x86_64::__cpuid},
    ptr,
};
use elysia_boot_protocol::{BootInfo, KERNEL_BASE};
use elysia_memory::{FrameAllocator, PAGE};

const PRESENT: u64 = 1;
const WRITE: u64 = 2;
const USER: u64 = 4;
const NX: u64 = 1 << 63;
const ADDRESS: u64 = 0x000f_ffff_ffff_f000;
const TEST_VIRTUAL: u64 = 0x4000_0000;
pub const UNMAPPED: u64 = 0x5000_0000;
const MAX_TABLES: usize = 256;
pub const DIRECT: u64 = 1 << 39;
static mut KERNEL_ROOT: u64 = 0;
#[repr(align(4096))]
struct DataPage([u8; 4096]);
static mut NX_PAGE: DataPage = DataPage([0; 4096]);

unsafe extern "C" {
    static rodata_start: u8;
    static data_start: u8;
    static kernel_end: u8;
}

pub fn readonly_address() -> u64 {
    ptr::addr_of!(rodata_start) as u64
}
pub fn noexecute_address() -> u64 {
    ptr::addr_of!(NX_PAGE) as u64
}

struct Tables {
    root: u64,
    frames: [u64; MAX_TABLES],
    count: usize,
}
impl Tables {
    /// Caller has exclusive frame ownership and firmware identity mappings for free RAM.
    unsafe fn table(&mut self, allocator: &mut FrameAllocator) -> u64 {
        if self.count == MAX_TABLES {
            platform::fail("page-table-budget");
        }
        let address = allocator
            .allocate()
            .unwrap_or_else(|| platform::fail("page-table-exhaustion"));
        unsafe { ptr::write_bytes(address as *mut u8, 0, PAGE as usize) };
        self.frames[self.count] = address;
        self.count += 1;
        address
    }

    /// Only bootstrap-owned, newly allocated tables are traversed; no firmware tables reused.
    unsafe fn map(
        &mut self,
        allocator: &mut FrameAllocator,
        virtual_address: u64,
        physical: u64,
        flags: u64,
    ) {
        if virtual_address >= (1 << 47)
            || !virtual_address.is_multiple_of(PAGE)
            || physical & !ADDRESS != 0
            || flags & !(WRITE | NX | USER) != 0
            || flags & (WRITE | NX) == WRITE
        {
            platform::fail("page-map-contract");
        }
        let mut table = self.root;
        for shift in [39, 30, 21] {
            let entry =
                unsafe { (table as *mut u64).add(((virtual_address >> shift) & 511) as usize) };
            let mut value = unsafe { entry.read() };
            if value == 0 {
                let child = unsafe { self.table(allocator) };
                value = child | PRESENT | WRITE;
                unsafe { entry.write(value) };
            }
            if value & PRESENT == 0 || value & (1 << 7) != 0 {
                platform::fail("page-table-format");
            }
            // An intermediate entry may cover both kernel and user leaves. Only
            // explicitly USER-marked leaves become accessible from Ring 3.
            if flags & USER != 0 {
                value |= USER;
                unsafe { entry.write(value) };
            }
            table = value & ADDRESS;
        }
        let entry = unsafe { (table as *mut u64).add(((virtual_address >> 12) & 511) as usize) };
        if unsafe { entry.read() } != 0 {
            platform::fail("duplicate-mapping");
        }
        unsafe { entry.write(physical | flags | PRESENT) };
    }
}

/// # Safety
/// CPL0, interrupts disabled, one CPU. Own allocator, kernel stack and static tables.
/// Firmware identity mappings must remain valid until this function writes CR3.
pub unsafe fn activate(allocator: &mut FrameAllocator, info: &BootInfo) {
    let rodata = readonly_address();
    let data = ptr::addr_of!(data_start) as u64;
    let end = ptr::addr_of!(kernel_end) as u64;
    let valid_layout = KERNEL_BASE < rodata
        && rodata < data
        && data < end
        && end == info.kernel_end
        && rodata.is_multiple_of(PAGE)
        && data.is_multiple_of(PAGE);
    if !valid_layout {
        platform::fail("kernel-page-layout");
    }
    // Fail before touching EFER when NX is unavailable. M2a uses four-level paging only.
    let maximum = __cpuid(0x8000_0000).eax;
    if maximum < 0x8000_0001 || __cpuid(0x8000_0001).edx & (1 << 20) == 0 {
        platform::fail("nx-unavailable");
    }
    let old_root: u64;
    let mut cr4: u64;
    unsafe {
        asm!("mov {}, cr3", out(reg) old_root, options(nomem, nostack));
        asm!("mov {}, cr4", out(reg) cr4, options(nomem, nostack));
    }
    if cr4 & ((1 << 12) | (1 << 17)) != 0 {
        platform::fail("unsupported-paging-mode");
    }
    let mut tables = Tables {
        root: 0,
        frames: [0; MAX_TABLES],
        count: 0,
    };
    tables.root = unsafe { tables.table(allocator) };
    for address in (KERNEL_BASE..end).step_by(PAGE as usize) {
        let flags = if address < rodata {
            0
        } else if address < data {
            NX
        } else {
            WRITE | NX
        };
        unsafe { tables.map(allocator, address, address, flags) };
    }
    if info.mode >= elysia_boot_protocol::BootMode::UserCooperate as u32 {
        // Supervisor-only access to eligible RAM. Exclude firmware, MMIO and
        // kernel image pages, so no writable alias bypasses kernel RX protection.
        for physical in (0..elysia_memory::LIMIT).step_by(PAGE as usize) {
            if allocator.is_eligible(physical) {
                unsafe { tables.map(allocator, DIRECT + physical, physical, WRITE | NX) };
            }
        }
    }
    let scratch = allocator
        .allocate()
        .unwrap_or_else(|| platform::fail("scratch-exhaustion"));
    unsafe {
        ptr::write_bytes(scratch as *mut u8, 0, PAGE as usize);
        tables.map(allocator, scratch, scratch, WRITE | NX);
        tables.map(allocator, TEST_VIRTUAL, scratch, WRITE | NX);
    }
    // Mapping the page-table frames may itself need more tables. Close over that finite set.
    let mut index = 0;
    while index < tables.count {
        let address = tables.frames[index];
        unsafe { tables.map(allocator, address, address, WRITE | NX) };
        index += 1;
    }
    if old_root & ADDRESS == tables.root {
        platform::fail("firmware-root-reused");
    }
    let root = tables.root;
    unsafe { KERNEL_ROOT = root };
    let mut low: u32;
    let high: u32;
    unsafe {
        asm!("rdmsr", in("ecx") 0xc000_0080u32, out("eax") low, out("edx") high, options(nostack));
        low |= 1 << 11; // EFER.NXE
        asm!("wrmsr", in("ecx") 0xc000_0080u32, in("eax") low, in("edx") high, options(nostack));
        let mut cr0: u64;
        asm!("mov {}, cr0", out(reg) cr0, options(nomem, nostack));
        cr0 |= 1 << 16; // enforce read-only pages even at CPL0
        asm!("mov cr0, {}", in(reg) cr0, options(nostack));
        cr4 &= !(1 << 7); // clear PGE to invalidate any firmware global translations
        asm!("mov cr4, {}", in(reg) cr4, options(nostack));
        asm!("mov cr3, {}", in(reg) root, options(nostack));
    }
    let actual: u64;
    unsafe {
        asm!("mov {}, cr3", out(reg) actual, options(nomem, nostack));
    }
    if actual != root {
        platform::fail("cr3-switch");
    }
    platform::log(format_args!(
        "kernel:paging-active new-root={root:#x} tables={} wp=on nx=on",
        tables.count
    ));
    // A non-identity mapping proves translation through the new hierarchy, with RAM access.
    unsafe {
        (TEST_VIRTUAL as *mut u64).write_volatile(0x454c_5953_4941);
        if (scratch as *const u64).read_volatile() != 0x454c_5953_4941 {
            platform::fail("mapped-write");
        }
        ((scratch + PAGE - 8) as *mut u64).write_volatile(0x1234_5678);
        if ((TEST_VIRTUAL + PAGE - 8) as *const u64).read_volatile() != 0x1234_5678 {
            platform::fail("mapped-read");
        }
    }
    platform::log(format_args!("kernel:mapped-memory-verified"));
    // A RET instruction is a negative control: if NX fails, the fault test returns and fails.
    unsafe {
        ptr::addr_of_mut!(NX_PAGE.0)
            .cast::<u8>()
            .write_volatile(0xc3)
    };
    // Table and scratch frames remain owned. No free or remap while references survive.
}

/// Every process shares supervisor mappings of the kernel image and direct RAM.
pub fn kernel_layout() -> (u64, u64, u64) {
    (
        readonly_address(),
        ptr::addr_of!(data_start) as u64,
        ptr::addr_of!(kernel_end) as u64,
    )
}
pub unsafe fn enter_kernel_root() {
    unsafe {
        asm!("mov cr3, {}",in(reg) KERNEL_ROOT,options(nostack));
    }
}
pub unsafe fn direct_entry() -> u64 {
    unsafe { ((DIRECT + KERNEL_ROOT) as *const u64).add(1).read() }
}
