//! Owned user frames and page tables. Shared supervisor mappings are never freed.
use crate::{paging, platform};
use core::{arch::asm, ptr};
use elysia_boot_protocol::KERNEL_BASE;
use elysia_kernel::{CODE, DATA, PRIVATE, STACK, inference_memory as arena};
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
    frame_limit: usize,
    arena_limit: usize,
    arena_table: u64,
    arena_frames: [u64; arena::MAX_PAGES],
    arena_pages: usize,
}
impl Space {
    /// Parse before allocating; copy only validated file bytes into freshly zeroed pages.
    pub unsafe fn from_elf(
        a: &mut FrameAllocator,
        pid: usize,
        bytes: &[u8],
        limit: usize,
    ) -> Result<(Self, u64), &'static str> {
        unsafe { Self::from_elf_with_arena(a, pid, bytes, limit, 0) }
    }
    pub unsafe fn from_elf_with_arena(
        a: &mut FrameAllocator,
        pid: usize,
        bytes: &[u8],
        limit: usize,
        arena_limit: usize,
    ) -> Result<(Self, u64), &'static str> {
        let image = elysia_kernel::user_elf::Image::parse(bytes)?;
        let space = unsafe { Self::create_with_arena(a, pid, limit, arena_limit) }?;
        for slot in 0..2 {
            let data = image.bytes(slot);
            unsafe {
                ptr::copy_nonoverlapping(
                    data.as_ptr(),
                    (paging::DIRECT + space.pages[slot]) as *mut u8,
                    data.len(),
                );
            }
        }
        Ok((space, image.entry))
    }

    pub fn frame_count(&self) -> usize {
        self.count
    }
    /// New mappings are not active until construction completes. On any allocation
    /// failure, discard every partially constructed table/page and restore counts.
    pub unsafe fn create(
        allocator: &mut FrameAllocator,
        pid: usize,
        limit: usize,
    ) -> Result<Self, &'static str> {
        unsafe { Self::create_with_arena(allocator, pid, limit, 0) }
    }
    unsafe fn create_with_arena(
        allocator: &mut FrameAllocator,
        pid: usize,
        limit: usize,
        arena_limit: usize,
    ) -> Result<Self, &'static str> {
        if arena_limit > arena::MAX_PAGES {
            return Err("arena-limit");
        }
        let mut space = Self {
            root: 0,
            pages: [0; 4],
            owned: [0; CAPACITY],
            count: 0,
            frame_limit: limit.min(CAPACITY),
            arena_limit,
            arena_table: 0,
            arena_frames: [0; arena::MAX_PAGES],
            arena_pages: 0,
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
        let entry = unsafe { self.leaf(a, va, flags, limit) }?;
        if unsafe { entry.read() } != 0 {
            return Err("process-duplicate-page");
        }
        unsafe { entry.write(pa | flags | PRESENT) };
        Ok(())
    }
    unsafe fn leaf(
        &mut self,
        a: &mut FrameAllocator,
        va: u64,
        flags: u64,
        limit: usize,
    ) -> Result<*mut u64, &'static str> {
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
        Ok(entry)
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
        if self.arena_limit != 0 {
            // One preallocated leaf table covers the entire bounded arena. Its
            // cost counts toward the same total frame quota even when empty.
            let leaf = unsafe { self.leaf(a, arena::BASE, USER, limit) }?;
            self.arena_table = leaf as u64;
        }
        Ok(())
    }

    pub fn arena_limit(&self) -> usize {
        self.arena_limit
    }
    pub fn arena_pages(&self) -> usize {
        self.arena_pages
    }
    pub fn arena_contains(&self, pointer: u64, length: u64) -> bool {
        arena::contains(self.arena_pages, pointer, length)
    }
    /// The owner is paused on the kernel CR3, with interrupts disabled. Switching
    /// CR3 flushes its non-global translations before any physical frame is freed.
    pub unsafe fn resize_arena(
        &mut self,
        a: &mut FrameAllocator,
        request: u64,
    ) -> Result<u64, u64> {
        let pages = arena::requested_pages(request, self.arena_limit)?;
        unsafe { self.resize_arena_to(a, pages, self.frame_limit) }
            .map_err(|_| elysia_kernel::recovery::ENOMEM)?;
        Ok(if pages == 0 { 0 } else { arena::BASE })
    }
    unsafe fn resize_arena_to(
        &mut self,
        a: &mut FrameAllocator,
        pages: usize,
        frame_limit: usize,
    ) -> Result<(), &'static str> {
        let active: u64;
        unsafe {
            asm!("mov {}, cr3",out(reg) active,options(nomem,nostack));
        }
        if active == self.root || self.arena_table == 0 || pages > self.arena_limit {
            return Err("arena-context");
        }
        let leaves = self.arena_table as *mut u64;
        if pages > self.arena_pages {
            let count = self.count;
            let mut fresh = [0u64; arena::MAX_PAGES];
            for slot in &mut fresh[self.arena_pages..pages] {
                match unsafe { self.allocate(a, frame_limit.min(self.frame_limit)) } {
                    Ok(frame) => *slot = frame,
                    Err(reason) => {
                        // No new leaf has been published yet. Existing contents,
                        // mappings, and accounting survive every partial failure.
                        while self.count > count {
                            unsafe { self.free_owned(a, self.owned[self.count - 1]) };
                        }
                        return Err(reason);
                    }
                }
            }
            for (i, &physical) in fresh.iter().enumerate().take(pages).skip(self.arena_pages) {
                if unsafe { leaves.add(i).read() } != 0 {
                    platform::fail("arena-leaf-present");
                }
                self.arena_frames[i] = physical;
                unsafe { leaves.add(i).write(physical | PRESENT | USER | WRITE | NX) };
            }
        } else {
            for i in pages..self.arena_pages {
                unsafe { leaves.add(i).write(0) };
                unsafe { self.free_owned(a, self.arena_frames[i]) };
                self.arena_frames[i] = 0;
            }
        }
        self.arena_pages = pages;
        Ok(())
    }
    unsafe fn free_owned(&mut self, a: &mut FrameAllocator, physical: u64) {
        let index = self.owned[..self.count]
            .iter()
            .position(|&p| p == physical)
            .unwrap_or_else(|| platform::fail("arena-frame-not-owned"));
        unsafe { ptr::write_bytes((paging::DIRECT + physical) as *mut u8, 0, PAGE as usize) };
        a.release(physical).unwrap_or_else(|e| platform::fail(e));
        self.count -= 1;
        self.owned[index] = self.owned[self.count];
        self.owned[self.count] = 0;
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

/// Verify every failed growth prefix on an unpublished space, including failure
/// with an existing live page. Reduced frame budgets inject allocator failures.
pub unsafe fn arena_rollback(a: &mut FrameAllocator) {
    unsafe {
        let baseline = a.free_count();
        let complete = Space::create_with_arena(a, 0, CAPACITY, arena::MAX_PAGES)
            .unwrap_or_else(|e| platform::fail(e));
        let construction = complete.count;
        complete.release(a);
        for limit in 0..construction {
            if Space::create_with_arena(a, 0, limit, arena::MAX_PAGES).is_ok()
                || a.free_count() != baseline
            {
                platform::fail("arena-construction-rollback");
            }
        }
        platform::log(format_args!(
            "kernel:arena-construction-rollback boundaries={construction} free={baseline}"
        ));
        let mut space = Space::create_with_arena(a, 0, CAPACITY, arena::MAX_PAGES)
            .unwrap_or_else(|e| platform::fail(e));
        space
            .resize_arena(a, 1)
            .unwrap_or_else(|_| platform::fail("arena-probe-start"));
        let first = space.arena_frames[0];
        let byte = (paging::DIRECT + first) as *mut u8;
        byte.write_volatile(0x5a);
        let free = a.free_count();
        let count = space.count;
        for partial in 0..arena::MAX_PAGES - 1 {
            if space
                .resize_arena_to(a, arena::MAX_PAGES, count + partial)
                .is_ok()
                || a.free_count() != free
                || space.count != count
                || space.arena_pages != 1
                || space.arena_frames[0] != first
                || byte.read_volatile() != 0x5a
            {
                platform::fail("arena-rollback-changed");
            }
            let leaves = space.arena_table as *const u64;
            if leaves.read() != (first | PRESENT | USER | WRITE | NX)
                || (1..arena::MAX_PAGES).any(|i| leaves.add(i).read() != 0)
            {
                platform::fail("arena-rollback-mapping");
            }
        }
        space
            .resize_arena(a, arena::MAX_PAGES as u64)
            .unwrap_or_else(|_| platform::fail("arena-probe-grow"));
        space.release(a);
        if a.free_count() != baseline {
            platform::fail("arena-rollback-leak");
        }
        platform::log(format_args!(
            "kernel:arena-rollback boundaries=15 free={baseline}"
        ));
    }
}
