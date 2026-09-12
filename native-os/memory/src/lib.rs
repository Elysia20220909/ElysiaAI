//! Bounded physical-frame bookkeeping. No raw pointers or hardware access.
#![no_std]

pub const PAGE: u64 = 4096;
pub const LIMIT: u64 = 256 * 1024 * 1024;
const WORDS: usize = (LIMIT / PAGE / 64) as usize;
const RUNTIME: u64 = 1 << 63;

#[derive(Clone, Copy, Debug)]
pub struct Range {
    pub start: u64,
    pub end: u64,
}
impl Range {
    pub fn overlaps(self, other: Self) -> bool {
        self.start < other.end && other.start < self.end
    }
}

#[derive(Clone, Copy)]
struct Region {
    range: Range,
    usable: bool,
}
fn region(bytes: &[u8]) -> Result<Region, &'static str> {
    let number = |offset| u64::from_le_bytes(bytes[offset..offset + 8].try_into().unwrap());
    let start = number(8);
    let size = number(24).checked_mul(PAGE).ok_or("map-overflow")?;
    let end = start.checked_add(size).ok_or("map-overflow")?;
    if size == 0 || !start.is_multiple_of(PAGE) {
        return Err("map-alignment");
    }
    let kind = u32::from_le_bytes(bytes[..4].try_into().unwrap());
    Ok(Region {
        range: Range { start, end },
        usable: kind == 7 && number(32) & RUNTIME == 0,
    })
}

/// Single-owner, single-CPU allocator metadata for the first 256 MiB.
/// Only EFI conventional memory is eligible; firmware/loader memory stays reserved.
pub struct FrameAllocator {
    eligible: [u64; WORDS],
    used: [u64; WORDS],
    cursor: usize,
    free: usize,
    initialized: bool,
}
impl FrameAllocator {
    pub const EMPTY: Self = Self {
        eligible: [0; WORDS],
        used: [0; WORDS],
        cursor: 0,
        free: 0,
        initialized: false,
    };

    /// Initialize once. An invalid first map leaves no frames available; reinitialization
    /// is rejected without changing existing ownership or counts.
    pub fn initialize(
        &mut self,
        map: &[u8],
        stride: usize,
        reserved: &[Range],
    ) -> Result<(), &'static str> {
        if self.initialized {
            return Err("already-initialized");
        }
        self.eligible.fill(0);
        self.used.fill(0);
        self.cursor = 0;
        self.free = 0;
        if !(40..=256).contains(&stride)
            || !stride.is_multiple_of(8)
            || map.is_empty()
            || map.len() > 32768
            || !map.len().is_multiple_of(stride)
        {
            return Err("map-size");
        }
        if reserved.iter().any(|r| r.start >= r.end) {
            return Err("reservation-range");
        }
        // Reject ambiguity, including overlaps involving reserved descriptors and addresses
        // outside our managed window. Do all validation before making any frame available.
        for (index, bytes) in map.chunks_exact(stride).enumerate() {
            let current = region(bytes)?;
            for previous in map[..index * stride].chunks_exact(stride) {
                if current.range.overlaps(region(previous)?.range) {
                    return Err("map-overlap");
                }
            }
        }
        for bytes in map.chunks_exact(stride) {
            let current = region(bytes)?;
            if !current.usable {
                continue;
            }
            let start = current.range.start.max(1024 * 1024);
            let end = current.range.end.min(LIMIT);
            for address in (start..end).step_by(PAGE as usize) {
                let frame = Range {
                    start: address,
                    end: address + PAGE,
                };
                if reserved.iter().any(|r| frame.overlaps(*r)) {
                    continue;
                }
                let index = (address / PAGE) as usize;
                self.eligible[index / 64] |= 1 << (index % 64);
                self.free += 1;
            }
        }
        self.initialized = true;
        Ok(())
    }

    pub fn free_count(&self) -> usize {
        self.free
    }

    pub fn allocate(&mut self) -> Option<u64> {
        if self.free == 0 {
            return None;
        }
        for offset in 0..WORDS {
            let word = (self.cursor + offset) % WORDS;
            let available = self.eligible[word] & !self.used[word];
            if available != 0 {
                let bit = available.trailing_zeros() as usize;
                self.used[word] |= 1 << bit;
                self.free -= 1;
                self.cursor = word;
                return Some(((word * 64 + bit) as u64) * PAGE);
            }
        }
        None
    }

    pub fn is_allocated(&self, address: u64) -> bool {
        if address >= LIMIT || !address.is_multiple_of(PAGE) {
            return false;
        }
        let index = (address / PAGE) as usize;
        self.used[index / 64] & (1 << (index % 64)) != 0
    }

    /// Caller owns the frame and must remove mappings/references before returning it.
    /// Detects reserved, out-of-range and double frees; not a generation-tagged capability.
    pub fn release(&mut self, address: u64) -> Result<(), &'static str> {
        if address >= LIMIT || !address.is_multiple_of(PAGE) {
            return Err("frame-address");
        }
        let index = (address / PAGE) as usize;
        let bit = 1 << (index % 64);
        if self.eligible[index / 64] & bit == 0 {
            return Err("reserved-frame");
        }
        if self.used[index / 64] & bit == 0 {
            return Err("double-free");
        }
        self.used[index / 64] &= !bit;
        self.cursor = self.cursor.min(index / 64);
        self.free += 1;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    extern crate std;
    use super::*;
    use std::vec::Vec;
    fn descriptor(kind: u32, start: u64, pages: u64, attrs: u64) -> [u8; 48] {
        let mut b = [0; 48];
        b[..4].copy_from_slice(&kind.to_le_bytes());
        b[8..16].copy_from_slice(&start.to_le_bytes());
        b[24..32].copy_from_slice(&pages.to_le_bytes());
        b[32..40].copy_from_slice(&attrs.to_le_bytes());
        b
    }
    #[test]
    fn excludes_firmware_runtime_low_memory_and_explicit_reservations() {
        let map: Vec<u8> = [
            descriptor(7, 0, 256, 0),
            descriptor(7, 0x100000, 4, 0),
            descriptor(1, 0x104000, 4, 0),
            descriptor(7, 0x108000, 4, RUNTIME),
        ]
        .into_iter()
        .flatten()
        .collect();
        let mut a = FrameAllocator::EMPTY;
        a.initialize(
            &map,
            48,
            &[Range {
                start: 0x101001,
                end: 0x102001,
            }],
        )
        .unwrap();
        assert_eq!(a.free_count(), 2);
        assert_eq!(a.allocate(), Some(0x100000));
        assert_eq!(a.allocate(), Some(0x103000));
        assert_eq!(a.allocate(), None);
        assert_eq!(a.release(0x104000), Err("reserved-frame"));
    }
    #[test]
    fn exhaustion_reuse_and_double_free_preserve_counts() {
        let mut a = FrameAllocator::EMPTY;
        a.initialize(&descriptor(7, 0x100000, 2, 0), 48, &[])
            .unwrap();
        let first = a.allocate().unwrap();
        let second = a.allocate().unwrap();
        assert_ne!(first, second);
        assert_eq!(a.allocate(), None);
        a.release(first).unwrap();
        assert_eq!(a.release(first), Err("double-free"));
        assert_eq!(a.free_count(), 1);
        assert_eq!(a.allocate(), Some(first));
        assert_eq!(a.free_count(), 0);
    }
    #[test]
    fn rejects_overlaps_before_exposing_any_frames() {
        let map: Vec<u8> = [descriptor(7, 0x100000, 8, 0), descriptor(0, 0x102000, 1, 0)]
            .into_iter()
            .flatten()
            .collect();
        let mut a = FrameAllocator::EMPTY;
        assert_eq!(a.initialize(&map, 48, &[]), Err("map-overlap"));
        assert_eq!(a.allocate(), None);
    }
    #[test]
    fn rejects_truncation_stride_overflow_and_alignment() {
        let mut a = FrameAllocator::EMPTY;
        assert!(a.initialize(&[0; 47], 48, &[]).is_err());
        assert!(a.initialize(&[0; 48], 0, &[]).is_err());
        assert!(
            a.initialize(&descriptor(7, u64::MAX - 4095, 2, 0), 48, &[])
                .is_err()
        );
        assert!(
            a.initialize(&descriptor(7, 0x100001, 1, 0), 48, &[])
                .is_err()
        );
        assert_eq!(a.free_count(), 0);
    }
    #[test]
    fn clips_window_and_rejects_invalid_free_without_mutation() {
        let mut a = FrameAllocator::EMPTY;
        a.initialize(&descriptor(7, LIMIT - PAGE, 2, 0), 48, &[])
            .unwrap();
        assert_eq!(a.allocate(), Some(LIMIT - PAGE));
        assert_eq!(a.release(LIMIT), Err("frame-address"));
        assert_eq!(a.release(LIMIT - 1), Err("frame-address"));
        assert_eq!(a.free_count(), 0);
    }

    #[test]
    fn reinitialization_cannot_discard_live_ownership() {
        let mut a = FrameAllocator::EMPTY;
        let map = descriptor(7, 0x100000, 2, 0);
        a.initialize(&map, 48, &[]).unwrap();
        let owned = a.allocate().unwrap();
        assert_eq!(a.initialize(&map, 48, &[]), Err("already-initialized"));
        assert!(a.is_allocated(owned));
        assert_eq!(a.free_count(), 1);
        assert_ne!(a.allocate().unwrap(), owned);
    }
}
