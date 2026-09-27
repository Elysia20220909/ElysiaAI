//! Validate a build-time budget proposal before issuing process authority.
//! The expected ELF digest is supplied separately by the trusted build runner.
use crate::agent::{MAX_AGENT_MEMORY_PAGES, READ_AGENT, ReadAgent};

pub const SHAPES: [[u16; 3]; 12] = [
    [1, 128, 8],
    [4, 128, 8],
    [1, 256, 16],
    [4, 256, 16],
    [1, 384, 24],
    [4, 384, 24],
    [2, 192, 12],
    [3, 320, 20],
    [2, 128, 8],
    [3, 256, 16],
    [2, 384, 24],
    [8, 384, 24],
];
const HEADER: usize = 48;
const ROW: usize = 16;
pub const SIZE: usize = HEADER + ROW * SHAPES.len();

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ValidatedBudget {
    pages: u16,
}
#[derive(Debug, PartialEq, Eq)]
pub struct Proposal {
    requested: u16,
    required: u16,
}
impl Proposal {
    pub fn requested(&self) -> u16 {
        self.requested
    }
    pub fn required(&self) -> u16 {
        self.required
    }
    pub fn validate(&self) -> Result<ValidatedBudget, &'static str> {
        if self.requested < self.required {
            return Err("insufficient");
        }
        Ok(ValidatedBudget {
            pages: self.requested,
        })
    }
    /// Deterministic layout calculation, bounded by the same trusted ceiling.
    /// Calling this creates no process, capability or operation approval.
    pub fn replan(&self) -> ValidatedBudget {
        ValidatedBudget {
            pages: self.required,
        }
    }
}
impl ValidatedBudget {
    pub fn pages(&self) -> u16 {
        self.pages
    }
    pub fn agent(self) -> ReadAgent {
        // All other authority, approval and CPU fields remain the trusted policy.
        ReadAgent::new(crate::agent::AgentManifest {
            memory_pages: self.pages,
            ..READ_AGENT
        })
        .expect("validated arena budget")
    }
}
fn u16_at(bytes: &[u8], offset: usize) -> u16 {
    u16::from_le_bytes([bytes[offset], bytes[offset + 1]])
}
fn u32_at(bytes: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes(bytes[offset..offset + 4].try_into().unwrap())
}
fn minimum_pages([batch, width, classes]: [u16; 3]) -> u16 {
    // Called only after exact comparison with the bounded trusted shape table.
    let (b, d, c) = (batch as u32, width as u32, classes as u32);
    let bytes = ((b * d + c * d) * 4).next_multiple_of(8) + b * c * 8;
    bytes.div_ceil(4096) as u16
}

pub fn required_pages(mode: u32) -> Result<u16, &'static str> {
    let index = mode.checked_sub(75).ok_or("mode")? as usize;
    SHAPES.get(index).copied().map(minimum_pages).ok_or("mode")
}

pub fn inspect(bytes: &[u8], expected_elf: &[u8; 32], mode: u32) -> Result<Proposal, &'static str> {
    let index = mode
        .checked_sub(75)
        .filter(|i| (*i as usize) < SHAPES.len())
        .ok_or("mode")? as usize;
    if bytes.len() != SIZE {
        return Err("length");
    }
    if &bytes[..4] != b"EAB1" || u16_at(bytes, 4) != 1 {
        return Err("version");
    }
    if u16_at(bytes, 6) != 1 {
        return Err("metric");
    } // native arena pages only
    if u32_at(bytes, 8) != SHAPES.len() as u32 || u32_at(bytes, 12) != 0 {
        return Err("header");
    }
    if &bytes[16..48] != expected_elf {
        return Err("elf");
    }
    let mut other_insufficient = false;
    for (i, expected_shape) in SHAPES.iter().enumerate() {
        let offset = HEADER + i * ROW;
        if u32_at(bytes, offset) != 75 + i as u32 || u32_at(bytes, offset + 12) != 0 {
            return Err("row");
        }
        let shape = [
            u16_at(bytes, offset + 4),
            u16_at(bytes, offset + 6),
            u16_at(bytes, offset + 8),
        ];
        if &shape != expected_shape {
            return Err("shape");
        }
        let pages = u16_at(bytes, offset + 10);
        if pages == 0 || pages > MAX_AGENT_MEMORY_PAGES {
            return Err("ceiling");
        }
        if i != index && pages < minimum_pages(shape) {
            other_insufficient = true;
        }
    }
    if other_insufficient {
        return Err("insufficient");
    }
    Ok(Proposal {
        requested: u16_at(bytes, HEADER + index * ROW + 10),
        required: minimum_pages(SHAPES[index]),
    })
}

pub fn validate(
    bytes: &[u8],
    expected_elf: &[u8; 32],
    mode: u32,
) -> Result<ValidatedBudget, &'static str> {
    inspect(bytes, expected_elf, mode)?.validate()
}

#[cfg(test)]
mod tests {
    use super::*;
    fn packet() -> [u8; SIZE] {
        let mut bytes = [0; SIZE];
        bytes[..4].copy_from_slice(b"EAB1");
        bytes[4] = 1;
        bytes[6] = 1;
        bytes[8] = 12;
        bytes[16..48].copy_from_slice(&[7; 32]);
        for (i, shape) in SHAPES.iter().enumerate() {
            let o = HEADER + i * ROW;
            bytes[o..o + 4].copy_from_slice(&(75 + i as u32).to_le_bytes());
            for (j, v) in shape.iter().enumerate() {
                bytes[o + 4 + j * 2..o + 6 + j * 2].copy_from_slice(&v.to_le_bytes());
            }
            bytes[o + 10..o + 12].copy_from_slice(&minimum_pages(*shape).to_le_bytes());
        }
        bytes
    }
    #[test]
    fn checked_budget_reaches_launch_without_changing_other_authority() {
        let bytes = packet();
        for (i, expected) in [2, 2, 5, 6, 10, 11, 3, 8, 2, 5, 10, 13].iter().enumerate() {
            let budget = validate(&bytes, &[7; 32], 75 + i as u32).unwrap();
            assert_eq!(budget.pages(), *expected);
            let launch = budget.agent().launch().unwrap();
            assert_eq!(
                launch,
                crate::launch::Definition {
                    memory_pages: *expected as usize,
                    ..crate::launch::INFERENCE_BOOT[0]
                }
            );
        }
    }
    #[test]
    fn invalid_packets_fail_before_creating_authority() {
        let bytes = packet();
        for n in 0..SIZE {
            assert_eq!(validate(&bytes[..n], &[7; 32], 75), Err("length"));
        }
        assert_eq!(validate(&bytes, &[8; 32], 75), Err("elf"));
        for mode in [0, 74, 87, u32::MAX] {
            assert_eq!(validate(&bytes, &[7; 32], mode), Err("mode"));
        }
        for (offset, value, reason) in [
            (4, 2, "version"),
            (6, 2, "metric"),
            (8, 11, "header"),
            (12, 1, "header"),
            (48, 76, "row"),
            (52, 2, "shape"),
            (58, 0, "ceiling"),
            (58, 17, "ceiling"),
            (58, 1, "insufficient"),
            (60, 1, "row"),
            (SIZE - 4, 1, "row"),
        ] {
            let mut bad = bytes;
            bad[offset] = value;
            assert_eq!(validate(&bad, &[7; 32], 75), Err(reason));
        }
    }
    #[test]
    fn repair_requires_the_entire_packet_and_the_selected_row_to_be_valid() {
        let mut bytes = packet();
        bytes[58] = 1;
        let proposal = inspect(&bytes, &[7; 32], 75).unwrap();
        assert_eq!(proposal.validate(), Err("insufficient"));
        assert_eq!((proposal.requested(), proposal.required()), (1, 2));
        let launch = proposal.replan().agent().launch().unwrap();
        assert_eq!(
            launch,
            crate::launch::Definition {
                memory_pages: 2,
                ..crate::launch::INFERENCE_BOOT[0]
            }
        );
        assert_eq!(inspect(&bytes, &[7; 32], 76), Err("insufficient"));
        bytes[SIZE - 4] = 1;
        assert_eq!(inspect(&bytes, &[7; 32], 75), Err("row"));
        bytes[SIZE - 4] = 0;
        bytes[SIZE - 6] = 17;
        assert_eq!(inspect(&bytes, &[7; 32], 75), Err("ceiling"));
    }
}
