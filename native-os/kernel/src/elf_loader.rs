//! RAM executable bundle and bounded rejection/rollback boot fixtures.
use crate::{address_space::Space, platform};
use core::ptr;
use elysia_kernel::user_elf::{Image, MAX_IMAGE};
use elysia_memory::FrameAllocator;
pub static IMAGE: &[u8] = include_bytes!(env!("ELYSIA_USER_ELF"));
static mut CORRUPTED: [u8; MAX_IMAGE] = [0; MAX_IMAGE];
pub unsafe fn preflight(mode: u32, frames: &mut FrameAllocator) {
    unsafe {
        if mode == 43 {
            Image::parse(IMAGE).unwrap_or_else(|e| platform::fail(e));
            let buffer = &mut *ptr::addr_of_mut!(CORRUPTED);
            let table = u64::from_le_bytes(IMAGE[32..40].try_into().unwrap()) as usize;
            let baseline = frames.free_count();
            for (name, offset, value, width) in [
                ("header", 0, 0u64, 1),
                ("dynamic", 16, 3, 2),
                ("interpreter", table, 3, 4),
                ("permissions", table + 4, 7, 4),
                ("kernel-address", table + 16, 0x2000000, 8),
                ("overlap", table + 56 + 16, 0x40000000, 8),
                ("entry", 24, 0x60000000, 8),
                ("overflow", 32, u64::MAX, 8),
            ] {
                buffer[..IMAGE.len()].copy_from_slice(IMAGE);
                buffer[offset..offset + width].copy_from_slice(&value.to_le_bytes()[..width]);
                match Space::from_elf(frames, 0, &buffer[..IMAGE.len()], 32) {
                    Ok((space, _)) => {
                        space.release(frames);
                        platform::fail("elf-invalid-accepted");
                    }
                    Err(_) => {
                        if frames.free_count() != baseline {
                            platform::fail("elf-reject-leak");
                        }
                        platform::log(format_args!(
                            "kernel:elf-rejected reason={name} free={baseline}"
                        ));
                    }
                }
            }
            match Space::from_elf(frames, 0, &IMAGE[..63], 32) {
                Ok((space, _)) => {
                    space.release(frames);
                    platform::fail("elf-truncated-accepted");
                }
                Err(_) => {
                    if frames.free_count() != baseline {
                        platform::fail("elf-reject-leak");
                    }
                    platform::log(format_args!(
                        "kernel:elf-rejected reason=truncated free={baseline}"
                    ));
                }
            }
        }
        if mode == 44 {
            let baseline = frames.free_count();
            let (space, _) =
                Space::from_elf(frames, 0, IMAGE, 32).unwrap_or_else(|e| platform::fail(e));
            let count = space.frame_count();
            space.release(frames);
            for limit in 0..count {
                match Space::from_elf(frames, 0, IMAGE, limit) {
                    Ok((space, _)) => {
                        space.release(frames);
                        platform::fail("elf-rollback-accepted");
                    }
                    Err(_) => {
                        if frames.free_count() != baseline {
                            platform::fail("elf-rollback-leak");
                        }
                    }
                }
            }
            platform::log(format_args!(
                "kernel:elf-rollback boundaries={count} free={baseline}"
            ));
        }
    }
}
