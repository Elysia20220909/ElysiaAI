//! Bootstrap frame ownership. Firmware descriptors are consumed before CR3 changes.
use crate::platform;
use core::ptr;
use elysia_boot_protocol::BootInfo;
use elysia_memory::{FrameAllocator, LIMIT, PAGE, Range};

static mut FRAMES: FrameAllocator = FrameAllocator::EMPTY;

/// # Safety
/// One CPU, interrupts disabled, and the loader's validated memory map is still mapped.
/// No other mutable reference to FRAMES may exist.
pub unsafe fn initialize(info: &BootInfo, info_address: u64) -> &'static mut FrameAllocator {
    let reservations = [
        Range {
            start: info.kernel_start,
            end: info.kernel_end,
        },
        Range {
            start: info.memory_map,
            end: info.memory_map + info.memory_map_size,
        },
        Range {
            start: info_address,
            end: info_address + core::mem::size_of::<BootInfo>() as u64,
        },
    ];
    // SAFETY: the loader retains this bounded static buffer; no pointer escapes initialization.
    let map = unsafe {
        core::slice::from_raw_parts(info.memory_map as *const u8, info.memory_map_size as usize)
    };
    let frames = unsafe { &mut *ptr::addr_of_mut!(FRAMES) };
    frames
        .initialize(map, info.descriptor_size as usize, &reservations)
        .unwrap_or_else(|reason| platform::fail(reason));
    let available = frames.free_count();
    if available < 64 {
        platform::fail("insufficient-frames");
    }
    // Real firmware-map test: allocate every eligible frame before any mappings own them.
    let mut count = 0;
    while let Some(address) = frames.allocate() {
        let range = Range {
            start: address,
            end: address + PAGE,
        };
        if reservations.iter().any(|r| range.overlaps(*r)) {
            platform::fail("reserved-frame-allocated");
        }
        count += 1;
    }
    if count != available || frames.free_count() != 0 || frames.allocate().is_some() {
        platform::fail("frame-exhaustion");
    }
    for address in (0..LIMIT).step_by(PAGE as usize) {
        if frames.is_allocated(address) {
            frames
                .release(address)
                .unwrap_or_else(|r| platform::fail(r));
        }
    }
    let first = frames
        .allocate()
        .unwrap_or_else(|| platform::fail("frame-reuse"));
    frames.release(first).unwrap_or_else(|r| platform::fail(r));
    if frames.release(first) != Err("double-free")
        || frames.release(info.kernel_start) != Err("reserved-frame")
        || frames.free_count() != available
    {
        platform::fail("frame-release-guard");
    }
    platform::log(format_args!(
        "kernel:frames-verified available={available} exhaustion=ok reuse=ok reserved=ok"
    ));
    frames
}
