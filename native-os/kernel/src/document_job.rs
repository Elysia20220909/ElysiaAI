//! One document job, append-only progress and a separately approved report save.
//! Disk records are evidence, never a source of process or tool authority.
use crate::{
    agent::DOCUMENT_CLASSIFIER,
    journal::{SECTOR, crc},
};

pub const FIRST_LBA: u32 = 13;
pub const SLOTS: usize = 4;
pub const REPORT_LBA: u32 = FIRST_LBA + SLOTS as u32;
pub const COUNT: usize = 8;
const RESULT_OFFSET: usize = 192;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u16)]
pub enum Stage {
    Started = 1,
    Completed = 2,
    SaveCommitted = 3,
    Saved = 4,
    Denied = 5,
    Interrupted = 6,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Request {
    model: [u8; 32],
    input: [u8; 32],
    packet: [u8; 32],
    elf: [u8; 32],
    ids: [u32; COUNT],
}
impl Request {
    pub fn new(packet: &[u8], binding: &[u8]) -> Result<Self, &'static str> {
        if packet.len() != 812
            || binding.len() != 64
            || &packet[..16] != b"ELYDOC01\x01\0\x40\0\x08\0\x44\0"
            || packet[16..48] != DOCUMENT_CLASSIFIER.goal_digest
        {
            return Err("job-request");
        }
        let model = packet[48..80].try_into().unwrap();
        let input = packet[80..112].try_into().unwrap();
        let packet_id = binding[..32].try_into().unwrap();
        let elf = binding[32..].try_into().unwrap();
        if [model, input, packet_id, elf].contains(&[0; 32]) {
            return Err("job-identity");
        }
        let mut ids = [0; COUNT];
        for (i, id) in ids.iter_mut().enumerate() {
            *id = u32::from_le_bytes(packet[264 + i * 68..268 + i * 68].try_into().unwrap());
        }
        if ids[0] == 0 || ids.windows(2).any(|pair| pair[0] >= pair[1]) {
            return Err("job-input");
        }
        Ok(Self {
            model,
            input,
            packet: packet_id,
            elf,
            ids,
        })
    }
    pub fn approval_id(self) -> u64 {
        // The trusted console is not a bearer-token authentication protocol.
        // Full identity is also checked against every canonical disk record.
        u64::from_le_bytes(self.packet[..8].try_into().unwrap()).max(1)
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct ResultRow {
    pub id: u32,
    pub score: i32,
    pub class: u8,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Results {
    rows: [ResultRow; COUNT],
    count: usize,
}
impl Results {
    pub const EMPTY: Self = Self {
        rows: [ResultRow {
            id: 0,
            score: 0,
            class: 0,
        }; COUNT],
        count: 0,
    };
    pub fn push(&mut self, request: Request, bytes: &[u8]) -> Result<(), &'static str> {
        if self.count == COUNT || bytes.len() != 32 || &bytes[..8] != b"DCLRES01" {
            return Err("job-result");
        }
        let id = u64::from_le_bytes(bytes[8..16].try_into().unwrap());
        let score = i64::from_le_bytes(bytes[16..24].try_into().unwrap());
        let class = u64::from_le_bytes(bytes[24..32].try_into().unwrap());
        if id != u64::from(request.ids[self.count])
            || !(-12_484_800..=12_484_800).contains(&score)
            || class
                != if score > 0 {
                    0
                } else if score < 0 {
                    1
                } else {
                    2
                }
        {
            return Err("job-result");
        }
        self.rows[self.count] = ResultRow {
            id: id as u32,
            score: score as i32,
            class: class as u8,
        };
        self.count += 1;
        Ok(())
    }
    pub fn rows(&self) -> &[ResultRow] {
        &self.rows[..self.count]
    }
    fn encode(&self, bytes: &mut [u8; SECTOR]) {
        bytes[188..192].copy_from_slice(&(self.count as u32).to_le_bytes());
        for (i, row) in self.rows().iter().enumerate() {
            let offset = RESULT_OFFSET + i * 16;
            bytes[offset..offset + 4].copy_from_slice(&row.id.to_le_bytes());
            bytes[offset + 4..offset + 8].copy_from_slice(&row.score.to_le_bytes());
            bytes[offset + 8] = row.class;
        }
    }
    fn decode(request: Request, bytes: &[u8; SECTOR]) -> Result<Self, &'static str> {
        let count = u32::from_le_bytes(bytes[188..192].try_into().unwrap()) as usize;
        if count != COUNT {
            return Err("job-results-incomplete");
        }
        let mut results = Self::EMPTY;
        for i in 0..COUNT {
            let offset = RESULT_OFFSET + i * 16;
            let mut message = [0; 32];
            message[..8].copy_from_slice(b"DCLRES01");
            message[8..12].copy_from_slice(&bytes[offset..offset + 4]);
            let score = i32::from_le_bytes(bytes[offset + 4..offset + 8].try_into().unwrap());
            message[16..24].copy_from_slice(&(score as i64).to_le_bytes());
            message[24] = bytes[offset + 8];
            results.push(request, &message)?;
        }
        Ok(results)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Log {
    request: Request,
    count: usize,
    stage: Option<Stage>,
    checksum: u32,
    results: Results,
}
impl Log {
    pub fn empty(request: Request) -> Self {
        Self {
            request,
            count: 0,
            stage: None,
            checksum: 0,
            results: Results::EMPTY,
        }
    }
    pub fn stage(self) -> Option<Stage> {
        self.stage
    }
    pub fn count(self) -> usize {
        self.count
    }
    pub fn results(self) -> Results {
        self.results
    }
    pub fn request(self) -> Request {
        self.request
    }
    fn bytes(self, stage: Stage, results: Results) -> [u8; SECTOR] {
        let mut bytes = [0; SECTOR];
        bytes[..8].copy_from_slice(b"ELYDJB01");
        bytes[8..10].copy_from_slice(&1u16.to_le_bytes());
        bytes[10..12].copy_from_slice(&(stage as u16).to_le_bytes());
        bytes[12..16].copy_from_slice(&(self.count as u32 + 1).to_le_bytes());
        bytes[16..24].copy_from_slice(&DOCUMENT_CLASSIFIER.agent_id.to_le_bytes());
        bytes[24..56].copy_from_slice(&DOCUMENT_CLASSIFIER.goal_digest);
        bytes[56..88].copy_from_slice(&self.request.model);
        bytes[88..120].copy_from_slice(&self.request.input);
        bytes[120..152].copy_from_slice(&self.request.packet);
        bytes[152..184].copy_from_slice(&self.request.elf);
        bytes[184..188].copy_from_slice(&self.checksum.to_le_bytes());
        results.encode(&mut bytes);
        bytes[320..322].copy_from_slice(&DOCUMENT_CLASSIFIER.memory_pages.to_le_bytes());
        bytes[324..328].copy_from_slice(&DOCUMENT_CLASSIFIER.cpu_ticks.to_le_bytes());
        let checksum = crc(&bytes[..508]);
        bytes[508..].copy_from_slice(&checksum.to_le_bytes());
        bytes
    }
    pub fn next(
        self,
        stage: Stage,
        results: Results,
    ) -> Result<(Self, [u8; SECTOR]), &'static str> {
        let allowed = matches!(
            (self.stage, stage),
            (None, Stage::Started)
                | (Some(Stage::Started), Stage::Completed)
                | (
                    Some(Stage::Completed),
                    Stage::SaveCommitted | Stage::Denied | Stage::Interrupted
                )
                | (Some(Stage::SaveCommitted), Stage::Saved)
        );
        if !allowed
            || self.count == SLOTS
            || (stage == Stage::Started && results != Results::EMPTY)
            || (stage != Stage::Started && results.count != COUNT)
            || (self.count >= 2 && results != self.results)
        {
            return Err("job-transition");
        }
        let bytes = self.bytes(stage, results);
        let next = Self {
            count: self.count + 1,
            stage: Some(stage),
            checksum: u32::from_le_bytes(bytes[508..].try_into().unwrap()),
            results,
            ..self
        };
        Ok((next, bytes))
    }
    pub fn scan(
        request: Request,
        sectors: &[[u8; SECTOR]; SLOTS],
        report: &[u8; SECTOR],
    ) -> Result<Self, &'static str> {
        let mut log = Self::empty(request);
        let mut gap = false;
        for bytes in sectors {
            if *bytes == [0; SECTOR] {
                gap = true;
                continue;
            }
            if gap {
                return Err("job-journal-corrupt");
            }
            let stage = match u16::from_le_bytes(bytes[10..12].try_into().unwrap()) {
                1 => Stage::Started,
                2 => Stage::Completed,
                3 => Stage::SaveCommitted,
                4 => Stage::Saved,
                5 => Stage::Denied,
                6 => Stage::Interrupted,
                _ => return Err("job-journal-corrupt"),
            };
            let results = if stage == Stage::Started {
                Results::EMPTY
            } else {
                Results::decode(request, bytes).map_err(|_| "job-journal-corrupt")?
            };
            let (next, expected) = log.next(stage, results)?;
            if *bytes != expected {
                return Err("job-journal-corrupt");
            }
            log = next;
        }
        match log.stage {
            Some(Stage::Saved) if *report != log.report()? => return Err("job-report-corrupt"),
            Some(Stage::SaveCommitted) => {} // result may have been written; never repeat it
            Some(Stage::Saved) => {}
            _ if *report != [0; SECTOR] => return Err("job-unapproved-report"),
            _ => {}
        }
        Ok(log)
    }
    pub fn report(self) -> Result<[u8; SECTOR], &'static str> {
        if !matches!(
            self.stage,
            Some(Stage::Completed | Stage::SaveCommitted | Stage::Saved)
        ) {
            return Err("job-report-state");
        }
        // Canonical report independent of journal position or transient approval.
        let mut bytes = Self::empty(self.request).bytes(Stage::Completed, self.results);
        bytes[..8].copy_from_slice(b"ELYDRP01");
        let checksum = crc(&bytes[..508]);
        bytes[508..].copy_from_slice(&checksum.to_le_bytes());
        Ok(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request() -> Request {
        Request {
            model: [1; 32],
            input: [2; 32],
            packet: [3; 32],
            elf: [4; 32],
            ids: [1, 2, 3, 4, 5, 6, 7, 8],
        }
    }
    fn results() -> Results {
        let mut rows = Results::EMPTY;
        for i in 1..=8u64 {
            let mut b = [0; 32];
            b[..8].copy_from_slice(b"DCLRES01");
            b[8..16].copy_from_slice(&i.to_le_bytes());
            b[24] = 2;
            rows.push(request(), &b).unwrap();
        }
        rows
    }
    #[test]
    fn completion_then_single_save_has_canonical_recovery() {
        let mut log = Log::empty(request());
        let mut records = [[0; SECTOR]; SLOTS];
        for (i, stage) in [
            Stage::Started,
            Stage::Completed,
            Stage::SaveCommitted,
            Stage::Saved,
        ]
        .into_iter()
        .enumerate()
        {
            (log, records[i]) = log
                .next(stage, if i == 0 { Results::EMPTY } else { results() })
                .unwrap();
            let report = if stage == Stage::Saved {
                log.report().unwrap()
            } else {
                [0; SECTOR]
            };
            assert_eq!(Log::scan(request(), &records, &report), Ok(log));
        }
        assert!(log.next(Stage::SaveCommitted, results()).is_err());
        assert!(Log::scan(request(), &records, &[0; SECTOR]).is_err());
    }
    #[test]
    fn incomplete_changed_duplicate_results_never_complete() {
        let (log, _) = Log::empty(request())
            .next(Stage::Started, Results::EMPTY)
            .unwrap();
        assert!(log.next(Stage::Completed, Results::EMPTY).is_err());
        let mut result = Results::EMPTY;
        let mut b = [0; 32];
        b[..8].copy_from_slice(b"DCLRES01");
        b[8] = 1;
        b[24] = 2;
        result.push(request(), &b).unwrap();
        assert!(result.push(request(), &b).is_err());
        b[8] = 2;
        b[16] = 1;
        assert!(result.push(request(), &b).is_err());
        b[24] = 0;
        result.push(request(), &b).unwrap();
    }
    #[test]
    fn corruption_gaps_other_identity_and_unapproved_report_fail_closed() {
        let mut records = [[0; SECTOR]; SLOTS];
        let (mut log, b) = Log::empty(request())
            .next(Stage::Started, Results::EMPTY)
            .unwrap();
        records[0] = b;
        (log, records[1]) = log.next(Stage::Completed, results()).unwrap();
        for i in 0..SECTOR {
            let mut bad = records;
            bad[1][i] ^= 1;
            assert!(Log::scan(request(), &bad, &[0; SECTOR]).is_err());
        }
        let mut bad = records;
        bad[0] = [0; SECTOR];
        assert!(Log::scan(request(), &bad, &[0; SECTOR]).is_err());
        for changed in [
            Request {
                model: [9; 32],
                ..request()
            },
            Request {
                input: [9; 32],
                ..request()
            },
            Request {
                packet: [9; 32],
                ..request()
            },
            Request {
                elf: [9; 32],
                ..request()
            },
        ] {
            assert!(Log::scan(changed, &records, &[0; SECTOR]).is_err());
        }
        assert!(Log::scan(request(), &records, &log.report().unwrap()).is_err());
        for stage in [Stage::Denied, Stage::Interrupted] {
            let (denied, b) = log.next(stage, results()).unwrap();
            let mut rows = records;
            rows[2] = b;
            assert_eq!(Log::scan(request(), &rows, &[0; SECTOR]), Ok(denied));
            assert!(denied.next(Stage::SaveCommitted, results()).is_err());
        }
    }
}
