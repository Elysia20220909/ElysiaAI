//! Single outstanding proposal, trusted COM1 input, no guest approval syscall.
use crate::{persistent, platform};
use core::arch::asm;
use elysia_kernel::{
    approval::{Decision, parse},
    operations::{Manager, State},
};
fn out(port: u16, value: u8) {
    unsafe {
        asm!("out dx, al", in("dx") port, in("al") value, options(nomem, nostack));
    }
}
fn input(port: u16) -> u8 {
    let value;
    unsafe {
        asm!("in al, dx", in("dx") port, out("al") value, options(nomem, nostack));
    }
    value
}
fn start_interval() {
    // PIT channel 2, mode 0, 59659 / 1193182 ~= 50 ms. Speaker stays disabled.
    out(0x61, input(0x61) & !3);
    out(0x43, 0xb0);
    out(0x42, 59659u16 as u8);
    out(0x42, (59659u16 >> 8) as u8);
    out(0x61, (input(0x61) & !2) | 1);
}
pub fn decide(manager: &mut Manager) {
    let plan = manager
        .plan()
        .unwrap_or_else(|| platform::fail("operator-no-plan"));
    let now = manager.events().last().unwrap().unwrap().tick;
    // Discard input buffered before the proposal. Never interpret it as consent.
    out(0x3fa, 0xc7);
    platform::log(format_args!(
        "kernel:operator-plan id={} caller={} executor={} version={} target={} offset={} length={} byte-budget={} deadline-tick={}",
        plan.id,
        plan.caller,
        plan.executor,
        plan.version,
        plan.target,
        plan.offset,
        plan.length,
        plan.byte_budget,
        plan.deadline
    ));
    platform::log(format_args!(
        "kernel:operator-prompt command=approve-ID-or-deny-ID timeout-ms=30000"
    ));
    let saved = input(0x61);
    let mut line = [0u8; 32];
    let mut length = 0;
    let mut decision = None;
    let mut reason = "timeout";
    'waiting: for _ in 0..600 {
        start_interval();
        for poll in 0..10_000_000 {
            if input(0x61) & 0x20 != 0 {
                break;
            }
            let status = input(0x3fd);
            if status & 0x1e != 0 {
                reason = "serial-error";
                break 'waiting;
            }
            if status & 1 != 0 {
                let byte = input(0x3f8);
                if byte == b'\n' || byte == b'\r' {
                    decision = parse(&line[..length], plan.id);
                    reason = if decision.is_some() {
                        "input"
                    } else {
                        "invalid"
                    };
                    break 'waiting;
                }
                if length == line.len() || !(0x20..=0x7e).contains(&byte) {
                    reason = "invalid";
                    break 'waiting;
                }
                line[length] = byte;
                length += 1;
            }
            if poll == 9_999_999 {
                reason = "timer-stalled";
                break 'waiting;
            }
            core::hint::spin_loop();
        }
    }
    out(0x61, saved & !3);
    // Drop trailing commands; this proposal accepts exactly one decision.
    out(0x3fa, 0xc7);
    match decision {
        Some(value) => manager.approve(plan, value == Decision::Approve, now),
        None => manager.interrupt(now),
    }
    .unwrap_or_else(|_| platform::fail("operator-decision-refused"));
    persistent::checkpoint(manager);
    platform::log(format_args!(
        "kernel:operator-decision reason={reason} state={:?} executions={}",
        manager.state(),
        manager.executions()
    ));
    if manager.state() != State::Approved {
        platform::exit(0x1c);
    }
}
