#![no_std]
//! CPU-independent contracts for the bounded process runtime.

pub mod documents;
pub mod ipc;
pub mod launch;
pub mod operations;
pub mod recovery;
pub mod user_elf;

pub const CODE: u64 = 0x4000_0000;
pub const DATA: u64 = 0x6000_0000;
pub const PRIVATE: u64 = 0x7000_0000;
pub const STACK: u64 = 0x8000_0000;
pub const PAGE: u64 = 4096;
pub const MAX_LOG: u64 = 128;
pub const EFAULT: u64 = (-14i64) as u64;
pub const EINVAL: u64 = (-22i64) as u64;
pub const ENOSYS: u64 = (-38i64) as u64;

/// Byte ranges must fit wholly inside a readable page belonging to the current
/// process. Live process mappings are immutable; kernel handlers run on one CPU with interrupts off,
/// so validation and copying cannot race with another address-space mutation.
pub fn readable(pid: usize, pointer: u64, length: u64) -> bool {
    if pid >= 2 || length > MAX_LOG {
        return false;
    }
    let Some(end) = pointer.checked_add(length) else {
        return false;
    };
    [CODE, DATA, PRIVATE + pid as u64 * 2 * PAGE, STACK]
        .into_iter()
        .any(|base| pointer >= base && pointer < base + PAGE && end <= base + PAGE)
}

/// Receive destinations must be writable data owned by this process, never code.
pub fn writable(pid: usize, pointer: u64, length: u64) -> bool {
    readable(pid, pointer, length) && !(CODE..CODE + PAGE).contains(&pointer)
}

/// Fixed executable and stack regions for this initial ABI. Validate before
/// IRET so a crafted RSP cannot trigger a fault while still in kernel mode.
pub fn returnable(frame: &Frame) -> bool {
    frame.cs == 0x1b
        && frame.ss == 0x23
        && (CODE..CODE + PAGE).contains(&frame.rip)
        && (STACK..=STACK + PAGE).contains(&frame.rsp)
}

pub fn user_flags(flags: u64) -> u64 {
    // Arithmetic flags and DF only. In particular NT, IOPL, VM, IF, AC and TF
    // are not part of the cooperative ABI. Bit 1 must always be set.
    (flags & 0xcd5) | 2
}

pub fn next_runnable(current: usize, runnable: [bool; 2]) -> Option<usize> {
    if current >= 2 {
        return None;
    }
    [(current + 1) % 2, current]
        .into_iter()
        .find(|&pid| runnable[pid])
}

/// Matches traps.S: fifteen GPRs, vector/error, then the five-word IRET frame.
#[derive(Clone, Copy, Default)]
#[repr(C)]
pub struct Frame {
    pub r15: u64,
    pub r14: u64,
    pub r13: u64,
    pub r12: u64,
    pub r11: u64,
    pub r10: u64,
    pub r9: u64,
    pub r8: u64,
    pub rdi: u64,
    pub rsi: u64,
    pub rbp: u64,
    pub rdx: u64,
    pub rcx: u64,
    pub rbx: u64,
    pub rax: u64,
    pub vector: u64,
    pub error: u64,
    pub rip: u64,
    pub cs: u64,
    pub rflags: u64,
    pub rsp: u64,
    pub ss: u64,
}
impl Frame {
    pub const EMPTY: Self = Self {
        r15: 0,
        r14: 0,
        r13: 0,
        r12: 0,
        r11: 0,
        r10: 0,
        r9: 0,
        r8: 0,
        rdi: 0,
        rsi: 0,
        rbp: 0,
        rdx: 0,
        rcx: 0,
        rbx: 0,
        rax: 0,
        vector: 0,
        error: 0,
        rip: 0,
        cs: 0,
        rflags: 0,
        rsp: 0,
        ss: 0,
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn receive_buffers_exclude_code_peer_pages_and_overflow() {
        assert!(writable(0, DATA, 64));
        assert!(writable(1, STACK + PAGE - 1, 1));
        assert!(!writable(0, CODE, 1));
        assert!(!writable(0, PRIVATE + 2 * PAGE, 1));
        assert!(!writable(0, DATA + PAGE - 1, 2));
        assert!(!writable(0, u64::MAX, 2));
    }
    #[test]
    fn accepts_only_owned_readable_ranges() {
        for pid in 0..2 {
            for base in [CODE, DATA, PRIVATE + pid as u64 * 2 * PAGE, STACK] {
                assert!(readable(pid, base, MAX_LOG));
                assert!(readable(pid, base + PAGE - 1, 1));
                assert!(!readable(pid, base + PAGE - 1, 2));
            }
            assert!(!readable(pid, PRIVATE + (1 - pid) as u64 * 2 * PAGE, 1));
        }
    }
    #[test]
    fn rejects_kernel_overflow_noncanonical_and_large_requests() {
        for (p, n) in [
            (0, 1),
            (0x2000000, 1),
            (u64::MAX, 2),
            (1 << 48, 1),
            (DATA, MAX_LOG + 1),
            (DATA + PAGE, 0),
        ] {
            assert!(!readable(0, p, n));
        }
        assert!(!readable(2, DATA, 1));
        assert!(readable(0, DATA, 0));
    }
    #[test]
    fn never_schedules_a_stopped_process() {
        for current in 0..2 {
            assert_eq!(next_runnable(current, [true, true]), Some(1 - current));
            assert_eq!(next_runnable(current, [true, false]), Some(0));
            assert_eq!(next_runnable(current, [false, true]), Some(1));
            assert_eq!(next_runnable(current, [false, false]), None);
        }
    }
    #[test]
    fn rejects_unsafe_iret_context_and_privileged_flags() {
        let mut frame = Frame {
            cs: 0x1b,
            ss: 0x23,
            rip: CODE,
            rsp: STACK + PAGE,
            ..Frame::EMPTY
        };
        assert!(returnable(&frame));
        for bad in [0, STACK - 1, STACK + PAGE + 1, u64::MAX, 1 << 48] {
            frame.rsp = bad;
            assert!(!returnable(&frame));
        }
        frame.rsp = STACK + PAGE;
        frame.rip = DATA;
        assert!(!returnable(&frame));
        assert_eq!(user_flags(u64::MAX), 0xcd7);
        assert_eq!(user_flags(0), 2);
        assert_eq!(user_flags(1 << 14), 2); // NT would make IRET fault at CPL0.
    }

    #[test]
    fn assembly_frame_offsets_are_stable() {
        assert_eq!(core::mem::size_of::<Frame>(), 22 * 8);
        assert_eq!(core::mem::offset_of!(Frame, rax), 14 * 8);
        assert_eq!(core::mem::offset_of!(Frame, vector), 15 * 8);
        assert_eq!(core::mem::offset_of!(Frame, rip), 17 * 8);
        assert_eq!(core::mem::offset_of!(Frame, cs), 18 * 8);
    }
}
