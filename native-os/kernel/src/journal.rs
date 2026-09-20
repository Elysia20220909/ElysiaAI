//! Versioned, checksummed, append-only test journal. Decoding never restores authority.
use crate::operations::{Manager, Plan, State};
pub const SECTOR: usize = 512;
pub const SLOTS: usize = 8;
pub const DISK_SECTORS: u32 = 64;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Error {
    Corrupt,
    Full,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Record {
    pub sequence: u64,
    pub plan: Plan,
    pub state: State,
    pub tick: u64,
    pub previous: u32,
}
pub fn crc(bytes: &[u8]) -> u32 {
    let mut c = !0u32;
    for b in bytes {
        c ^= *b as u32;
        for _ in 0..8 {
            c = (c >> 1) ^ (0xedb88320u32 & (0u32.wrapping_sub(c & 1)));
        }
    }
    !c
}
pub fn header() -> [u8; SECTOR] {
    let mut b = [0; SECTOR];
    b[..8].copy_from_slice(b"ELYSJNL1");
    b[8..12].copy_from_slice(&DISK_SECTORS.to_le_bytes());
    b[12..16].copy_from_slice(&(SLOTS as u32).to_le_bytes());
    let c = crc(&b[..508]);
    b[508..].copy_from_slice(&c.to_le_bytes());
    b
}
impl Record {
    pub fn encode(self) -> [u8; SECTOR] {
        let mut b = [0; SECTOR];
        b[..8].copy_from_slice(b"ELYREC01");
        let p = self.plan;
        for (i, word) in [
            self.sequence,
            self.state as u64,
            self.tick,
            p.id,
            p.caller as u64,
            p.executor as u64,
            p.version as u64,
            p.target,
            p.offset,
            p.length,
            p.byte_budget,
            p.deadline,
        ]
        .into_iter()
        .enumerate()
        {
            b[8 + i * 8..16 + i * 8].copy_from_slice(&word.to_le_bytes());
        }
        b[104..108].copy_from_slice(&self.previous.to_le_bytes());
        let c = crc(&b[..508]);
        b[508..].copy_from_slice(&c.to_le_bytes());
        b
    }
    pub fn decode(b: &[u8; SECTOR]) -> Result<Self, Error> {
        if &b[..8] != b"ELYREC01"
            || b[108..508].iter().any(|b| *b != 0)
            || crc(&b[..508]) != u32::from_le_bytes(b[508..].try_into().unwrap())
        {
            return Err(Error::Corrupt);
        }
        let w = |i: usize| u64::from_le_bytes(b[8 + i * 8..16 + i * 8].try_into().unwrap());
        let state = match w(1) {
            1 => State::Proposed,
            2 => State::Approved,
            3 => State::Running,
            4 => State::Completed,
            5 => State::Denied,
            6 => State::Failed,
            7 => State::Interrupted,
            8 => State::Unknown,
            _ => return Err(Error::Corrupt),
        };
        let plan = Plan {
            id: w(3),
            caller: usize::try_from(w(4)).map_err(|_| Error::Corrupt)?,
            executor: usize::try_from(w(5)).map_err(|_| Error::Corrupt)?,
            version: u32::try_from(w(6)).map_err(|_| Error::Corrupt)?,
            target: w(7),
            offset: w(8),
            length: w(9),
            byte_budget: w(10),
            deadline: w(11),
        };
        let mut validation = Manager::EMPTY;
        validation
            .propose(plan.caller, plan, 0)
            .map_err(|_| Error::Corrupt)?;
        Ok(Self {
            sequence: w(0),
            plan,
            state,
            tick: w(2),
            previous: u32::from_le_bytes(b[104..108].try_into().unwrap()),
        })
    }
}
#[derive(Clone, Copy)]
pub struct Index {
    pub count: usize,
    pub last: Option<Record>,
    checksum: u32,
}
impl Index {
    pub const EMPTY: Self = Self {
        count: 0,
        last: None,
        checksum: 0,
    };
    pub fn next(&self, plan: Plan, state: State, tick: u64) -> Result<Record, Error> {
        if self.count == SLOTS {
            return Err(Error::Full);
        }
        let record = Record {
            sequence: self.count as u64 + 1,
            plan,
            state,
            tick,
            previous: self.checksum,
        };
        self.validate(record)?;
        Ok(record)
    }
    fn validate(&self, r: Record) -> Result<(), Error> {
        if r.sequence != self.count as u64 + 1 || r.previous != self.checksum {
            return Err(Error::Corrupt);
        }
        let allowed = match self.last {
            None => r.state == State::Proposed,
            Some(old) if old.plan.id != r.plan.id => {
                old.plan.id.checked_add(1) == Some(r.plan.id)
                    && matches!(
                        old.state,
                        State::Completed | State::Denied | State::Failed | State::Interrupted
                    )
                    && r.state == State::Proposed
            }
            Some(old) => {
                old.plan == r.plan
                    && r.tick >= old.tick
                    && matches!(
                        (old.state, r.state),
                        (
                            State::Proposed,
                            State::Approved | State::Denied | State::Interrupted
                        ) | (State::Approved, State::Running | State::Interrupted)
                            | (
                                State::Running,
                                State::Completed | State::Failed | State::Unknown
                            )
                    )
            }
        };
        if allowed { Ok(()) } else { Err(Error::Corrupt) }
    }
    pub fn accept(&mut self, bytes: &[u8; SECTOR]) -> Result<(), Error> {
        if self.count == SLOTS {
            return Err(Error::Full);
        }
        let r = Record::decode(bytes)?;
        self.validate(r)?;
        self.last = Some(r);
        self.count += 1;
        self.checksum = u32::from_le_bytes(bytes[508..].try_into().unwrap());
        Ok(())
    }
    pub fn recovered(&self) -> Option<State> {
        self.last.map(|r| match r.state {
            State::Proposed | State::Approved => State::Interrupted,
            State::Running => State::Unknown,
            other => other,
        })
    }
}
pub fn scan(sectors: &[[u8; SECTOR]; SLOTS]) -> Result<Index, Error> {
    let mut index = Index::EMPTY;
    let mut gap = false;
    for b in sectors {
        if b.iter().all(|b| *b == 0) {
            gap = true;
        } else {
            if gap {
                return Err(Error::Corrupt);
            }
            index.accept(b)?;
        }
    }
    Ok(index)
}
#[cfg(test)]
mod tests {
    use super::*;
    const PLAN: Plan = Plan {
        id: 1,
        caller: 0,
        executor: 1,
        version: 1,
        target: 256,
        offset: 0,
        length: 16,
        byte_budget: 16,
        deadline: 1024,
    };
    #[test]
    fn states_survive_without_reinstating_approval() {
        let mut index = Index::EMPTY;
        for (state, recovered) in [
            (State::Proposed, State::Interrupted),
            (State::Approved, State::Interrupted),
            (State::Running, State::Unknown),
            (State::Completed, State::Completed),
        ] {
            let bytes = index.next(PLAN, state, 1).unwrap().encode();
            index.accept(&bytes).unwrap();
            assert_eq!(index.recovered(), Some(recovered));
        }
        assert_eq!(index.next(PLAN, State::Running, 2), Err(Error::Corrupt));
    }
    #[test]
    fn torn_corrupt_reordered_and_changed_contract_records_fail_closed() {
        let mut sectors = [[0; SECTOR]; SLOTS];
        let mut index = Index::EMPTY;
        sectors[0] = index.next(PLAN, State::Proposed, 1).unwrap().encode();
        index.accept(&sectors[0]).unwrap();
        sectors[1] = index.next(PLAN, State::Approved, 2).unwrap().encode();
        assert!(scan(&sectors).is_ok());
        for offset in [0, 8, 16, 40, 88, 104, 200, 508] {
            let mut bad = sectors;
            bad[1][offset] ^= 1;
            assert!(scan(&bad).is_err());
        }
        let mut torn = sectors;
        torn[1][256..].fill(0);
        assert!(scan(&torn).is_err());
        let mut gap = sectors;
        gap.swap(1, 2);
        assert!(scan(&gap).is_err());
        let mut reordered = sectors;
        reordered.swap(0, 1);
        assert!(scan(&reordered).is_err());
        assert_eq!(
            index.next(Plan { length: 8, ..PLAN }, State::Approved, 2),
            Err(Error::Corrupt)
        );
    }
    #[test]
    fn full_journal_never_reuses_a_slot() {
        let mut index = Index::EMPTY;
        for id in 1..=2 {
            for state in [
                State::Proposed,
                State::Approved,
                State::Running,
                State::Completed,
            ] {
                let b = index.next(Plan { id, ..PLAN }, state, id).unwrap().encode();
                index.accept(&b).unwrap();
            }
        }
        assert_eq!(index.count, SLOTS);
        assert_eq!(
            index.next(Plan { id: 3, ..PLAN }, State::Proposed, 3),
            Err(Error::Full)
        );
    }
}
