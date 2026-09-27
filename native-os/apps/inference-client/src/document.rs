//! Integer nearest-centroid inference over host-extracted, bounded document features.
//! Labels and document paths are deliberately absent from this wire format.
use crate::checksum;
pub const FEATURES: usize = 64;
pub const COUNT: usize = 8;
pub const ROWS: usize = 264;
pub const ROW_SIZE: usize = 68;
pub const SIZE: usize = ROWS + COUNT * ROW_SIZE + 4;
pub const GOAL: &[u8; 32] = b"elysia:document-classifier:v0001";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u64)]
pub enum Error {
    Format = 1,
    Checksum = 2,
    Goal = 3,
    Weights = 4,
    Input = 5,
    Identity = 6,
}

fn half(bytes: &[u8], offset: usize) -> u16 {
    u16::from_le_bytes([bytes[offset], bytes[offset + 1]])
}
fn word(bytes: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes(bytes[offset..offset + 4].try_into().unwrap())
}

pub struct Batch<'a> {
    bytes: &'a [u8],
}
impl<'a> Batch<'a> {
    pub fn decode(bytes: &'a [u8]) -> Result<Self, Error> {
        if bytes.len() != SIZE
            || &bytes[..8] != b"ELYDOC01"
            || half(bytes, 8) != 1
            || half(bytes, 10) != FEATURES as u16
            || half(bytes, 12) != COUNT as u16
            || half(bytes, 14) != ROW_SIZE as u16
            || bytes[112..128] != [0; 16]
            || bytes[260..264] != [0; 4]
        {
            return Err(Error::Format);
        }
        if checksum(&bytes[..SIZE - 4]) != word(bytes, SIZE - 4) {
            return Err(Error::Checksum);
        }
        if &bytes[16..48] != GOAL {
            return Err(Error::Goal);
        }
        if bytes[48..80].iter().all(|v| *v == 0) || bytes[80..112].iter().all(|v| *v == 0) {
            return Err(Error::Identity);
        }
        // Bounds follow quantized [0,255] prototypes. Worst-case score fits i32.
        if (0..FEATURES).any(|i| !(-510..=510).contains(&(half(bytes, 128 + 2 * i) as i16)))
            || !(-4_161_600..=4_161_600).contains(&(word(bytes, 256) as i32))
        {
            return Err(Error::Weights);
        }
        let mut previous = 0;
        for i in 0..COUNT {
            let offset = ROWS + i * ROW_SIZE;
            let id = word(bytes, offset);
            if id <= previous
                || bytes[offset + 4..offset + ROW_SIZE]
                    .iter()
                    .any(|v| !matches!(v, 0 | 255))
            {
                return Err(Error::Input);
            }
            previous = id;
        }
        Ok(Self { bytes })
    }

    pub fn predict(&self, index: usize) -> Option<(u32, i32, u64)> {
        if index >= COUNT {
            return None;
        }
        let offset = ROWS + index * ROW_SIZE;
        let mut score = word(self.bytes, 256) as i32;
        for i in 0..FEATURES {
            score += (half(self.bytes, 128 + 2 * i) as i16 as i32)
                * i32::from(self.bytes[offset + 4 + i]);
        }
        let class = if score > 0 {
            0
        } else if score < 0 {
            1
        } else {
            2
        };
        Some((word(self.bytes, offset), score, class))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn seal(bytes: &mut [u8; SIZE]) {
        let value = checksum(&bytes[..SIZE - 4]);
        bytes[SIZE - 4..].copy_from_slice(&value.to_le_bytes());
    }
    fn packet() -> [u8; SIZE] {
        let mut bytes = [0; SIZE];
        bytes[..8].copy_from_slice(b"ELYDOC01");
        for (offset, value) in [(8, 1u16), (10, 64), (12, 8), (14, 68)] {
            bytes[offset..offset + 2].copy_from_slice(&value.to_le_bytes());
        }
        bytes[16..48].copy_from_slice(GOAL);
        bytes[48..112].fill(7);
        bytes[128..130].copy_from_slice(&2i16.to_le_bytes());
        bytes[256..260].copy_from_slice(&(-255i32).to_le_bytes());
        for i in 0..COUNT {
            bytes[ROWS + i * ROW_SIZE..ROWS + i * ROW_SIZE + 4]
                .copy_from_slice(&(i as u32 + 1).to_le_bytes());
        }
        bytes[ROWS + 4] = 255;
        seal(&mut bytes);
        bytes
    }
    #[test]
    fn integer_scores_select_candidates_and_ties_abstain() {
        let mut bytes = packet();
        let batch = Batch::decode(&bytes).unwrap();
        assert_eq!(batch.predict(0), Some((1, 255, 0)));
        assert_eq!(batch.predict(1), Some((2, -255, 1)));
        assert_eq!(batch.predict(COUNT), None);
        bytes[128..130].fill(0);
        bytes[256..260].fill(0);
        seal(&mut bytes);
        assert_eq!(Batch::decode(&bytes).unwrap().predict(0), Some((1, 0, 2)));
    }
    #[test]
    fn validate_all_records_before_any_prediction() {
        let bytes = packet();
        for n in 0..SIZE {
            assert!(Batch::decode(&bytes[..n]).is_err());
        }
        for offset in 0..SIZE {
            let mut bad = bytes;
            bad[offset] ^= 1;
            assert!(Batch::decode(&bad).is_err());
        }
        for (offset, value, error) in [
            (8, 2, Error::Format),
            (112, 1, Error::Format),
            (16, 0, Error::Goal),
            (129, 127, Error::Weights),
            (ROWS + 4, 1, Error::Input),
            (ROWS + ROW_SIZE, 1, Error::Input),
            (ROWS + 7 * ROW_SIZE + 4, 1, Error::Input),
        ] {
            let mut bad = bytes;
            bad[offset] = value;
            seal(&mut bad);
            assert_eq!(Batch::decode(&bad).err(), Some(error));
        }
        let mut bad = bytes;
        bad[48..80].fill(0);
        seal(&mut bad);
        assert_eq!(Batch::decode(&bad).err(), Some(Error::Identity));
    }
}
