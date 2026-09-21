//! Fail-closed journal adapter for the operation fixture. Recovery never launches a process.
use crate::{journal_disk as disk, platform};
use core::{arch::asm, ptr};
use elysia_kernel::{
    journal::{self, Index, SECTOR, SLOTS},
    operations::{Manager, State},
};
static mut INDEX: Index = Index::EMPTY;
static mut MODE: u32 = 0;
pub fn operator_enabled() -> bool {
    unsafe { MODE == 54 }
}
pub fn enabled() -> bool {
    unsafe { MODE != 0 }
}
fn rejected(reason: &str) -> ! {
    platform::log(format_args!("kernel:persist-rejected reason={reason}"));
    platform::exit(0x1b)
}
pub fn boot(mode: u32) {
    if let Err(reason) = disk::initialize() {
        rejected(reason);
    }
    let mut records = [[0; SECTOR]; SLOTS];
    for (i, b) in records.iter_mut().enumerate() {
        *b = disk::read(i as u32 + 1).unwrap_or_else(|e| rejected(e));
    }
    let index = journal::scan(&records).unwrap_or_else(|_| rejected("journal-corrupt"));
    if let Some(state) = index.recovered() {
        if index.count == SLOTS {
            let old = index.last.unwrap();
            if index.next(old.plan, State::Proposed, old.tick).is_ok() {
                platform::fail("journal-full-accepted");
            }
            platform::log(format_args!("kernel:persist-full refused-before-write"));
        }
        platform::log(format_args!(
            "kernel:persist-recovered state={state:?} records={} restored-authority=0 executions=0",
            index.count
        ));
        platform::exit(0x1b);
    }
    unsafe {
        INDEX = index;
        MODE = mode;
    }
    platform::log(format_args!("kernel:persist-empty"));
}
fn cut(state: State) -> ! {
    platform::log(format_args!("kernel:persist-cut state={state:?}"));
    loop {
        unsafe {
            asm!("cli", "hlt", options(nomem, nostack));
        }
    }
}
pub fn checkpoint(manager: &Manager) {
    // Called on the single CPU with interrupts disabled, only after the disk label was checked.
    let index = unsafe { &mut *ptr::addr_of_mut!(INDEX) };
    let event = manager
        .events()
        .last()
        .and_then(|e| *e)
        .unwrap_or_else(|| platform::fail("journal-no-event"));
    if event.state == State::Running && index.count + 2 > SLOTS {
        platform::fail("journal-full-before-execution");
    }
    let record = index
        .next(manager.plan().unwrap(), event.state, event.tick)
        .unwrap_or_else(|_| platform::fail("journal-append-refused"));
    let mut bytes = record.encode();
    let mode = unsafe { MODE };
    if mode == 53 && event.state == State::Approved {
        bytes[256..].fill(0);
        disk::write(index.count as u32 + 1, &bytes).unwrap_or_else(|e| platform::fail(e));
        cut(event.state);
    }
    disk::write(index.count as u32 + 1, &bytes).unwrap_or_else(|e| platform::fail(e));
    index
        .accept(&bytes)
        .unwrap_or_else(|_| platform::fail("journal-append-invalid"));
    platform::log(format_args!(
        "kernel:persist-flushed state={:?} sequence={}",
        event.state, index.count
    ));
    if (mode == 51 && event.state == State::Approved)
        || (mode == 52 && event.state == State::Running)
    {
        cut(event.state);
    }
}
