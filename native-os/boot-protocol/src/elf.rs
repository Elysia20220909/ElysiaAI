use crate::{KERNEL_BASE, KERNEL_LIMIT};

#[derive(Clone, Copy, Debug, Default)]
pub struct Segment {
    pub offset: usize,
    pub address: u64,
    pub file_size: usize,
    pub memory_size: usize,
    pub executable: bool,
}

#[derive(Debug)]
pub struct Image {
    pub entry: u64,
    pub end: u64,
    pub segments: [Segment; 8],
    pub count: usize,
}

fn read<const N: usize>(bytes: &[u8], offset: usize) -> Result<[u8; N], &'static str> {
    bytes
        .get(offset..offset.checked_add(N).ok_or("overflow")?)
        .ok_or("truncated")?
        .try_into()
        .map_err(|_| "truncated")
}
fn u16_at(b: &[u8], o: usize) -> Result<u16, &'static str> {
    Ok(u16::from_le_bytes(read(b, o)?))
}
fn u32_at(b: &[u8], o: usize) -> Result<u32, &'static str> {
    Ok(u32::from_le_bytes(read(b, o)?))
}
fn u64_at(b: &[u8], o: usize) -> Result<u64, &'static str> {
    Ok(u64::from_le_bytes(read(b, o)?))
}

/// Accept only the small, non-relocatable, identity-mapped ELF contract used by M1.
pub fn parse(bytes: &[u8]) -> Result<Image, &'static str> {
    if bytes.get(..7) != Some(b"\x7fELF\x02\x01\x01")
        || u16_at(bytes, 16)? != 2
        || u16_at(bytes, 18)? != 62
        || u32_at(bytes, 20)? != 1
        || u16_at(bytes, 52)? != 64
        || u16_at(bytes, 54)? != 56
    {
        return Err("elf-header");
    }
    let table = usize::try_from(u64_at(bytes, 32)?).map_err(|_| "overflow")?;
    let headers = u16_at(bytes, 56)? as usize;
    if headers == 0 || headers > 8 {
        return Err("program-headers");
    }
    let table_end = table.checked_add(headers * 56).ok_or("overflow")?;
    if table < 64 || table_end > bytes.len() {
        return Err("truncated");
    }
    let mut image = Image {
        entry: u64_at(bytes, 24)?,
        end: KERNEL_BASE,
        segments: [Segment::default(); 8],
        count: 0,
    };
    for index in 0..headers {
        let header = table + index * 56;
        let kind = u32_at(bytes, header)?;
        if kind == 2 || kind == 3 {
            return Err("dynamic-image");
        }
        if kind != 1 {
            continue;
        }
        let flags = u32_at(bytes, header + 4)?;
        let offset = usize::try_from(u64_at(bytes, header + 8)?).map_err(|_| "overflow")?;
        let address = u64_at(bytes, header + 16)?;
        let physical = u64_at(bytes, header + 24)?;
        let file_size = usize::try_from(u64_at(bytes, header + 32)?).map_err(|_| "overflow")?;
        let memory_size = usize::try_from(u64_at(bytes, header + 40)?).map_err(|_| "overflow")?;
        let align = u64_at(bytes, header + 48)?;
        let end = address.checked_add(memory_size as u64).ok_or("overflow")?;
        if memory_size == 0
            || file_size > memory_size
            || offset.checked_add(file_size).ok_or("overflow")? > bytes.len()
        {
            return Err("segment-size");
        }
        if address != physical
            || address < KERNEL_BASE
            || end > KERNEL_LIMIT
            || flags & 3 == 3
            || flags & !7 != 0
            || (align > 1 && (!align.is_power_of_two() || address % align != offset as u64 % align))
        {
            return Err("segment-range");
        }
        for previous in &image.segments[..image.count] {
            if address < previous.address + previous.memory_size as u64 && previous.address < end {
                return Err("overlap");
            }
        }
        image.segments[image.count] = Segment {
            offset,
            address,
            file_size,
            memory_size,
            executable: flags & 1 != 0,
        };
        image.count += 1;
        image.end = image.end.max(end);
    }
    if image.count == 0
        || !image.segments[..image.count]
            .iter()
            .any(|s| s.address == KERNEL_BASE)
    {
        return Err("missing-load");
    }
    if !image.segments[..image.count].iter().any(|s| {
        s.executable && image.entry >= s.address && image.entry < s.address + s.file_size as u64
    }) {
        return Err("entry");
    }
    image.end = (image.end + 4095) & !4095;
    Ok(image)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn image() -> [u8; 128] {
        let mut b = [0u8; 128];
        b[..7].copy_from_slice(b"\x7fELF\x02\x01\x01");
        b[16..18].copy_from_slice(&2u16.to_le_bytes());
        b[18..20].copy_from_slice(&62u16.to_le_bytes());
        b[20..24].copy_from_slice(&1u32.to_le_bytes());
        b[24..32].copy_from_slice(&KERNEL_BASE.to_le_bytes());
        b[32..40].copy_from_slice(&64u64.to_le_bytes());
        b[52..54].copy_from_slice(&64u16.to_le_bytes());
        b[54..56].copy_from_slice(&56u16.to_le_bytes());
        b[56..58].copy_from_slice(&1u16.to_le_bytes());
        b[64..68].copy_from_slice(&1u32.to_le_bytes());
        b[68..72].copy_from_slice(&5u32.to_le_bytes());
        b[72..80].copy_from_slice(&120u64.to_le_bytes());
        b[80..88].copy_from_slice(&KERNEL_BASE.to_le_bytes());
        b[88..96].copy_from_slice(&KERNEL_BASE.to_le_bytes());
        b[96..104].copy_from_slice(&8u64.to_le_bytes());
        b[104..112].copy_from_slice(&4096u64.to_le_bytes());
        b[112..120].copy_from_slice(&1u64.to_le_bytes());
        b
    }
    #[test]
    fn accepts_static_kernel() {
        let parsed = parse(&image()).unwrap();
        assert_eq!(parsed.entry, KERNEL_BASE);
        assert_eq!(parsed.end, KERNEL_BASE + 4096);
        assert_eq!(parsed.count, 1);
    }
    #[test]
    fn rejects_truncation_and_table_overflow() {
        assert!(parse(&image()[..100]).is_err());
        let mut b = image();
        b[32..40].copy_from_slice(&u64::MAX.to_le_bytes());
        assert!(parse(&b).is_err());
    }
    #[test]
    fn rejects_unmapped_entry_and_writable_code() {
        let mut b = image();
        b[24..32].copy_from_slice(&(KERNEL_BASE + 32).to_le_bytes());
        assert_eq!(parse(&b).unwrap_err(), "entry");
        b = image();
        b[68..72].copy_from_slice(&7u32.to_le_bytes());
        assert_eq!(parse(&b).unwrap_err(), "segment-range");
    }
    #[test]
    fn rejects_file_larger_than_memory_and_foreign_address() {
        let mut b = image();
        b[104..112].copy_from_slice(&1u64.to_le_bytes());
        assert_eq!(parse(&b).unwrap_err(), "segment-size");
        b = image();
        b[80..88].copy_from_slice(&0u64.to_le_bytes());
        assert_eq!(parse(&b).unwrap_err(), "segment-range");
    }

    #[test]
    fn rejects_dynamic_images_and_misaligned_segments() {
        let mut b = image();
        b[64..68].copy_from_slice(&2u32.to_le_bytes());
        assert_eq!(parse(&b).unwrap_err(), "dynamic-image");
        b = image();
        b[112..120].copy_from_slice(&4096u64.to_le_bytes());
        assert_eq!(parse(&b).unwrap_err(), "segment-range");
    }

    #[test]
    fn rejects_overlapping_load_segments() {
        let mut b = [0u8; 256];
        b[..128].copy_from_slice(&image());
        b[56..58].copy_from_slice(&2u16.to_le_bytes());
        b[72..80].copy_from_slice(&240u64.to_le_bytes());
        b.copy_within(64..120, 120);
        b[120 + 4..120 + 8].copy_from_slice(&6u32.to_le_bytes());
        assert_eq!(parse(&b).unwrap_err(), "overlap");
    }
}
