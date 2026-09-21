#![no_std]
//! Two-input, two-output integer forward pass. Hand-authored test weights,
//! not a trained language model. No allocation, floating point, or authority.
pub const MODEL_SIZE: usize = 24;
pub const INPUT_SIZE: usize = 8;
#[derive(Debug, PartialEq, Eq)]
pub enum Error {
    Model,
    Input,
}
#[derive(Debug, PartialEq, Eq)]
pub struct Prediction {
    pub scores: [i32; 2],
    pub bytes: Option<u64>,
}
pub const fn checksum(bytes: &[u8]) -> u32 {
    let mut hash = 2166136261u32;
    let mut i = 0;
    while i < bytes.len() {
        hash = (hash ^ bytes[i] as u32).wrapping_mul(16777619);
        i += 1;
    }
    hash
}
pub const fn fixture_model() -> [u8; MODEL_SIZE] {
    let mut b = [0u8; MODEL_SIZE];
    let magic = *b"ELYSINF1";
    let mut i = 0;
    while i < 8 {
        b[i] = magic[i];
        i += 1;
    }
    b[8] = 1;
    b[9] = 2;
    b[10] = 2;
    b[12] = 2;
    b[13] = 255;
    b[14] = 255;
    b[15] = 2;
    // Constant evaluation cannot slice in every supported toolchain.
    let mut prefix = [0u8; 20];
    i = 0;
    while i < 20 {
        prefix[i] = b[i];
        i += 1;
    }
    let hash = checksum(&prefix).to_le_bytes();
    i = 0;
    while i < 4 {
        b[20 + i] = hash[i];
        i += 1;
    }
    b
}
pub struct Model {
    weights: [[i32; 2]; 2],
    bias: [i32; 2],
}
impl Model {
    pub fn decode(bytes: &[u8]) -> Result<Self, Error> {
        if bytes.len() != MODEL_SIZE
            || &bytes[..8] != b"ELYSINF1"
            || bytes[8..12] != [1, 2, 2, 0]
            || checksum(&bytes[..20]) != u32::from_le_bytes(bytes[20..24].try_into().unwrap())
        {
            return Err(Error::Model);
        }
        let weights = [
            [bytes[12] as i8 as i32, bytes[13] as i8 as i32],
            [bytes[14] as i8 as i32, bytes[15] as i8 as i32],
        ];
        let bias = [
            i16::from_le_bytes([bytes[16], bytes[17]]) as i32,
            i16::from_le_bytes([bytes[18], bytes[19]]) as i32,
        ];
        if weights.iter().flatten().any(|w| !(-8..=8).contains(w))
            || bias.iter().any(|b| !(-64..=64).contains(b))
        {
            return Err(Error::Model);
        }
        Ok(Self { weights, bias })
    }
    pub fn predict(&self, bytes: &[u8]) -> Result<Prediction, Error> {
        if bytes.len() != INPUT_SIZE || bytes[..2] != [1, 2] || bytes[6..] != [0, 0] {
            return Err(Error::Input);
        }
        let input = [
            i16::from_le_bytes([bytes[2], bytes[3]]) as i32,
            i16::from_le_bytes([bytes[4], bytes[5]]) as i32,
        ];
        if input.iter().any(|x| !(0..=16).contains(x)) {
            return Err(Error::Input);
        }
        let mut scores = self.bias;
        for (row, score) in scores.iter_mut().enumerate() {
            for (column, value) in input.iter().enumerate() {
                *score += self.weights[row][column] * value;
            }
        }
        let bytes = match scores[0].cmp(&scores[1]) {
            core::cmp::Ordering::Greater => Some(8),
            core::cmp::Ordering::Less => Some(16),
            core::cmp::Ordering::Equal => None,
        };
        Ok(Prediction { scores, bytes })
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn input(x: i16, y: i16) -> [u8; INPUT_SIZE] {
        let x = x.to_le_bytes();
        let y = y.to_le_bytes();
        [1, 2, x[0], x[1], y[0], y[1], 0, 0]
    }
    #[test]
    fn different_inputs_compute_different_proposals_and_ties_abstain() {
        let model = Model::decode(&fixture_model()).unwrap();
        assert_eq!(
            model.predict(&input(4, 1)),
            Ok(Prediction {
                scores: [7, -2],
                bytes: Some(8)
            })
        );
        assert_eq!(
            model.predict(&input(1, 4)),
            Ok(Prediction {
                scores: [-2, 7],
                bytes: Some(16)
            })
        );
        assert_eq!(
            model.predict(&input(1, 1)),
            Ok(Prediction {
                scores: [1, 1],
                bytes: None
            })
        );
    }
    #[test]
    fn rejects_corrupt_truncated_and_unsupported_models() {
        let original = fixture_model();
        for i in 0..MODEL_SIZE {
            let mut bad = original;
            bad[i] ^= 1;
            assert!(Model::decode(&bad).is_err());
        }
        for len in 0..MODEL_SIZE {
            assert!(Model::decode(&original[..len]).is_err());
        }
        for (index, value) in [(8, 2), (9, 3), (10, 3), (11, 1), (12, 9), (16, 65)] {
            let mut bad = original;
            bad[index] = value;
            let c = checksum(&bad[..20]).to_le_bytes();
            bad[20..].copy_from_slice(&c);
            assert!(Model::decode(&bad).is_err());
        }
    }
    #[test]
    fn rejects_input_shape_and_range_before_computation() {
        let model = Model::decode(&fixture_model()).unwrap();
        for bytes in [
            input(-1, 0),
            input(0, 17),
            input(i16::MAX, i16::MIN),
            [1, 3, 1, 0, 4, 0, 0, 0],
            [1, 2, 1, 0, 4, 0, 0, 1],
        ] {
            assert_eq!(model.predict(&bytes), Err(Error::Input));
        }
        for len in 0..INPUT_SIZE {
            assert_eq!(model.predict(&input(1, 4)[..len]), Err(Error::Input));
        }
        assert!(model.predict(&input(16, 0)).is_ok());
    }
}
