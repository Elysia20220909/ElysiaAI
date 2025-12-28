use bytes::{Buf, BufMut, BytesMut};
use std::net::Ipv4Addr;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum UdpError {
    #[error("Invalid datagram length: {0}")]
    InvalidLength(usize),
    #[error("Invalid checksum")]
    InvalidChecksum,
}

/// UDPデータグラム
#[derive(Debug, Clone)]
pub struct UdpDatagram {
    pub source_port: u16,
    pub dest_port: u16,
    pub length: u16,
    pub checksum: u16,
    pub payload: Vec<u8>,
}

impl UdpDatagram {
    pub const HEADER_SIZE: usize = 8;

    pub fn new(source_port: u16, dest_port: u16, payload: Vec<u8>) -> Self {
        let length = (Self::HEADER_SIZE + payload.len()) as u16;

        UdpDatagram {
            source_port,
            dest_port,
            length,
            checksum: 0, // Will be calculated
            payload,
        }
    }

    /// バイト列からUDPデータグラムをパース
    pub fn parse(data: &[u8]) -> Result<Self, UdpError> {
        if data.len() < Self::HEADER_SIZE {
            return Err(UdpError::InvalidLength(data.len()));
        }

        let mut buf = &data[..];

        // Source Port
        let source_port = buf.get_u16();

        // Destination Port
        let dest_port = buf.get_u16();

        // Length
        let length = buf.get_u16();

        // Checksum
        let checksum = buf.get_u16();

        // Payload
        let payload = buf.to_vec();

        Ok(UdpDatagram {
            source_port,
            dest_port,
            length,
            checksum,
            payload,
        })
    }

    /// UDPデータグラムをバイト列にシリアライズ
    pub fn serialize(&self, src_ip: Ipv4Addr, dst_ip: Ipv4Addr) -> Vec<u8> {
        let mut buf = BytesMut::with_capacity(Self::HEADER_SIZE + self.payload.len());

        // Source Port
        buf.put_u16(self.source_port);

        // Destination Port
        buf.put_u16(self.dest_port);

        // Length
        buf.put_u16(self.length);

        // Checksum (placeholder)
        let checksum_pos = buf.len();
        buf.put_u16(0);

        // Payload
        buf.put_slice(&self.payload);

        // Calculate and update checksum
        let checksum = Self::calculate_checksum(&buf, src_ip, dst_ip);
        buf[checksum_pos..checksum_pos + 2].copy_from_slice(&checksum.to_be_bytes());

        buf.to_vec()
    }

    /// UDP疑似ヘッダーを含むチェックサムを計算
    fn calculate_checksum(datagram: &[u8], src_ip: Ipv4Addr, dst_ip: Ipv4Addr) -> u16 {
        let mut sum = 0u32;

        // Pseudo-header
        for byte in src_ip.octets() {
            sum += (byte as u32) << 8;
        }
        for byte in dst_ip.octets() {
            sum += (byte as u32) << 8;
        }
        sum += 17u32; // UDP protocol number
        sum += datagram.len() as u32;

        // UDP datagram
        for chunk in datagram.chunks(2) {
            let word = if chunk.len() == 2 {
                u16::from_be_bytes([chunk[0], chunk[1]]) as u32
            } else {
                (chunk[0] as u32) << 8
            };
            sum += word;
        }

        while sum >> 16 != 0 {
            sum = (sum & 0xFFFF) + (sum >> 16);
        }

        let checksum = !sum as u16;

        // UDP checksum of 0 means no checksum
        if checksum == 0 {
            0xFFFF
        } else {
            checksum
        }
    }

    /// チェックサムを検証
    pub fn verify_checksum(&self, src_ip: Ipv4Addr, dst_ip: Ipv4Addr) -> bool {
        if self.checksum == 0 {
            // Checksum is optional in IPv4
            return true;
        }

        let serialized = self.serialize(src_ip, dst_ip);
        Self::calculate_checksum(&serialized, src_ip, dst_ip) == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_udp_datagram_creation() {
        let payload = vec![0x01, 0x02, 0x03, 0x04];
        let datagram = UdpDatagram::new(12345, 53, payload.clone());

        assert_eq!(datagram.source_port, 12345);
        assert_eq!(datagram.dest_port, 53);
        assert_eq!(datagram.length, (UdpDatagram::HEADER_SIZE + payload.len()) as u16);
        assert_eq!(datagram.payload, payload);
    }

    #[test]
    fn test_udp_serialize_parse() {
        let src_ip = Ipv4Addr::new(192, 168, 1, 1);
        let dst_ip = Ipv4Addr::new(192, 168, 1, 2);
        let payload = vec![0xAA, 0xBB, 0xCC, 0xDD];

        let datagram = UdpDatagram::new(5000, 6000, payload.clone());
        let serialized = datagram.serialize(src_ip, dst_ip);

        let parsed = UdpDatagram::parse(&serialized).unwrap();
        assert_eq!(parsed.source_port, 5000);
        assert_eq!(parsed.dest_port, 6000);
        assert_eq!(parsed.payload, payload);
        assert!(parsed.verify_checksum(src_ip, dst_ip));
    }
}
