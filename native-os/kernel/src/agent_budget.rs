//! Append-only evidence for one bounded launch retry. Records carry no authority.
//! A matching current trusted proposal is required when scanning persisted bytes.
use crate::{
    agent::READ_AGENT,
    arena_budget,
    journal::{SECTOR, crc as crc32},
};

pub const FIRST_LBA: u32 = 9;
pub const SLOTS: usize = 4;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Stage {
    Rejected,
    Replanned,
    LaunchCommitted,
    Completed,
}
const STAGES: [Stage; SLOTS] = [
    Stage::Rejected,
    Stage::Replanned,
    Stage::LaunchCommitted,
    Stage::Completed,
];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Request {
    mode: u32,
    elf: [u8; 32],
    requested: u16,
    required: u16,
}
impl Request {
    pub fn new(
        mode: u32,
        elf: [u8; 32],
        proposal: &arena_budget::Proposal,
    ) -> Result<Self, &'static str> {
        if proposal.validate().is_ok() || proposal.required() != arena_budget::required_pages(mode)?
        {
            return Err("retry-request");
        }
        Ok(Self {
            mode,
            elf,
            requested: proposal.requested(),
            required: proposal.required(),
        })
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Log {
    request: Request,
    count: usize,
    checksum: u32,
}
impl Log {
    pub fn empty(request: Request) -> Self {
        Self {
            request,
            count: 0,
            checksum: 0,
        }
    }
    pub fn count(&self) -> usize {
        self.count
    }
    pub fn stage(&self) -> Option<Stage> {
        self.count.checked_sub(1).map(|i| STAGES[i])
    }

    /// Returns a candidate index. Publish it only after a durable write and readback.
    pub fn next(&self) -> Result<(Self, [u8; SECTOR]), &'static str> {
        if self.count == SLOTS {
            return Err("retry-exhausted");
        }
        let mut bytes = [0; SECTOR];
        bytes[..8].copy_from_slice(b"ELYBUD01");
        bytes[8..16].copy_from_slice(&(self.count as u64 + 1).to_le_bytes());
        bytes[16..24].copy_from_slice(&READ_AGENT.agent_id.to_le_bytes());
        bytes[24..56].copy_from_slice(&READ_AGENT.goal_digest);
        bytes[56..88].copy_from_slice(&self.request.elf);
        bytes[88..92].copy_from_slice(&self.request.mode.to_le_bytes());
        bytes[92..94].copy_from_slice(&self.request.requested.to_le_bytes());
        bytes[94..96].copy_from_slice(&self.request.required.to_le_bytes());
        bytes[96..98].copy_from_slice(&READ_AGENT.memory_pages.to_le_bytes());
        bytes[100..104].copy_from_slice(&(self.count as u32 + 1).to_le_bytes());
        bytes[104..108].copy_from_slice(&self.checksum.to_le_bytes());
        bytes[108..116].copy_from_slice(&u64::from(READ_AGENT.cpu_ticks).to_le_bytes());
        // Generation 0 was rejected before launch; generation 1 is the sole retry.
        bytes[116..120].copy_from_slice(&u32::from(self.count != 0).to_le_bytes());
        let shape = arena_budget::SHAPES[(self.request.mode - 75) as usize];
        for (i, value) in shape.iter().enumerate() {
            bytes[120 + i * 2..122 + i * 2].copy_from_slice(&value.to_le_bytes());
        }
        bytes[128..130].copy_from_slice(&1u16.to_le_bytes()); // native arena pages
        bytes[130..132].copy_from_slice(&1u16.to_le_bytes()); // insufficient budget
        bytes[132..134].copy_from_slice(&1u16.to_le_bytes()); // packed layout version
        let checksum = crc32(&bytes[..508]);
        bytes[508..].copy_from_slice(&checksum.to_le_bytes());
        Ok((
            Self {
                count: self.count + 1,
                checksum,
                ..*self
            },
            bytes,
        ))
    }

    pub fn scan(request: Request, sectors: &[[u8; SECTOR]; SLOTS]) -> Result<Self, &'static str> {
        let mut log = Self::empty(request);
        let mut gap = false;
        for bytes in sectors {
            if bytes.iter().all(|v| *v == 0) {
                gap = true;
                continue;
            }
            if gap {
                return Err("agent-journal-corrupt");
            }
            let (next, expected) = log.next()?;
            // Canonical comparison checks the entire binding, padding, order and CRC chain.
            if *bytes != expected {
                return Err("agent-journal-corrupt");
            }
            log = next;
        }
        Ok(log)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request() -> Request {
        Request {
            mode: 75,
            elf: [7; 32],
            requested: 1,
            required: 2,
        }
    }
    fn sectors() -> [[u8; SECTOR]; SLOTS] {
        let mut log = Log::empty(request());
        let mut records = [[0; SECTOR]; SLOTS];
        for record in &mut records {
            (log, *record) = log.next().unwrap();
        }
        records
    }
    #[test]
    fn durable_prefixes_have_one_bounded_retry_and_never_encode_authority() {
        let all = sectors();
        for count in 0..=SLOTS {
            let mut records = [[0; SECTOR]; SLOTS];
            records[..count].copy_from_slice(&all[..count]);
            let log = Log::scan(request(), &records).unwrap();
            assert_eq!(log.count(), count);
            assert_eq!(log.stage(), count.checked_sub(1).map(|i| STAGES[i]));
        }
        assert_eq!(
            Log::scan(request(), &all).unwrap().next(),
            Err("retry-exhausted")
        );
    }
    #[test]
    fn corruption_gaps_order_and_stale_identity_are_rejected() {
        let all = sectors();
        for offset in 0..SECTOR {
            let mut records = all;
            records[0][offset] ^= 1;
            assert!(Log::scan(request(), &records).is_err());
        }
        for gap in 0..SLOTS - 1 {
            let mut records = all;
            records[gap] = [0; SECTOR];
            assert!(Log::scan(request(), &records).is_err());
        }
        let mut records = all;
        records.swap(0, 1);
        assert!(Log::scan(request(), &records).is_err());
        for changed in [
            Request {
                elf: [8; 32],
                ..request()
            },
            Request {
                mode: 76,
                ..request()
            },
            Request {
                required: 3,
                ..request()
            },
        ] {
            assert!(Log::scan(changed, &all).is_err());
        }
        // Even a recomputed CRC cannot substitute a different goal or quota.
        for offset in [24, 94, 96, 108, 116, 120, 128, 130, 132, 140] {
            let mut records = all;
            records[0][offset] ^= 1;
            let crc = crc32(&records[0][..508]);
            records[0][508..].copy_from_slice(&crc.to_le_bytes());
            assert!(Log::scan(request(), &records).is_err());
        }
    }
}
