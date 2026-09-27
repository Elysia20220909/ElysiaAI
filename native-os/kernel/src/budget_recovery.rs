//! Explicit trusted boot fixture for one rejected Agent launch, never operation replay.
use crate::{elf_loader, journal_disk as disk, platform};
use core::ptr;
use elysia_kernel::{
    agent_budget::{FIRST_LBA, Log, Request, SLOTS, Stage},
    arena_budget::ValidatedBudget,
    journal::SECTOR,
};

static mut ACTIVE: Option<(Log, ValidatedBudget)> = None;
const POLICY: &str = env!("ELYSIA_BUDGET_RECOVERY");
pub fn enabled() -> bool {
    POLICY != "off"
}

fn stop(reason: &str) -> ! {
    platform::log(format_args!(
        "kernel:agent-budget-stopped reason={reason} restored-authority=0"
    ));
    platform::exit(0x1e)
}
fn checked<T>(value: Result<T, &'static str>) -> T {
    match value {
        Ok(v) => v,
        Err(reason) => stop(reason),
    }
}
fn append(log: Log) -> Log {
    let (next, bytes) = checked(log.next());
    checked(disk::write_agent(FIRST_LBA + log.count() as u32, &bytes));
    platform::log(format_args!(
        "kernel:agent-budget-flushed state={:?} sequence={} agent=1",
        next.stage().unwrap(),
        next.count()
    ));
    next
}

pub fn boot(mode: u32) -> ValidatedBudget {
    // Current embedded proposal and trusted ELF binding are checked on EVERY boot.
    // The journal only limits retries; it supplies neither executable nor permissions.
    let proposal = checked(elf_loader::arena_proposal(mode));
    let request = checked(Request::new(mode, *elf_loader::SIZED_ID, &proposal));
    checked(disk::initialize());
    // Do not issue a new launch while an operation journal awaits recovery.
    for lba in 1..=elysia_kernel::journal::SLOTS as u32 {
        if checked(disk::read(lba)).iter().any(|v| *v != 0) {
            stop("operation-journal-not-empty");
        }
    }
    let mut sectors = [[0; SECTOR]; SLOTS];
    for (i, sector) in sectors.iter_mut().enumerate() {
        *sector = checked(disk::read(FIRST_LBA + i as u32));
    }
    let mut log = checked(Log::scan(request, &sectors));
    match log.stage() {
        None => {
            platform::log(format_args!(
                "kernel:arena-budget-rejected reason=insufficient"
            ));
            platform::log(format_args!(
                "kernel:agent-budget-request mode={mode} requested={} required={} ceiling=16 retry-limit=1",
                proposal.requested(),
                proposal.required()
            ));
            append(log);
            stop("retry-pending");
        }
        Some(Stage::LaunchCommitted) => stop("launch-unknown"),
        Some(Stage::Completed) => stop("retry-exhausted"),
        Some(Stage::Rejected) => {
            log = append(log);
            if POLICY == "cut-replan" {
                stop("cut-replan");
            }
        }
        Some(Stage::Replanned) => {}
    }
    // The deterministic replanner grants only the known layout minimum. Existing
    // ReadAgent and launch validators continue to enforce all authority ceilings.
    let budget = proposal.replan();
    checked(budget.agent().launch());
    log = append(log); // reserve the sole attempt durably BEFORE issuing authority
    if POLICY == "cut-launch" {
        stop("cut-launch");
    }
    // SAFETY: bootstrap on the sole CPU, with interrupts disabled.
    unsafe {
        *ptr::addr_of_mut!(ACTIVE) = Some((log, budget));
    }
    platform::log(format_args!(
        "kernel:agent-budget-retry generation=1 pages={} authority=fresh approval=always",
        budget.pages()
    ));
    budget
}

pub fn active_budget() -> Option<ValidatedBudget> {
    // SAFETY: only the single CPU's boot/termination paths modify this state.
    unsafe { (*ptr::addr_of!(ACTIVE)).map(|(_, budget)| budget) }
}

/// Called only after successful process exit and full resource reclamation.
pub fn complete() {
    // SAFETY: termination runs on the kernel root with interrupts disabled.
    if let Some((log, _)) = unsafe { *ptr::addr_of!(ACTIVE) } {
        if log.stage() != Some(Stage::LaunchCommitted) {
            platform::fail("agent-budget-state");
        }
        append(log);
        unsafe {
            *ptr::addr_of_mut!(ACTIVE) = None;
        }
    }
}
