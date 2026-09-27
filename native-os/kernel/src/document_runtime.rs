//! Durable evidence for the current embedded classifier and one approved report.
use crate::{elf_loader, journal_disk as disk, operator, platform};
use core::ptr;
use elysia_kernel::{
    approval::Decision,
    document_job::{FIRST_LBA, Log, REPORT_LBA, Request, Results, SLOTS, Stage},
    journal::SECTOR,
};

const POLICY: &str = env!("ELYSIA_DOCUMENT_JOB");
static BINDING: &[u8] = include_bytes!(env!("ELYSIA_DOCUMENT_BINDING"));
static mut ACTIVE: Option<(Log, Results)> = None;
pub fn enabled() -> bool {
    POLICY != "off"
}
fn stop(reason: &str) -> ! {
    platform::log(format_args!(
        "kernel:document-job-stopped reason={reason} restored-authority=0"
    ));
    platform::exit(0x1f)
}
fn checked<T>(value: Result<T, &'static str>) -> T {
    value.unwrap_or_else(|reason| stop(reason))
}
fn append(log: Log, stage: Stage, results: Results) -> Log {
    let (next, bytes) = checked(log.next(stage, results));
    checked(disk::write_document(FIRST_LBA + log.count() as u32, &bytes));
    platform::log(format_args!(
        "kernel:document-job-flushed state={stage:?} sequence={} agent=2",
        next.count()
    ));
    next
}
fn recovered(log: Log) {
    platform::log(format_args!(
        "kernel:document-job-recovered state={:?} records={} restored-authority=0",
        log.stage().unwrap(),
        log.count()
    ));
    if log.stage() != Some(Stage::Started) {
        for row in log.results().rows() {
            platform::log(format_args!(
                "kernel:document-result id={} score={} class={} source=journal",
                row.id, row.score, row.class
            ));
        }
    }
}
fn offer_save(mut log: Log) -> ! {
    let id = log.request().approval_id();
    let candidates = log
        .results()
        .rows()
        .iter()
        .filter(|row| row.class == 0)
        .count();
    let (decision, reason) = operator::read_decision(
        id,
        format_args!(
            "kernel:document-save-prompt id={id} target=journal:17 candidates={candidates} timeout-ms=30000"
        ),
    );
    match decision {
        Some(Decision::Approve) => {
            log = append(log, Stage::SaveCommitted, log.results());
            if POLICY == "cut-save" {
                stop("cut-save");
            }
            checked(disk::write_document(REPORT_LBA, &checked(log.report())));
            if POLICY == "cut-report" {
                stop("cut-report");
            }
            log = append(log, Stage::Saved, log.results());
            platform::log(format_args!(
                "kernel:document-save-result state=Saved writes=1 records={} reason={reason}",
                log.count()
            ));
        }
        _ => {
            let stage = if decision == Some(Decision::Deny) {
                Stage::Denied
            } else {
                Stage::Interrupted
            };
            append(log, stage, log.results());
            platform::log(format_args!(
                "kernel:document-save-result state={stage:?} writes=0 reason={reason}"
            ));
        }
    }
    platform::exit(0x20)
}

/// Called after disk/operation-journal validation, before issuing any authority.
pub fn boot() {
    let request = checked(Request::new(elf_loader::DOCUMENT_PACKET, BINDING));
    for lba in 9..FIRST_LBA {
        if checked(disk::read(lba)) != [0; SECTOR] {
            stop("foreign-agent-journal");
        }
    }
    let mut sectors = [[0; SECTOR]; SLOTS];
    for (i, sector) in sectors.iter_mut().enumerate() {
        *sector = checked(disk::read(FIRST_LBA + i as u32));
    }
    let log = checked(Log::scan(
        request,
        &sectors,
        &checked(disk::read(REPORT_LBA)),
    ));
    match log.stage() {
        None => {
            let started = append(log, Stage::Started, Results::EMPTY);
            if POLICY == "cut-start" {
                stop("cut-start");
            }
            // SAFETY: bootstrap, sole CPU, interrupts disabled.
            unsafe {
                *ptr::addr_of_mut!(ACTIVE) = Some((started, Results::EMPTY));
            }
        }
        Some(stage) => {
            recovered(log);
            match stage {
                Stage::Started => stop("classification-unknown"),
                Stage::SaveCommitted => stop("save-unknown"),
                Stage::Completed if matches!(POLICY, "publish" | "cut-save" | "cut-report") => {
                    offer_save(log)
                }
                Stage::Completed => stop("already-completed"),
                Stage::Saved => stop("already-saved"),
                Stage::Denied | Stage::Interrupted => stop("save-closed"),
            }
        }
    }
}
pub fn collect(bytes: &[u8]) {
    // SAFETY: only mode87, pid0 syscall handling on the sole CPU with IRQs disabled.
    let active = unsafe { &mut *ptr::addr_of_mut!(ACTIVE) };
    let (log, results) = active.as_mut().unwrap_or_else(|| stop("job-not-started"));
    checked(results.push(log.request(), bytes));
}
/// Resource cleanup and normal exit are already checked by the scheduler.
pub fn complete() {
    let (log, results) =
        unsafe { (*ptr::addr_of!(ACTIVE)).unwrap_or_else(|| stop("job-not-started")) };
    let log = append(log, Stage::Completed, results);
    unsafe {
        *ptr::addr_of_mut!(ACTIVE) = None;
    }
    if POLICY == "cut-complete" {
        stop("cut-complete");
    }
    if matches!(POLICY, "publish" | "cut-save" | "cut-report") {
        offer_save(log);
    }
}
