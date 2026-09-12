//! Two owned process slots with bounded syscalls, timer budgets and reclamation.
//! Only the kernel modifies process state, on one CPU with interrupts disabled.
use crate::{
    address_space::{Space, allocation_rollback},
    exceptions, memory, paging, platform, timer,
};
use core::{
    arch::{asm, global_asm},
    ptr,
};
pub use elysia_kernel::Frame;
use elysia_kernel::ipc::{Channel, EDEADLK, EMSGSIZE, EPIPE, MAX_MESSAGE};
use elysia_kernel::{
    CODE, DATA, EFAULT, EINVAL, ENOSYS, PAGE, PRIVATE, STACK, next_runnable, readable, returnable,
    user_flags, writable,
};
use elysia_memory::FrameAllocator;

static mut CHANNEL: Channel = Channel::EMPTY;
#[derive(Clone, Copy)]
struct PendingReceive {
    handle: u64,
    pointer: u64,
    capacity: usize,
}

static mut SPACES: [Option<Space>; 2] = [None, None];
static mut BASELINE: usize = 0;
static mut GENERATION: u64 = 0;
#[derive(Clone, Copy)]
struct Process {
    frame: Frame,
    root: u64,
    runnable: bool,
    yielded: bool,
    logs: u32,
    exit: Option<u32>,
    fault: Option<(u64, u64, u64)>,
    ticks: u64,
    budget_stopped: bool,
    waiting: Option<PendingReceive>,
}
static mut PROCESSES: [Process; 2] = [Process {
    frame: Frame::EMPTY,
    root: 0,
    runnable: false,
    yielded: false,
    logs: 0,
    exit: None,
    fault: None,
    ticks: 0,
    budget_stopped: false,
    waiting: None,
}; 2];
static mut CURRENT: usize = 0;
static mut MODE: u32 = 0;
static mut ACTIVE: bool = false;

global_asm!(
    include_str!("user_program.S"),
    include_str!("ipc_program.S")
);
unsafe extern "C" {
    static user_image_start: u8;
    static user_image_end: u8;
}

/// Called on the kernel root with interrupts disabled and no live processes.
unsafe fn prepare(
    allocator: &mut FrameAllocator,
    mode: u32,
    processes: &mut [Process; 2],
    spaces: &mut [Option<Space>; 2],
) {
    unsafe {
        MODE = mode;
        let start = ptr::addr_of!(user_image_start);
        let length = ptr::addr_of!(user_image_end) as usize - start as usize;
        if length > PAGE as usize {
            platform::fail("user-image-size");
        }
        if spaces.iter().any(Option::is_some) {
            platform::fail("spawn-over-live-space");
        }
        let handles = if mode >= 21 {
            (&mut *ptr::addr_of_mut!(CHANNEL))
                .start_pair()
                .unwrap_or_else(|_| platform::fail("ipc-start"))
        } else {
            [[0; 2]; 2]
        };
        for pid in 0..2 {
            let space = Space::create(allocator, pid, 32).unwrap_or_else(|e| platform::fail(e));
            let pages = (paging::DIRECT + space.pages[0]) as *mut u8;
            ptr::copy_nonoverlapping(start, pages, length);
            let root = space.root;
            spaces[pid] = Some(space);
            let process = &mut processes[pid];
            *process = Process {
                frame: Frame::EMPTY,
                root,
                runnable: true,
                yielded: false,
                logs: 0,
                exit: None,
                fault: None,
                ticks: 0,
                budget_stopped: false,
                waiting: None,
            };
            process.frame = Frame {
                rip: CODE,
                cs: 0x1b,
                ss: 0x23,
                rsp: STACK + PAGE,
                rflags: if preemptive(mode) { 0x202 } else { 2 },
                r12: pid as u64,
                r13: mode as u64,
                r14: GENERATION,
                r8: handles[pid][0],
                r9: handles[pid][1],
                r10: handles[1 - pid][0], // deliberately disclose peer token to test ownership checks
                ..Frame::EMPTY
            };
        }
        if processes[0].root == processes[1].root {
            platform::fail("shared-user-root");
        }
        platform::log(format_args!(
            "kernel:user-spaces-ready roots={:#x},{:#x}",
            processes[0].root, processes[1].root
        ));
    }
}

/// Drop to Ring 3 only after the protected kernel address space is active.
pub unsafe fn run(mode: u32) -> ! {
    unsafe {
        let allocator = memory::frames();
        BASELINE = allocator.free_count();
        if mode >= 18 {
            allocation_rollback(allocator);
        }
        prepare(
            allocator,
            mode,
            &mut *ptr::addr_of_mut!(PROCESSES),
            &mut *ptr::addr_of_mut!(SPACES),
        );
        // No floating-point/vector ABI yet: trap such instructions instead of
        // sharing firmware or process extended state. Kernel target uses soft-float.
        let mut cr0: u64;
        let mut cr4: u64;
        asm!("mov {}, cr0",out(reg) cr0,options(nomem,nostack));
        asm!("mov {}, cr4",out(reg) cr4,options(nomem,nostack));
        cr0 |= (1 << 2) | (1 << 3);
        cr4 &= !(1 << 16); // FSGSBASE not part of the initial ABI
        asm!("mov cr0, {}",in(reg) cr0,options(nostack));
        asm!("mov cr4, {}",in(reg) cr4,options(nostack));
        for msr in [0xc000_0100u32, 0xc000_0101, 0xc000_0102] {
            asm!("wrmsr",in("ecx") msr,in("eax") 0u32,in("edx") 0u32,options(nostack));
        }
        asm!("xor eax,eax","mov fs,ax","mov gs,ax","mov ax,0x23","mov ds,ax","mov es,ax",out("rax") _,options(nostack));
        if preemptive(mode) {
            timer::install();
        }
        ACTIVE = true;
        CURRENT = 0;
        let process = ptr::addr_of!(PROCESSES).cast::<Process>();
        asm!("mov cr3, {}",in(reg) (*process).root,options(nostack));
        platform::log(format_args!("kernel:user-enter pid=0 cpl=3"));
        exceptions::restore_user(ptr::addr_of!((*process).frame))
    }
}

/// Called only by the normalized trap entry with a supervisor-owned frame.
pub unsafe fn trap(frame: &mut Frame, address: u64) -> *const Frame {
    unsafe {
        if !ACTIVE || frame.cs != 0x1b {
            platform::fail("invalid-user-trap");
        }
        let current = CURRENT;
        let processes = &mut *ptr::addr_of_mut!(PROCESSES);
        if !processes[current].runnable {
            platform::fail("stopped-process-ran");
        }
        let root: u64;
        asm!("mov {}, cr3",out(reg) root,options(nomem,nostack));
        if root != processes[current].root {
            platform::fail("process-root-mismatch");
        }
        if frame.vector != 32 {
            platform::log(format_args!(
                "kernel:user-trap pid={current} vector={} cpl={}",
                frame.vector,
                frame.cs & 3
            ));
        }
        frame.rflags = user_flags(frame.rflags) | if preemptive(MODE) { 0x200 } else { 0 };
        if frame.vector == 32 {
            timer::acknowledge();
            if !preemptive(MODE) {
                platform::fail("unexpected-timer");
            }
            processes[current].ticks += 1;
            processes[current].frame = *frame;
            let ticks = processes[current].ticks;
            platform::log(format_args!("kernel:preempt pid={current} ticks={ticks}"));
            if !returnable(frame) {
                processes[current].fault = Some((128, frame.rsp, 0));
                processes[current].runnable = false;
            } else if ticks >= if MODE >= 21 || current != 0 { 64 } else { 8 } {
                processes[current].budget_stopped = true;
                processes[current].runnable = false;
                platform::log(format_args!(
                    "kernel:budget-stopped pid={current} ticks={ticks}"
                ));
            }
            return schedule(processes, current);
        }
        if frame.vector == 128 && !returnable(frame) {
            processes[current].fault = Some((128, frame.rsp, 0));
            processes[current].runnable = false;
            platform::log(format_args!(
                "kernel:user-stopped pid={current} vector=128 error=0x0 address={:#x}",
                frame.rsp
            ));
            return schedule(processes, current);
        }
        if frame.vector == 128 {
            match frame.rax {
                0 => {
                    if !readable(current, frame.rdi, frame.rsi) {
                        frame.rax = EFAULT;
                        platform::log(format_args!(
                            "kernel:syscall-rejected pid={current} reason=range"
                        ));
                    } else {
                        // Bounded copy before logging. Hex encoding prevents user
                        // bytes from forging kernel diagnostics in the host verdict.
                        let mut bytes = [0u8; 128];
                        ptr::copy_nonoverlapping(
                            frame.rdi as *const u8,
                            bytes.as_mut_ptr(),
                            frame.rsi as usize,
                        );
                        let mut encoded = [0u8; 256];
                        const HEX: &[u8; 16] = b"0123456789abcdef";
                        for (i, &b) in bytes[..frame.rsi as usize].iter().enumerate() {
                            encoded[2 * i] = HEX[(b >> 4) as usize];
                            encoded[2 * i + 1] = HEX[(b & 15) as usize];
                        }
                        let text =
                            core::str::from_utf8(&encoded[..frame.rsi as usize * 2]).unwrap();
                        platform::log(format_args!("user:log pid={current} hex={text}"));
                        processes[current].logs += 1;
                        frame.rax = frame.rsi;
                    }
                }
                1 => {
                    frame.rax = 0;
                    processes[current].yielded = true;
                    platform::log(format_args!("kernel:user-yield pid={current}"));
                    processes[current].frame = *frame;
                    return schedule(processes, current);
                }
                2 => {
                    let Ok(status) = u32::try_from(frame.rdi) else {
                        frame.rax = EINVAL;
                        platform::log(format_args!(
                            "kernel:syscall-rejected pid={current} reason=status"
                        ));
                        return frame;
                    };
                    processes[current].runnable = false;
                    processes[current].exit = Some(status);
                    platform::log(format_args!(
                        "kernel:user-exit pid={current} status={status}"
                    ));
                    return schedule(processes, current);
                }
                3..=5 if MODE >= 21 => {
                    return ipc_syscall(processes, current, frame);
                }
                _ => {
                    frame.rax = ENOSYS;
                    platform::log(format_args!(
                        "kernel:syscall-rejected pid={current} reason=number"
                    ));
                }
            }
            frame
        } else {
            // Contain synchronous user exceptions independently of the test
            // expectation. NMI, double fault and machine check are system failures.
            if frame.vector >= 32 || matches!(frame.vector, 2 | 8 | 18) {
                platform::fail("system-exception");
            }
            let address = if frame.vector == 14 { address } else { 0 };
            processes[current].fault = Some((frame.vector, address, frame.error));
            processes[current].runnable = false;
            platform::log(format_args!(
                "kernel:user-stopped pid={current} vector={} error={:#x} address={address:#x}",
                frame.vector, frame.error
            ));
            schedule(processes, current)
        }
    }
}

unsafe fn schedule(processes: &mut [Process; 2], current: usize) -> *const Frame {
    unsafe {
        // Leave the old CR3 before clearing a single leaf/table or returning frames.
        paging::enter_kernel_root();
        let spaces = &mut *ptr::addr_of_mut!(SPACES);
        for pid in 0..2 {
            if (processes[pid].exit.is_some()
                || processes[pid].fault.is_some()
                || processes[pid].budget_stopped)
                && let Some(space) = spaces[pid].take()
            {
                if MODE >= 21 {
                    (&mut *ptr::addr_of_mut!(CHANNEL)).close_process(pid);
                }
                space.release(memory::frames());
                processes[pid].root = 0;
                processes[pid].frame = Frame::EMPTY;
                platform::log(format_args!("kernel:reaped pid={pid}"));
            }
        }
        if MODE >= 21 {
            wake_receivers(processes);
        }
        let next = if let Some(next) =
            next_runnable(current, [processes[0].runnable, processes[1].runnable])
        {
            next
        } else {
            if processes.iter().any(|p| p.waiting.is_some()) {
                platform::fail("ipc-stalled");
            }
            let free = memory::frames().free_count();
            if free != BASELINE {
                platform::fail("process-resource-leak");
            }
            if MODE >= 21 {
                if !(&*ptr::addr_of!(CHANNEL)).is_clean() {
                    platform::fail("ipc-resource-leak");
                }
                verify_ipc(processes, MODE);
                platform::log(format_args!("kernel:ipc-clean free={free}"));
                let mode = MODE;
                platform::log(format_args!("kernel:ipc-tests-passed mode={mode}"));
                platform::exit(0x18);
            }
            if MODE >= 18 {
                verify_lifecycle(processes, MODE);
                let generation = GENERATION;
                platform::log(format_args!(
                    "kernel:generation-reclaimed generation={generation} free={free}"
                ));
                if MODE == 19 && GENERATION < 63 {
                    GENERATION += 1;
                    prepare(memory::frames(), MODE, processes, spaces);
                    CURRENT = 0;
                    asm!("mov cr3, {}",in(reg) processes[0].root,options(nostack));
                    return ptr::addr_of!(processes[0].frame);
                }
                let mode = MODE;
                platform::log(format_args!("kernel:lifecycle-tests-passed mode={mode}"));
                platform::exit(0x17);
            }
            verify_fixture(processes, MODE);
            let mode = MODE;
            platform::log(format_args!("kernel:user-tests-passed mode={mode}"));
            platform::exit(0x16);
        };
        CURRENT = next;
        // No mapping mutation or PCID: a CR3 reload invalidates non-global TLB entries.
        asm!("mov cr3, {}",in(reg) processes[next].root,options(nostack));
        platform::log(format_args!("kernel:user-switch from={current} to={next}"));
        ptr::addr_of!(processes[next].frame)
    }
}

/// Test verdict runs only after no processes remain runnable. It does not decide
/// how the scheduler handles faults or exits: an unexpected crash is contained
/// first, then causes this boot fixture to fail rather than masquerade as success.
fn verify_fixture(processes: &[Process; 2], mode: u32) {
    let expected_fault = match mode {
        7 => None,
        8 => Some((14, 0x0200_0000, 5)),
        9 => Some((14, PRIVATE + 2 * PAGE, 4)),
        10 => Some((14, CODE, 7)),
        11 => Some((14, DATA, 0x15)),
        12 => Some((6, 0, 0)),
        13 => Some((13, 0, 0)),
        14 => Some((14, 0x9000_0000 - 8, 6)),
        15 => Some((13, 0, 0x202)), // INT 0x40 cannot enter a DPL0 gate
        17 => Some((128, 0x0001_0000_0000_0000, 0)),
        16 => Some((7, 0, 0)), // extended register state is deliberately unavailable
        _ => platform::fail("unknown-user-fixture"),
    };
    if processes.iter().any(|p| !p.yielded || p.logs != 2)
        || processes[1].exit != Some(0)
        || processes[1].fault.is_some()
        || processes[0].fault != expected_fault
        || processes[0].exit
            != if expected_fault.is_none() {
                Some(0)
            } else {
                None
            }
    {
        platform::fail("user-fixture-verdict");
    }
}

fn preemptive(mode: u32) -> bool {
    matches!(mode, 18 | 20..=26)
}
fn verify_lifecycle(p: &[Process; 2], mode: u32) {
    let valid = if mode == 19 {
        p[0].exit == Some(0)
            && p[0].fault.is_none()
            && p[1].fault == Some((6, 0, 0))
            && p[1].exit.is_none()
    } else {
        p[0].budget_stopped
            && p[0].ticks == 8
            && p[0].exit.is_none()
            && p[0].fault.is_none()
            && p[1].exit == Some(0)
            && p[1].fault.is_none()
            && !p[1].budget_stopped
            && p[1].logs == 2
            && p[1].ticks > 0
    };
    if !valid {
        platform::fail("lifecycle-verdict");
    }
}

unsafe fn copy_message(
    process: &Process,
    pending: PendingReceive,
    message: &elysia_kernel::ipc::Message,
) {
    unsafe {
        let root: u64;
        asm!("mov {}, cr3",out(reg) root,options(nomem,nostack));
        asm!("mov cr3, {}",in(reg) process.root,options(nostack));
        ptr::copy_nonoverlapping(
            message.bytes.as_ptr(),
            pending.pointer as *mut u8,
            message.length,
        );
        asm!("mov cr3, {}",in(reg) root,options(nostack));
    }
}

/// Only blocked receivers are revisited. A pending operation owns no user pointer
/// reference; its mapping remains live, immutable and checked before the copy.
unsafe fn wake_receivers(processes: &mut [Process; 2]) {
    unsafe {
        let channel = &mut *ptr::addr_of_mut!(CHANNEL);
        for (pid, process) in processes.iter_mut().enumerate() {
            let Some(pending) = process.waiting else {
                continue;
            };
            let result = if !channel.is_open() {
                Err(EPIPE)
            } else if !writable(pid, pending.pointer, pending.capacity as u64) {
                Err(EFAULT)
            } else {
                channel.receive(pid, pending.handle, pending.capacity)
            };
            let value = match result {
                Ok(None) => continue,
                Ok(Some(message)) => {
                    copy_message(process, pending, &message);
                    message.length as u64
                }
                Err(error) => error,
            };
            process.frame.rax = value;
            process.waiting = None;
            process.runnable = true;
            platform::log(format_args!(
                "kernel:ipc-wake pid={pid} result={}",
                value as i64
            ));
        }
    }
}

unsafe fn ipc_syscall(processes: &mut [Process; 2], pid: usize, frame: &mut Frame) -> *const Frame {
    unsafe {
        let operation = frame.rax;
        let result = match operation {
            3 => {
                if frame.rdx > MAX_MESSAGE as u64 {
                    Err(EMSGSIZE)
                } else if !readable(pid, frame.rsi, frame.rdx) {
                    Err(EFAULT)
                } else {
                    let mut message = [0u8; MAX_MESSAGE];
                    ptr::copy_nonoverlapping(
                        frame.rsi as *const u8,
                        message.as_mut_ptr(),
                        frame.rdx as usize,
                    );
                    (&mut *ptr::addr_of_mut!(CHANNEL))
                        .send(pid, frame.rdi, &message[..frame.rdx as usize])
                        .map(|n| n as u64)
                }
            }
            4 => {
                if frame.rdx > MAX_MESSAGE as u64 {
                    Err(EMSGSIZE)
                } else if !writable(pid, frame.rsi, frame.rdx) {
                    Err(EFAULT)
                } else {
                    let pending = PendingReceive {
                        handle: frame.rdi,
                        pointer: frame.rsi,
                        capacity: frame.rdx as usize,
                    };
                    match (&mut *ptr::addr_of_mut!(CHANNEL)).receive(
                        pid,
                        frame.rdi,
                        pending.capacity,
                    ) {
                        Err(error) => Err(error),
                        Ok(Some(message)) => {
                            copy_message(&processes[pid], pending, &message);
                            Ok(message.length as u64)
                        }
                        Ok(None) => {
                            // With only two participants and no external producers, both
                            // waiting is an immediate deadlock. Leave this caller running.
                            if !processes[1 - pid].runnable {
                                Err(EDEADLK)
                            } else {
                                processes[pid].frame = *frame;
                                processes[pid].waiting = Some(pending);
                                processes[pid].runnable = false;
                                platform::log(format_args!("kernel:ipc-block pid={pid}"));
                                return schedule(processes, pid);
                            }
                        }
                    }
                }
            }
            5 => (&mut *ptr::addr_of_mut!(CHANNEL))
                .revoke(pid, frame.rdi)
                .map(|()| 0),
            _ => Err(ENOSYS),
        };
        frame.rax = result.unwrap_or_else(|error| error);
        platform::log(format_args!(
            "kernel:ipc-result pid={pid} op={operation} result={}",
            frame.rax as i64
        ));
        wake_receivers(processes);
        frame
    }
}

fn verify_ipc(p: &[Process; 2], mode: u32) {
    let peer_fault = if mode == 23 { Some((6, 0, 0)) } else { None };
    if p[0].exit != Some(0)
        || p[0].fault.is_some()
        || p[0].logs != 1
        || p[1].fault != peer_fault
        || p[1].exit != if mode == 23 { None } else { Some(0) }
        || p.iter().any(|p| p.waiting.is_some() || p.budget_stopped)
    {
        platform::fail("ipc-fixture-verdict");
    }
}
