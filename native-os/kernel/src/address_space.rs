//! Owned user frames and page tables. Shared supervisor mappings are never freed.
use crate::{paging, platform};
use core::{arch::asm, ptr};
use elysia_boot_protocol::KERNEL_BASE;
use elysia_kernel::{CODE, DATA, PRIVATE, STACK};
use elysia_memory::{FrameAllocator, PAGE};
const PRESENT: u64 = 1;
const WRITE: u64 = 2;
const USER: u64 = 4;
const NX: u64 = 1 << 63;
const ADDRESS: u64 = 0x000f_ffff_ffff_f000;
const CAPACITY: usize = 32;

pub struct Space {
    pub root: u64,
    pub pages: [u64; 4],
    owned: [u64; CAPACITY],
    count: usize,
}
impl Space {
    /// New mappings are not active until construction completes. On any allocation
    /// failure, discard every partially constructed table/page and restore counts.
    pub unsafe fn create(
        allocator: &mut FrameAllocator,
        pid: usize,
        limit: usize,
    ) -> Result<Self, &'static str> {
        let mut space = Self {
            root: 0,
            pages: [0; 4],
            owned: [0; CAPACITY],
            count: 0,
        };
        let result = unsafe { space.build(allocator, pid, limit) };
        if let Err(reason) = result {
            unsafe { space.release(allocator) };
            return Err(reason);
        }
        Ok(space)
    }
    unsafe fn allocate(
        &mut self,
        a: &mut FrameAllocator,
        limit: usize,
    ) -> Result<u64, &'static str> {
        if self.count >= CAPACITY || self.count >= limit {
            return Err("process-frame-limit");
        }
        let frame = a.allocate().ok_or("process-frame-exhaustion")?;
        self.owned[self.count] = frame;
        self.count += 1;
        unsafe { ptr::write_bytes((paging::DIRECT + frame) as *mut u8, 0, PAGE as usize) };
        Ok(frame)
    }
    unsafe fn map(
        &mut self,
        a: &mut FrameAllocator,
        va: u64,
        pa: u64,
        flags: u64,
        limit: usize,
    ) -> Result<(), &'static str> {
        let mut table = self.root;
        for shift in [39, 30, 21] {
            let entry = unsafe {
                ((paging::DIRECT + table) as *mut u64).add(((va >> shift) & 511) as usize)
            };
            let mut value = unsafe { entry.read() };
            if value == 0 {
                value = unsafe { self.allocate(a, limit) }? | PRESENT | WRITE;
            }
            if flags & USER != 0 {
                value |= USER;
            }
            unsafe { entry.write(value) };
            table = value & ADDRESS;
        }
        let entry =
            unsafe { ((paging::DIRECT + table) as *mut u64).add(((va >> 12) & 511) as usize) };
        if unsafe { entry.read() } != 0 {
            return Err("process-duplicate-page");
        }
        unsafe { entry.write(pa | flags | PRESENT) };
        Ok(())
    }
    unsafe fn build(
        &mut self,
        a: &mut FrameAllocator,
        pid: usize,
        limit: usize,
    ) -> Result<(), &'static str> {
        if pid >= 2 {
            return Err("process-slot");
        }
        self.root = unsafe { self.allocate(a, limit) }?;
        // PML4[1] is supervisor-only direct RAM; not part of this ownership list.
        unsafe {
            ((paging::DIRECT + self.root) as *mut u64)
                .add(1)
                .write(paging::direct_entry())
        };
        let (rodata, data, end) = paging::kernel_layout();
        for address in (KERNEL_BASE..end).step_by(PAGE as usize) {
            let flags = if address < rodata {
                0
            } else if address < data {
                NX
            } else {
                WRITE | NX
            };
            unsafe { self.map(a, address, address, flags, limit) }?;
        }
        for (index, va) in [CODE, DATA, PRIVATE + pid as u64 * 2 * PAGE, STACK]
            .into_iter()
            .enumerate()
        {
            let physical = unsafe { self.allocate(a, limit) }?;
            self.pages[index] = physical;
            unsafe {
                self.map(
                    a,
                    va,
                    physical,
                    USER | if index == 0 { 0 } else { WRITE | NX },
                    limit,
                )
            }?;
        }
        Ok(())
    }
    /// Caller has stopped the owner and left its CR3. The direct-map aliases are
    /// retained by the kernel, but all user translations are invalidated first.
    pub unsafe fn release(self, a: &mut FrameAllocator) {
        let active: u64;
        unsafe {
            asm!("mov {}, cr3",out(reg) active,options(nomem,nostack));
        }
        if self.root != 0 && active == self.root {
            platform::fail("release-active-root");
        }
        for &frame in &self.owned[..self.count] {
            unsafe { ptr::write_bytes((paging::DIRECT + frame) as *mut u8, 0, PAGE as usize) };
        }
        for &frame in &self.owned[..self.count] {
            a.release(frame).unwrap_or_else(|e| platform::fail(e));
        }
        // Confirm scrubbing without allocations between release and observation.
        for &frame in &self.owned[..self.count] {
            for offset in (0..PAGE).step_by(8) {
                if unsafe { ((paging::DIRECT + frame + offset) as *const u64).read_volatile() } != 0
                {
                    platform::fail("released-data-not-zero");
                }
            }
        }
    }
}

/// Exercise every partial-construction allocation boundary, not merely failure
/// before the first allocation. Only new inactive roots are involved.
pub unsafe fn allocation_rollback(a: &mut FrameAllocator) {
    let baseline = a.free_count();
    let complete = unsafe { Space::create(a, 0, CAPACITY) }.unwrap_or_else(|e| platform::fail(e));
    let count = complete.count;
    unsafe { complete.release(a) };
    for limit in 0..count {
        if unsafe { Space::create(a, 0, limit) }.is_ok() {
            platform::fail("allocation-injection-missed");
        }
        if a.free_count() != baseline {
            platform::fail("allocation-rollback-leak");
        }
    }
    platform::log(format_args!(
        "kernel:allocation-rollback boundaries={count} free={baseline}"
    ));
}
