use bytes::{Buf, BufMut, BytesMut};
use std::fmt;
use std::net::Ipv4Addr;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum IpError {
    #[error("Invalid packet length: {0}")]
    InvalidLength(usize),
    #[error("Invalid IP version: {0}")]
    InvalidVersion(u8),
    #[error("Invalid checksum")]
    InvalidChecksum,
    #[error("Fragmentation not supported")]
    FragmentationNotSupported,
}

/// IPプロトコル番号
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum IpProtocol {
    Icmp = 1,
    Tcp = 6,
    Udp = 17,
}

impl IpProtocol {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            1 => Some(IpProtocol::Icmp),
            6 => Some(IpProtocol::Tcp),
            17 => Some(IpProtocol::Udp),
            _ => None,
        }
    }
}

/// IPv4パケット
#[derive(Debug, Clone)]
pub struct Ipv4Packet {
    pub version: u8,
    pub ihl: u8,
    pub dscp: u8,
    pub ecn: u8,
    pub total_length: u16,
    pub identification: u16,
    pub flags: u8,
    pub fragment_offset: u16,
    pub ttl: u8,
    pub protocol: IpProtocol,
    pub checksum: u16,
    pub source: Ipv4Addr,
    pub destination: Ipv4Addr,
    pub options: Vec<u8>,
    pub payload: Vec<u8>,
}

impl Ipv4Packet {
    pub const MIN_HEADER_SIZE: usize = 20;
    pub const VERSION: u8 = 4;

    pub fn new(
        source: Ipv4Addr,
        destination: Ipv4Addr,
        protocol: IpProtocol,
        payload: Vec<u8>,
    ) -> Self {
        let total_length = (Self::MIN_HEADER_SIZE + payload.len()) as u16;

        Ipv4Packet {
            version: Self::VERSION,
            ihl: 5, // 5 * 4 = 20 bytes (minimum header)
            dscp: 0,
            ecn: 0,
            total_length,
            identification: rand::random(),
            flags: 0b010, // Don't Fragment
            fragment_offset: 0,
            ttl: 64,
            protocol,
            checksum: 0, // Will be calculated
            source,
            destination,
            options: Vec::new(),
            payload,
        }
    }

    /// パケットをバイト列からパース
    pub fn parse(data: &[u8]) -> Result<Self, IpError> {
        if data.len() < Self::MIN_HEADER_SIZE {
            return Err(IpError::InvalidLength(data.len()));
        }

        let mut buf = &data[..];

        // Version and IHL
        let version_ihl = buf.get_u8();
        let version = version_ihl >> 4;
        let ihl = version_ihl & 0x0F;

        if version != Self::VERSION {
            return Err(IpError::InvalidVersion(version));
        }

        // DSCP and ECN
        let dscp_ecn = buf.get_u8();
        let dscp = dscp_ecn >> 2;
        let ecn = dscp_ecn & 0x03;

        // Total Length
        let total_length = buf.get_u16();

        // Identification
        let identification = buf.get_u16();

        // Flags and Fragment Offset
        let flags_offset = buf.get_u16();
        let flags = (flags_offset >> 13) as u8;
        let fragment_offset = flags_offset & 0x1FFF;

        // TTL
        let ttl = buf.get_u8();

        // Protocol
        let protocol_val = buf.get_u8();
        let protocol = IpProtocol::from_u8(protocol_val)
            .ok_or(IpError::InvalidLength(0))?;

        // Checksum
        let checksum = buf.get_u16();

        // Source Address
        let mut src_bytes = [0u8; 4];
        buf.copy_to_slice(&mut src_bytes);
        let source = Ipv4Addr::from(src_bytes);

        // Destination Address
        let mut dst_bytes = [0u8; 4];
        buf.copy_to_slice(&mut dst_bytes);
        let destination = Ipv4Addr::from(dst_bytes);

        // Options (if any)
        let header_len = (ihl as usize) * 4;
        let options_len = header_len - Self::MIN_HEADER_SIZE;
        let options = if options_len > 0 {
            let mut opts = vec![0u8; options_len];
            buf.copy_to_slice(&mut opts);
            opts
        } else {
            Vec::new()
        };

        // Payload
        let payload = buf.to_vec();

        Ok(Ipv4Packet {
            version,
            ihl,
            dscp,
            ecn,
            total_length,
            identification,
            flags,
            fragment_offset,
            ttl,
            protocol,
            checksum,
            source,
            destination,
            options,
            payload,
        })
    }

    /// パケットをバイト列にシリアライズ
    pub fn serialize(&mut self) -> Vec<u8> {
        let header_len = (self.ihl as usize) * 4;
        let mut buf = BytesMut::with_capacity(header_len + self.payload.len());

        // Version and IHL
        buf.put_u8((self.version << 4) | self.ihl);

        // DSCP and ECN
        buf.put_u8((self.dscp << 2) | self.ecn);

        // Total Length
        buf.put_u16(self.total_length);

        // Identification
        buf.put_u16(self.identification);

        // Flags and Fragment Offset
        let flags_offset = ((self.flags as u16) << 13) | self.fragment_offset;
        buf.put_u16(flags_offset);

        // TTL
        buf.put_u8(self.ttl);

        // Protocol
        buf.put_u8(self.protocol as u8);

        // Checksum (placeholder)
        let checksum_pos = buf.len();
        buf.put_u16(0);

        // Source Address
        buf.put_slice(&self.source.octets());

        // Destination Address
        buf.put_slice(&self.destination.octets());

        // Options
        buf.put_slice(&self.options);

        // Calculate and update checksum
        let checksum = Self::calculate_checksum(&buf[..header_len]);
        buf[checksum_pos..checksum_pos + 2].copy_from_slice(&checksum.to_be_bytes());
        self.checksum = checksum;

        // Payload
        buf.put_slice(&self.payload);

        buf.to_vec()
    }

    /// IPv4ヘッダーのチェックサムを計算
    fn calculate_checksum(header: &[u8]) -> u16 {
        let mut sum = 0u32;

        for chunk in header.chunks(2) {
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

        !sum as u16
    }

    /// チェックサムを検証
    pub fn verify_checksum(&self) -> bool {
        let header_len = (self.ihl as usize) * 4;
        let mut header = BytesMut::with_capacity(header_len);

        header.put_u8((self.version << 4) | self.ihl);
        header.put_u8((self.dscp << 2) | self.ecn);
        header.put_u16(self.total_length);
        header.put_u16(self.identification);
        header.put_u16(((self.flags as u16) << 13) | self.fragment_offset);
        header.put_u8(self.ttl);
        header.put_u8(self.protocol as u8);
        header.put_u16(self.checksum);
        header.put_slice(&self.source.octets());
        header.put_slice(&self.destination.octets());
        header.put_slice(&self.options);

        Self::calculate_checksum(&header) == 0
    }
}

/// IPパケットのトレイト
pub trait IpPacket {
    fn source_addr(&self) -> std::net::IpAddr;
    fn dest_addr(&self) -> std::net::IpAddr;
    fn protocol(&self) -> IpProtocol;
    fn payload(&self) -> &[u8];
}

impl IpPacket for Ipv4Packet {
    fn source_addr(&self) -> std::net::IpAddr {
        std::net::IpAddr::V4(self.source)
    }

    fn dest_addr(&self) -> std::net::IpAddr {
        std::net::IpAddr::V4(self.destination)
    }

    fn protocol(&self) -> IpProtocol {
        self.protocol
    }

    fn payload(&self) -> &[u8] {
        &self.payload
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ipv4_packet_creation() {
        let src = Ipv4Addr::new(192, 168, 1, 1);
        let dst = Ipv4Addr::new(192, 168, 1, 2);
        let payload = vec![0x01, 0x02, 0x03, 0x04];

        let packet = Ipv4Packet::new(src, dst, IpProtocol::Tcp, payload.clone());

        assert_eq!(packet.version, 4);
        assert_eq!(packet.source, src);
        assert_eq!(packet.destination, dst);
        assert_eq!(packet.protocol, IpProtocol::Tcp);
        assert_eq!(packet.payload, payload);
    }

    #[test]
    fn test_ipv4_serialize_parse() {
        let src = Ipv4Addr::new(10, 0, 0, 1);
        let dst = Ipv4Addr::new(10, 0, 0, 2);
        let payload = vec![0xAA, 0xBB, 0xCC, 0xDD];

        let mut packet = Ipv4Packet::new(src, dst, IpProtocol::Udp, payload.clone());
        let serialized = packet.serialize();

        let parsed = Ipv4Packet::parse(&serialized).unwrap();
        assert_eq!(parsed.source, src);
        assert_eq!(parsed.destination, dst);
        assert_eq!(parsed.protocol, IpProtocol::Udp);
        assert_eq!(parsed.payload, payload);
        assert!(parsed.verify_checksum());
    }
}
