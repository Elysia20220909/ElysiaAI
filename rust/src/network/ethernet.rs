use bytes::{Buf, BufMut, BytesMut};
use std::fmt;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum EthernetError {
    #[error("Invalid frame length: {0}")]
    InvalidLength(usize),
    #[error("Invalid MAC address")]
    InvalidMacAddress,
    #[error("Unsupported EtherType: {0:#x}")]
    UnsupportedEtherType(u16),
}

/// MACアドレスを表現する構造体
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct MacAddress([u8; 6]);

impl MacAddress {
    pub const BROADCAST: MacAddress = MacAddress([0xff; 6]);

    pub fn new(bytes: [u8; 6]) -> Self {
        MacAddress(bytes)
    }

    pub fn as_bytes(&self) -> &[u8; 6] {
        &self.0
    }

    pub fn is_broadcast(&self) -> bool {
        *self == Self::BROADCAST
    }

    pub fn is_multicast(&self) -> bool {
        self.0[0] & 0x01 != 0
    }
}

impl fmt::Display for MacAddress {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}",
            self.0[0], self.0[1], self.0[2], self.0[3], self.0[4], self.0[5]
        )
    }
}

/// EtherTypeの定義
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EtherType {
    Ipv4 = 0x0800,
    Arp = 0x0806,
    Ipv6 = 0x86DD,
}

impl EtherType {
    pub fn from_u16(value: u16) -> Option<Self> {
        match value {
            0x0800 => Some(EtherType::Ipv4),
            0x0806 => Some(EtherType::Arp),
            0x86DD => Some(EtherType::Ipv6),
            _ => None,
        }
    }

    pub fn as_u16(&self) -> u16 {
        *self as u16
    }
}

/// Ethernetフレームの構造体
#[derive(Debug, Clone)]
pub struct EthernetFrame {
    pub destination: MacAddress,
    pub source: MacAddress,
    pub ether_type: EtherType,
    pub payload: Vec<u8>,
}

impl EthernetFrame {
    /// 最小フレームサイズ (ヘッダー14バイト + 最小ペイロード46バイト + FCS 4バイト)
    pub const MIN_FRAME_SIZE: usize = 64;
    /// 最大フレームサイズ
    pub const MAX_FRAME_SIZE: usize = 1518;
    /// ヘッダーサイズ
    pub const HEADER_SIZE: usize = 14;

    pub fn new(
        destination: MacAddress,
        source: MacAddress,
        ether_type: EtherType,
        payload: Vec<u8>,
    ) -> Self {
        EthernetFrame {
            destination,
            source,
            ether_type,
            payload,
        }
    }

    /// バイト列からEthernetフレームをパース
    pub fn parse(data: &[u8]) -> Result<Self, EthernetError> {
        if data.len() < Self::HEADER_SIZE {
            return Err(EthernetError::InvalidLength(data.len()));
        }

        let mut buf = &data[..];

        // Destination MAC (6 bytes)
        let mut dst = [0u8; 6];
        buf.copy_to_slice(&mut dst);
        let destination = MacAddress::new(dst);

        // Source MAC (6 bytes)
        let mut src = [0u8; 6];
        buf.copy_to_slice(&mut src);
        let source = MacAddress::new(src);

        // EtherType (2 bytes)
        let ether_type_val = buf.get_u16();
        let ether_type = EtherType::from_u16(ether_type_val)
            .ok_or(EthernetError::UnsupportedEtherType(ether_type_val))?;

        // Payload
        let payload = buf.to_vec();

        Ok(EthernetFrame {
            destination,
            source,
            ether_type,
            payload,
        })
    }

    /// Ethernetフレームをバイト列にシリアライズ
    pub fn serialize(&self) -> Vec<u8> {
        let mut buf = BytesMut::with_capacity(Self::HEADER_SIZE + self.payload.len());

        // Destination MAC
        buf.put_slice(self.destination.as_bytes());

        // Source MAC
        buf.put_slice(self.source.as_bytes());

        // EtherType
        buf.put_u16(self.ether_type.as_u16());

        // Payload
        buf.put_slice(&self.payload);

        buf.to_vec()
    }

    /// フレームの合計サイズを返す
    pub fn total_size(&self) -> usize {
        Self::HEADER_SIZE + self.payload.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mac_address() {
        let mac = MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
        assert_eq!(format!("{}", mac), "00:11:22:33:44:55");
        assert!(!mac.is_broadcast());
        assert!(!mac.is_multicast());

        let broadcast = MacAddress::BROADCAST;
        assert!(broadcast.is_broadcast());
    }

    #[test]
    fn test_ethernet_frame_parse_serialize() {
        let dst = MacAddress::new([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
        let src = MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
        let payload = vec![0x01, 0x02, 0x03, 0x04];

        let frame = EthernetFrame::new(dst, src, EtherType::Ipv4, payload.clone());
        let serialized = frame.serialize();

        let parsed = EthernetFrame::parse(&serialized).unwrap();
        assert_eq!(parsed.destination, dst);
        assert_eq!(parsed.source, src);
        assert_eq!(parsed.ether_type, EtherType::Ipv4);
        assert_eq!(parsed.payload, payload);
    }
}
