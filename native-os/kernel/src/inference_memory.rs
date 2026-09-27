//! The bounded, private RW/NX arena ABI. Quotas come only from trusted launch policy.
use crate::{EINVAL, MAX_LOG, PAGE, ipc::EACCES};

pub const BASE: u64 = 0x9000_0000;
pub const MAX_PAGES: usize = 16;
// Address-space construction reserves one leaf table beginning at BASE.
const _: () = assert!(BASE.is_multiple_of(512 * PAGE) && MAX_PAGES <= 512);

pub fn requested_pages(request: u64, limit: usize) -> Result<usize, u64> {
    if limit == 0 {
        return Err(EACCES);
    }
    if limit > MAX_PAGES || request > limit as u64 {
        return Err(EINVAL);
    }
    Ok(request as usize)
}

/// Only the live prefix is mapped. Keep existing syscall copy-size bounds.
pub fn contains(pages: usize, pointer: u64, length: u64) -> bool {
    if pages == 0 || pages > MAX_PAGES || length > MAX_LOG {
        return false;
    }
    let limit = BASE + pages as u64 * PAGE;
    pointer >= BASE
        && pointer < limit
        && pointer.checked_add(length).is_some_and(|end| end <= limit)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn authority_and_quota_are_checked_before_conversion_or_allocation() {
        for n in [0, 1, u64::MAX] {
            assert_eq!(requested_pages(n, 0), Err(EACCES));
        }
        assert_eq!(requested_pages(0, 16), Ok(0));
        assert_eq!(requested_pages(16, 16), Ok(16));
        for n in [4, 16, u64::MAX] {
            assert_eq!(requested_pages(n, 3), Err(EINVAL));
        }
        assert_eq!(requested_pages(1, MAX_PAGES + 1), Err(EINVAL));
    }

    #[test]
    fn copies_require_live_pages_even_across_a_page_boundary() {
        assert!(contains(2, BASE + PAGE - 32, 64));
        assert!(!contains(1, BASE + PAGE - 32, 64));
        assert!(contains(16, BASE + 16 * PAGE - 1, 1));
        for (pages, pointer, length) in [
            (0, BASE, 0),
            (17, BASE, 1),
            (1, BASE - 1, 1),
            (1, BASE + PAGE, 0),
            (16, u64::MAX, 2),
            (16, BASE, MAX_LOG + 1),
        ] {
            assert!(!contains(pages, pointer, length));
        }
    }
}
