//! Minimal static ELF64 user executable contract. Validation precedes allocation.
use crate::{CODE, DATA, PAGE};
pub const MAX_IMAGE: usize = 65536;
#[derive(Clone, Copy, Debug, Default)]
pub struct Segment {
    pub offset: usize,
    pub file_size: usize,
    pub memory_size: usize,
}
#[derive(Debug)]
pub struct Image<'a> {
    bytes: &'a [u8],
    pub entry: u64,
    pub segments: [Segment; 2],
}
fn read<const N: usize>(bytes: &[u8], offset: usize) -> Result<[u8; N], &'static str> {
    bytes
        .get(offset..offset.checked_add(N).ok_or("overflow")?)
        .ok_or("truncated")?
        .try_into()
        .map_err(|_| "truncated")
}
fn word(bytes: &[u8], offset: usize) -> Result<u64, &'static str> {
    Ok(u64::from_le_bytes(read(bytes, offset)?))
}
fn half(bytes: &[u8], offset: usize) -> Result<u16, &'static str> {
    Ok(u16::from_le_bytes(read(bytes, offset)?))
}
fn dword(bytes: &[u8], offset: usize) -> Result<u32, &'static str> {
    Ok(u32::from_le_bytes(read(bytes, offset)?))
}
impl<'a> Image<'a> {
    pub fn parse(bytes: &'a [u8]) -> Result<Self, &'static str> {
        if bytes.len() > MAX_IMAGE {
            return Err("image-size");
        }
        if bytes.get(..7) != Some(b"\x7fELF\x02\x01\x01")
            || half(bytes, 16)? != 2
            || half(bytes, 18)? != 62
            || dword(bytes, 20)? != 1
            || half(bytes, 52)? != 64
            || half(bytes, 54)? != 56
        {
            return Err("header");
        }
        let table = usize::try_from(word(bytes, 32)?).map_err(|_| "overflow")?;
        // This first ABI deliberately accepts exactly one RX and one RW load segment.
        if half(bytes, 56)? != 2 {
            return Err("headers");
        }
        let end = table.checked_add(112).ok_or("overflow")?;
        if table < 64 || end > bytes.len() {
            return Err("truncated");
        }
        let mut image = Self {
            bytes,
            entry: word(bytes, 24)?,
            segments: [Segment::default(); 2],
        };
        let mut seen = [false; 2];
        for i in 0..2 {
            let h = table + i * 56;
            if dword(bytes, h)? != 1 {
                return Err("segment-type");
            }
            let address = word(bytes, h + 16)?;
            let slot = match address {
                CODE => 0,
                DATA => 1,
                _ => return Err("address"),
            };
            if seen[slot] {
                return Err("overlap");
            }
            seen[slot] = true;
            if dword(bytes, h + 4)? != if slot == 0 { 5 } else { 6 } {
                return Err("permissions");
            }
            let offset = usize::try_from(word(bytes, h + 8)?).map_err(|_| "overflow")?;
            let file_size = usize::try_from(word(bytes, h + 32)?).map_err(|_| "overflow")?;
            let memory_size = usize::try_from(word(bytes, h + 40)?).map_err(|_| "overflow")?;
            if memory_size == 0
                || memory_size > PAGE as usize
                || file_size > memory_size
                || offset.checked_add(file_size).ok_or("overflow")? > bytes.len()
            {
                return Err("segment-size");
            }
            if word(bytes, h + 48)? != PAGE || offset < end || !(offset as u64).is_multiple_of(PAGE)
            {
                return Err("alignment");
            }
            image.segments[slot] = Segment {
                offset,
                file_size,
                memory_size,
            };
        }
        if !seen.into_iter().all(|x| x) {
            return Err("missing-load");
        }
        let [code, data] = image.segments;
        if code.offset < data.offset + data.file_size && data.offset < code.offset + code.file_size
        {
            return Err("file-overlap");
        }
        if image.entry < CODE || image.entry >= CODE + code.file_size as u64 {
            return Err("entry");
        }
        Ok(image)
    }
    pub fn bytes(&self, slot: usize) -> &[u8] {
        let s = self.segments[slot];
        &self.bytes[s.offset..s.offset + s.file_size]
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> [u8; 8193] {
        let mut b = [0; 8193];
        b[..7].copy_from_slice(b"\x7fELF\x02\x01\x01");
        for (o, v) in [(16, 2u16), (18, 62), (52, 64), (54, 56), (56, 2)] {
            b[o..o + 2].copy_from_slice(&v.to_le_bytes());
        }
        b[20..24].copy_from_slice(&1u32.to_le_bytes());
        put(&mut b, 24, CODE);
        put(&mut b, 32, 64);
        for (i, address) in [CODE, DATA].into_iter().enumerate() {
            let h = 64 + i * 56;
            b[h..h + 4].copy_from_slice(&1u32.to_le_bytes());
            b[h + 4..h + 8].copy_from_slice(&(if i == 0 { 5u32 } else { 6 }).to_le_bytes());
            for (o, v) in [
                (8, 4096 * (i + 1) as u64),
                (16, address),
                (32, 1),
                (40, 32),
                (48, PAGE),
            ] {
                put(&mut b, h + o, v);
            }
        }
        b[4096] = 0xc3;
        b[8192] = 42;
        b
    }
    fn put(b: &mut [u8], o: usize, v: u64) {
        b[o..o + 8].copy_from_slice(&v.to_le_bytes());
    }
    #[test]
    fn valid_image_separates_file_data_and_bss() {
        let b = fixture();
        let i = Image::parse(&b).unwrap();
        assert_eq!(i.entry, CODE);
        assert_eq!(i.bytes(0), [0xc3]);
        assert_eq!(i.bytes(1), [42]);
        assert_eq!(i.segments[1].memory_size, 32);
    }
    #[test]
    fn truncated_headers_and_file_ranges_are_rejected() {
        let b = fixture();
        for n in [0, 6, 63, 100, 175, 4096, 8192] {
            assert!(Image::parse(&b[..n]).is_err());
        }
        let mut b = fixture();
        put(&mut b, 32, u64::MAX);
        assert!(Image::parse(&b).is_err());
        let mut b = fixture();
        put(&mut b, 72, u64::MAX);
        assert!(Image::parse(&b).is_err());
    }
    #[test]
    fn foreign_architecture_dynamic_and_interpreter_are_rejected() {
        for (offset, value) in [(4, 1), (5, 2), (16, 3), (18, 183), (64, 2), (64, 3)] {
            let mut b = fixture();
            b[offset] = value;
            assert!(Image::parse(&b).is_err());
        }
    }
    #[test]
    fn writable_code_executable_data_and_unknown_flags_are_rejected() {
        for (offset, value) in [(68, 7), (68, 4), (124, 7), (124, 14)] {
            let mut b = fixture();
            b[offset] = value;
            assert!(Image::parse(&b).is_err());
        }
    }
    #[test]
    fn kernel_peer_stack_and_overlapping_addresses_are_rejected() {
        for address in [0x2000000, 0x70002000, 0x80000000, u64::MAX, DATA] {
            let mut b = fixture();
            put(&mut b, 80, address);
            assert!(Image::parse(&b).is_err());
        }
    }
    #[test]
    fn entry_must_be_in_file_backed_executable_bytes() {
        for entry in [CODE - 1, CODE + 1, DATA, u64::MAX] {
            let mut b = fixture();
            put(&mut b, 24, entry);
            assert!(Image::parse(&b).is_err());
        }
    }
    #[test]
    fn excessive_memory_alignment_and_overlapping_file_data_are_rejected() {
        for (offset, value) in [
            (104, 4097),
            (104, 0),
            (96, 33),
            (112, 8),
            (128, 4096),
            (72, 4097),
        ] {
            let mut b = fixture();
            put(&mut b, offset, value);
            assert!(Image::parse(&b).is_err());
        }
    }
}
