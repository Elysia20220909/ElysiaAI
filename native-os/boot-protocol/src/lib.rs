#![no_std]

pub mod elf;

pub const MAGIC: u64 = 0x454c_5953_4941_4f53;
pub const VERSION: u32 = 1;
pub const KERNEL_BASE: u64 = 0x0200_0000;
pub const KERNEL_LIMIT: u64 = KERNEL_BASE + 8 * 1024 * 1024;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum BootMode {
    Normal = 0,
    BadBootInfo = 1,
    InvalidOpcode = 2,
    StaleMapKey = 3,
    UnmappedPage = 4,
    ReadOnlyPage = 5,
    NoExecutePage = 6,
    UserCooperate = 7,
    UserKernel = 8,
    UserPeer = 9,
    UserReadonly = 10,
    UserNoExecute = 11,
    UserInvalidOpcode = 12,
    UserIo = 13,
    UserBadStack = 14,
    UserGate = 15,
    UserFpu = 16,
    UserBadReturn = 17,
    UserPreempt = 18,
    UserRecycle = 19,
    UserYieldSpin = 20,
    IpcEcho = 21,
    IpcPeerExit = 22,
    IpcPeerFault = 23,
    IpcRevoke = 24,
    IpcDeadlock = 25,
    IpcQueue = 26,
    DocumentRead = 27,
    DocumentDenied = 28,
    DocumentRevoke = 29,
    DocumentRange = 30,
    DocumentServiceExit = 31,
    DocumentServiceFault = 32,
    RecoveryFault = 33,
    RecoveryExit = 34,
    RecoveryBudget = 35,
    RecoveryRepeat = 36,
    RecoveryAllocation = 37,
    RecoveryLimit = 38,
    ElfRun = 39,
    ElfFault = 40,
    ElfReadonly = 41,
    ElfNoexecute = 42,
    ElfReject = 43,
    ElfRollback = 44,
}

impl BootMode {
    pub const fn from_raw(value: u32) -> Option<Self> {
        match value {
            0 => Some(Self::Normal),
            1 => Some(Self::BadBootInfo),
            2 => Some(Self::InvalidOpcode),
            3 => Some(Self::StaleMapKey),
            4 => Some(Self::UnmappedPage),
            5 => Some(Self::ReadOnlyPage),
            6 => Some(Self::NoExecutePage),
            7 => Some(Self::UserCooperate),
            8 => Some(Self::UserKernel),
            9 => Some(Self::UserPeer),
            10 => Some(Self::UserReadonly),
            11 => Some(Self::UserNoExecute),
            12 => Some(Self::UserInvalidOpcode),
            13 => Some(Self::UserIo),
            14 => Some(Self::UserBadStack),
            15 => Some(Self::UserGate),
            16 => Some(Self::UserFpu),
            17 => Some(Self::UserBadReturn),
            18 => Some(Self::UserPreempt),
            19 => Some(Self::UserRecycle),
            20 => Some(Self::UserYieldSpin),
            21 => Some(Self::IpcEcho),
            22 => Some(Self::IpcPeerExit),
            23 => Some(Self::IpcPeerFault),
            24 => Some(Self::IpcRevoke),
            25 => Some(Self::IpcDeadlock),
            26 => Some(Self::IpcQueue),
            27 => Some(Self::DocumentRead),
            28 => Some(Self::DocumentDenied),
            29 => Some(Self::DocumentRevoke),
            30 => Some(Self::DocumentRange),
            31 => Some(Self::DocumentServiceExit),
            32 => Some(Self::DocumentServiceFault),
            33 => Some(Self::RecoveryFault),
            34 => Some(Self::RecoveryExit),
            35 => Some(Self::RecoveryBudget),
            36 => Some(Self::RecoveryRepeat),
            37 => Some(Self::RecoveryAllocation),
            38 => Some(Self::RecoveryLimit),
            39 => Some(Self::ElfRun),
            40 => Some(Self::ElfFault),
            41 => Some(Self::ElfReadonly),
            42 => Some(Self::ElfNoexecute),
            43 => Some(Self::ElfReject),
            44 => Some(Self::ElfRollback),
            _ => None,
        }
    }
}

/// Versioned, identity-mapped handoff. All pointed-to storage survives the loader.
#[derive(Clone, Copy, Debug)]
#[repr(C)]
pub struct BootInfo {
    pub magic: u64,
    pub version: u32,
    pub size: u32,
    pub memory_map: u64,
    pub memory_map_size: u64,
    pub descriptor_size: u64,
    pub kernel_start: u64,
    pub kernel_end: u64,
    pub mode: u32,
    pub boot_services_exited: u32,
}

impl BootInfo {
    pub fn validate(&self) -> Result<(), &'static str> {
        if self.magic != MAGIC
            || self.version != VERSION
            || self.size as usize != core::mem::size_of::<Self>()
        {
            return Err("header");
        }
        if self.boot_services_exited != 1 {
            return Err("boot-services");
        }
        if self.memory_map == 0
            || !self.memory_map.is_multiple_of(8)
            || self.descriptor_size < 40
            || self.descriptor_size > 256
            || !self.descriptor_size.is_multiple_of(8)
            || self.memory_map_size == 0
            || self.memory_map_size > 32768
            || !self.memory_map_size.is_multiple_of(self.descriptor_size)
            || self.memory_map.checked_add(self.memory_map_size).is_none()
        {
            return Err("memory-map");
        }
        if self.kernel_start != KERNEL_BASE
            || self.kernel_end <= self.kernel_start
            || self.kernel_end > KERNEL_LIMIT
            || !self.kernel_end.is_multiple_of(4096)
        {
            return Err("kernel-range");
        }
        if BootMode::from_raw(self.mode).is_none() {
            return Err("mode");
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid() -> BootInfo {
        BootInfo {
            magic: MAGIC,
            version: VERSION,
            size: core::mem::size_of::<BootInfo>() as u32,
            memory_map: 0x1000,
            memory_map_size: 96,
            descriptor_size: 48,
            kernel_start: KERNEL_BASE,
            kernel_end: KERNEL_BASE + 4096,
            mode: 0,
            boot_services_exited: 1,
        }
    }

    #[test]
    fn accepts_valid_handoff() {
        assert_eq!(valid().validate(), Ok(()));
    }

    #[test]
    fn rejects_corrupted_handoff_header() {
        let mut info = valid();
        info.magic ^= 1;
        assert_eq!(info.validate(), Err("header"));
    }

    #[test]
    fn requires_completed_firmware_handoff() {
        let mut info = valid();
        info.boot_services_exited = 0;
        assert_eq!(info.validate(), Err("boot-services"));
    }

    #[test]
    fn rejects_incomplete_or_overflowing_map() {
        let mut info = valid();
        info.memory_map_size = 95;
        assert_eq!(info.validate(), Err("memory-map"));
        info = valid();
        info.memory_map = u64::MAX - 7;
        assert_eq!(info.validate(), Err("memory-map"));
    }

    #[test]
    fn rejects_unknown_mode_and_invalid_kernel_span() {
        let mut info = valid();
        info.mode = 99;
        assert_eq!(info.validate(), Err("mode"));
        info = valid();
        info.kernel_end = KERNEL_LIMIT + 4096;
        assert_eq!(info.validate(), Err("kernel-range"));
    }
}
