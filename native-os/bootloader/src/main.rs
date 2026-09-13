#![no_std]
#![no_main]

#[path = "../../platform.rs"]
mod platform;

use core::{mem::size_of, panic::PanicInfo, ptr};
use elysia_boot_protocol::{BootInfo, BootMode, KERNEL_BASE, MAGIC, VERSION, elf};
use r_efi::efi;

static KERNEL: &[u8] = include_bytes!(env!("ELYSIA_KERNEL_PATH"));
static mut MAP: [u64; 4096] = [0; 4096];
static mut INFO: BootInfo = BootInfo {
    magic: MAGIC,
    version: VERSION,
    size: size_of::<BootInfo>() as u32,
    memory_map: 0,
    memory_map_size: 0,
    descriptor_size: 0,
    kernel_start: 0,
    kernel_end: 0,
    mode: 0,
    boot_services_exited: 0,
};

fn mode() -> BootMode {
    match option_env!("ELYSIA_BOOT_MODE").unwrap_or("normal") {
        "normal" => BootMode::Normal,
        "bad-boot-info" => BootMode::BadBootInfo,
        "invalid-opcode" => BootMode::InvalidOpcode,
        "stale-map-key" => BootMode::StaleMapKey,
        "unmapped-page" => BootMode::UnmappedPage,
        "readonly-page" => BootMode::ReadOnlyPage,
        "noexecute-page" => BootMode::NoExecutePage,
        "user-cooperate" => BootMode::UserCooperate,
        "user-kernel" => BootMode::UserKernel,
        "user-peer" => BootMode::UserPeer,
        "user-readonly" => BootMode::UserReadonly,
        "user-noexecute" => BootMode::UserNoExecute,
        "user-invalid-opcode" => BootMode::UserInvalidOpcode,
        "user-io" => BootMode::UserIo,
        "user-bad-stack" => BootMode::UserBadStack,
        "user-gate" => BootMode::UserGate,
        "user-fpu" => BootMode::UserFpu,
        "user-bad-return" => BootMode::UserBadReturn,
        "user-preempt" => BootMode::UserPreempt,
        "user-recycle" => BootMode::UserRecycle,
        "user-yield-spin" => BootMode::UserYieldSpin,
        "ipc-echo" => BootMode::IpcEcho,
        "ipc-peer-exit" => BootMode::IpcPeerExit,
        "ipc-peer-fault" => BootMode::IpcPeerFault,
        "ipc-revoke" => BootMode::IpcRevoke,
        "ipc-deadlock" => BootMode::IpcDeadlock,
        "ipc-queue" => BootMode::IpcQueue,
        "document-read" => BootMode::DocumentRead,
        "document-denied" => BootMode::DocumentDenied,
        "document-revoke" => BootMode::DocumentRevoke,
        "document-range" => BootMode::DocumentRange,
        "document-service-exit" => BootMode::DocumentServiceExit,
        "document-service-fault" => BootMode::DocumentServiceFault,
        "recovery-fault" => BootMode::RecoveryFault,
        "recovery-exit" => BootMode::RecoveryExit,
        "recovery-budget" => BootMode::RecoveryBudget,
        "recovery-repeat" => BootMode::RecoveryRepeat,
        "recovery-allocation" => BootMode::RecoveryAllocation,
        "recovery-limit" => BootMode::RecoveryLimit,
        _ => platform::fail("unknown-boot-mode"),
    }
}

#[unsafe(no_mangle)]
/// # Safety
/// UEFI firmware must provide a valid image handle and system table at CPL 0.
pub unsafe extern "efiapi" fn efi_main(
    handle: efi::Handle,
    table: *mut efi::SystemTable,
) -> efi::Status {
    platform::init_console();
    platform::log(format_args!("loader:entered"));
    if handle.is_null() || table.is_null() {
        platform::fail("firmware-arguments");
    }
    // SAFETY: firmware supplies the UEFI table; retained for boot only.
    let bs = unsafe { (*table).boot_services };
    if bs.is_null() {
        platform::fail("boot-services-pointer");
    }
    // SAFETY: the bounded loader owns all allocated memory and transfers control once.
    unsafe { boot(handle, bs) }
}

unsafe fn boot(handle: efi::Handle, bs: *mut efi::BootServices) -> ! {
    // Disable the firmware watchdog before any ExitBootServices attempt.
    let status = unsafe { ((*bs).set_watchdog_timer)(0, 0, 0, ptr::null_mut()) };
    if status != efi::Status::SUCCESS {
        platform::fail("watchdog");
    }
    let image = elf::parse(KERNEL).unwrap_or_else(|reason| platform::fail(reason));
    let mut address = KERNEL_BASE;
    let pages = ((image.end - KERNEL_BASE) / 4096) as usize;
    // SAFETY: AllocateAddress fails if our fixed span is not available. Never overwrite on failure.
    let status = unsafe {
        ((*bs).allocate_pages)(efi::ALLOCATE_ADDRESS, efi::LOADER_CODE, pages, &mut address)
    };
    if status != efi::Status::SUCCESS || address != KERNEL_BASE {
        platform::log(format_args!(
            "loader:allocation-status={:#x} address={address:#x} pages={pages}",
            status.as_usize()
        ));
        platform::fail("kernel-allocation");
    }
    // SAFETY: parse checked source bounds, destination span, disjoint segments, and entry point.
    unsafe {
        ptr::write_bytes(address as *mut u8, 0, pages * 4096);
        for segment in &image.segments[..image.count] {
            ptr::copy_nonoverlapping(
                KERNEL.as_ptr().add(segment.offset),
                segment.address as *mut u8,
                segment.file_size,
            );
        }
    }
    platform::log(format_args!("loader:kernel-loaded"));
    let mode = mode();
    let map = ptr::addr_of_mut!(MAP).cast::<efi::MemoryDescriptor>();
    for attempt in 0..3 {
        let mut map_size = size_of::<[u64; 4096]>();
        let mut key = 0;
        let mut descriptor_size = 0;
        let mut descriptor_version = 0;
        // SAFETY: aligned static map buffer; only memory-map and exit calls after an exit attempt.
        let status = unsafe {
            ((*bs).get_memory_map)(
                &mut map_size,
                map,
                &mut key,
                &mut descriptor_size,
                &mut descriptor_version,
            )
        };
        if status != efi::Status::SUCCESS {
            platform::fail("memory-map");
        }
        if descriptor_version != 1 || map_size > 32768 {
            platform::fail("map-format");
        }
        // Raw serial I/O does not allocate or call Boot Services.
        platform::log(format_args!("loader:exit-attempt={attempt}"));
        let supplied_key = if mode == BootMode::StaleMapKey && attempt == 0 {
            key.wrapping_add(1)
        } else {
            key
        };
        let status = unsafe { ((*bs).exit_boot_services)(handle, supplied_key) };
        if status == efi::Status::INVALID_PARAMETER {
            platform::log(format_args!("loader:map-key-rejected"));
            continue;
        }
        if status != efi::Status::SUCCESS {
            platform::fail("exit-boot-services");
        }
        // From here on there are no firmware service calls.
        unsafe {
            core::arch::asm!("cli", options(nomem, nostack));
            INFO = BootInfo {
                magic: if mode == BootMode::BadBootInfo {
                    MAGIC ^ 1
                } else {
                    MAGIC
                },
                version: VERSION,
                size: size_of::<BootInfo>() as u32,
                memory_map: map as u64,
                memory_map_size: map_size as u64,
                descriptor_size: descriptor_size as u64,
                kernel_start: KERNEL_BASE,
                kernel_end: image.end,
                mode: mode as u32,
                boot_services_exited: 1,
            };
        }
        platform::log(format_args!("loader:boot-services-exited"));
        // SAFETY: the validated executable ELF entry implements our documented SysV64 ABI.
        let entry: unsafe extern "sysv64" fn(*const BootInfo) -> ! =
            unsafe { core::mem::transmute(image.entry as usize) };
        unsafe { entry(ptr::addr_of!(INFO)) }
    }
    platform::fail("exit-retry-limit")
}

#[panic_handler]
fn panic(info: &PanicInfo<'_>) -> ! {
    platform::log(format_args!("loader:panic {info}"));
    platform::exit(0x7f)
}
