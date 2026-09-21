//! Nonblocking trusted console. Poll a bounded UART batch at each timer tick.
use crate::{persistent, platform};
use core::{arch::asm, ptr};
use elysia_kernel::{
    approval::{Decision, Outcome, Session},
    operations::{Manager, Plan, State},
};
struct Pending {
    plan: Plan,
    session: Session,
}
static mut PENDING: Option<Pending> = None;
static mut WORK_SEEN: bool = false;
static mut TIMER_SEEN: bool = false;
fn input(port: u16) -> u8 {
    let v;
    unsafe {
        asm!("in al, dx",in("dx") port,out("al") v,options(nomem,nostack));
    }
    v
}
fn clear() {
    unsafe {
        asm!("out dx,al",in("dx") 0x3fau16,in("al") 0xc7u8,options(nomem,nostack));
    }
}
pub fn start(manager: &mut Manager) {
    let plan = manager.plan().unwrap();
    let now = manager.events().last().unwrap().unwrap().tick;
    let until = now
        .checked_add(500)
        .unwrap_or_else(|| platform::fail("approval-clock-overflow"))
        .min(plan.deadline);
    unsafe {
        let slot = &mut *ptr::addr_of_mut!(PENDING);
        if slot.is_some() {
            platform::fail("approval-already-pending");
        }
        *slot = Some(Pending {
            plan,
            session: Session::new(plan.id, until),
        });
    }
    clear();
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
        "kernel:operator-prompt async=1 timeout-ticks=500 until={until}"
    ));
}
pub fn progress(count: u64) {
    unsafe {
        if (*ptr::addr_of!(PENDING)).is_some() && !WORK_SEEN {
            WORK_SEEN = true;
            platform::log(format_args!("kernel:async-work pid=0 count={count}"));
        }
    }
}
pub fn poll(manager: &mut Manager, now: u64, current: usize) {
    unsafe {
        let slot = &mut *ptr::addr_of_mut!(PENDING);
        let Some(pending) = slot.as_mut() else { return };
        if manager.state() != State::Proposed {
            *slot = None;
            clear();
            return;
        }
        if current == 0 && !TIMER_SEEN {
            TIMER_SEEN = true;
            platform::log(format_args!("kernel:async-progress pid=0 tick={now}"));
        }
        let mut reason = None;
        let mut decision = None;
        if pending.session.poll(now, None) == Outcome::Timeout {
            reason = Some("timeout");
        } else {
            // Never monopolize the interrupt handler draining a noisy console.
            for _ in 0..16 {
                let status = input(0x3fd);
                if status & 0x1e != 0 {
                    reason = Some("serial-error");
                    break;
                }
                if status & 1 == 0 {
                    break;
                }
                match pending.session.poll(now, Some(input(0x3f8))) {
                    Outcome::Pending => continue,
                    Outcome::Decision(value) => {
                        decision = Some(value);
                        reason = Some("input");
                    }
                    _ => {
                        reason = Some("invalid");
                    }
                }
                break;
            }
        }
        let Some(reason) = reason else { return };
        let plan = pending.plan;
        *slot = None;
        clear();
        match decision {
            Some(value) => manager.approve(plan, value == Decision::Approve, now),
            None => manager.interrupt(now),
        }
        .unwrap_or_else(|_| platform::fail("async-decision-refused"));
        persistent::checkpoint(manager);
        platform::log(format_args!(
            "kernel:operator-decision reason={reason} state={:?} executions={}",
            manager.state(),
            manager.executions()
        ));
    }
}

/// Reaping must discard the console session even when no further timer runs.
pub fn cancel_if_finished(manager: &Manager) {
    unsafe {
        if manager.state() != State::Proposed {
            *ptr::addr_of_mut!(PENDING) = None;
            clear();
        }
    }
}
