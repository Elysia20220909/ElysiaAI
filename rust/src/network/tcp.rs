use bytes::{Buf, BufMut, BytesMut};
use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::sync::{Arc, Mutex};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TcpError {
    #[error("Invalid segment length: {0}")]
    InvalidLength(usize),
    #[error("Invalid checksum")]
    InvalidChecksum,
    #[error("Connection not found")]
    ConnectionNotFound,
    #[error("Invalid state transition")]
    InvalidStateTransition,
}

/// TCPフラグ
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TcpFlags {
    pub fin: bool,
    pub syn: bool,
    pub rst: bool,
    pub psh: bool,
    pub ack: bool,
    pub urg: bool,
}

impl TcpFlags {
    pub fn new() -> Self {
        TcpFlags {
            fin: false,
            syn: false,
            rst: false,
            psh: false,
            ack: false,
            urg: false,
        }
    }

    pub fn from_u8(value: u8) -> Self {
        TcpFlags {
            fin: (value & 0x01) != 0,
            syn: (value & 0x02) != 0,
            rst: (value & 0x04) != 0,
            psh: (value & 0x08) != 0,
            ack: (value & 0x10) != 0,
            urg: (value & 0x20) != 0,
        }
    }

    pub fn to_u8(&self) -> u8 {
        let mut flags = 0u8;
        if self.fin { flags |= 0x01; }
        if self.syn { flags |= 0x02; }
        if self.rst { flags |= 0x04; }
        if self.psh { flags |= 0x08; }
        if self.ack { flags |= 0x10; }
        if self.urg { flags |= 0x20; }
        flags
    }
}

impl Default for TcpFlags {
    fn default() -> Self {
        Self::new()
    }
}

/// TCPセグメント
#[derive(Debug, Clone)]
pub struct TcpSegment {
    pub source_port: u16,
    pub dest_port: u16,
    pub sequence_number: u32,
    pub acknowledgment_number: u32,
    pub data_offset: u8,
    pub flags: TcpFlags,
    pub window_size: u16,
    pub checksum: u16,
    pub urgent_pointer: u16,
    pub options: Vec<u8>,
    pub payload: Vec<u8>,
}

impl TcpSegment {
    pub const MIN_HEADER_SIZE: usize = 20;

    pub fn new(
        source_port: u16,
        dest_port: u16,
        sequence_number: u32,
        acknowledgment_number: u32,
        flags: TcpFlags,
        window_size: u16,
        payload: Vec<u8>,
    ) -> Self {
        TcpSegment {
            source_port,
            dest_port,
            sequence_number,
            acknowledgment_number,
            data_offset: 5, // 5 * 4 = 20 bytes
            flags,
            window_size,
            checksum: 0,
            urgent_pointer: 0,
            options: Vec::new(),
            payload,
        }
    }

    /// バイト列からTCPセグメントをパース
    pub fn parse(data: &[u8]) -> Result<Self, TcpError> {
        if data.len() < Self::MIN_HEADER_SIZE {
            return Err(TcpError::InvalidLength(data.len()));
        }

        let mut buf = &data[..];

        // Source Port
        let source_port = buf.get_u16();

        // Destination Port
        let dest_port = buf.get_u16();

        // Sequence Number
        let sequence_number = buf.get_u32();

        // Acknowledgment Number
        let acknowledgment_number = buf.get_u32();

        // Data Offset and Flags
        let offset_flags = buf.get_u16();
        let data_offset = (offset_flags >> 12) as u8;
        let flags = TcpFlags::from_u8((offset_flags & 0x003F) as u8);

        // Window Size
        let window_size = buf.get_u16();

        // Checksum
        let checksum = buf.get_u16();

        // Urgent Pointer
        let urgent_pointer = buf.get_u16();

        // Options
        let header_len = (data_offset as usize) * 4;
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

        Ok(TcpSegment {
            source_port,
            dest_port,
            sequence_number,
            acknowledgment_number,
            data_offset,
            flags,
            window_size,
            checksum,
            urgent_pointer,
            options,
            payload,
        })
    }

    /// TCPセグメントをバイト列にシリアライズ
    pub fn serialize(&self, src_ip: Ipv4Addr, dst_ip: Ipv4Addr) -> Vec<u8> {
        let header_len = (self.data_offset as usize) * 4;
        let mut buf = BytesMut::with_capacity(header_len + self.payload.len());

        // Source Port
        buf.put_u16(self.source_port);

        // Destination Port
        buf.put_u16(self.dest_port);

        // Sequence Number
        buf.put_u32(self.sequence_number);

        // Acknowledgment Number
        buf.put_u32(self.acknowledgment_number);

        // Data Offset and Flags
        let offset_flags = ((self.data_offset as u16) << 12) | (self.flags.to_u8() as u16);
        buf.put_u16(offset_flags);

        // Window Size
        buf.put_u16(self.window_size);

        // Checksum (placeholder)
        let checksum_pos = buf.len();
        buf.put_u16(0);

        // Urgent Pointer
        buf.put_u16(self.urgent_pointer);

        // Options
        buf.put_slice(&self.options);

        // Payload
        buf.put_slice(&self.payload);

        // Calculate and update checksum
        let checksum = Self::calculate_checksum(&buf, src_ip, dst_ip);
        buf[checksum_pos..checksum_pos + 2].copy_from_slice(&checksum.to_be_bytes());

        buf.to_vec()
    }

    /// TCP疑似ヘッダーを含むチェックサムを計算
    fn calculate_checksum(segment: &[u8], src_ip: Ipv4Addr, dst_ip: Ipv4Addr) -> u16 {
        let mut sum = 0u32;

        // Pseudo-header
        for byte in src_ip.octets() {
            sum += (byte as u32) << 8;
        }
        for byte in dst_ip.octets() {
            sum += (byte as u32) << 8;
        }
        sum += 6u32; // TCP protocol number
        sum += segment.len() as u32;

        // TCP segment
        for chunk in segment.chunks(2) {
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
}

/// TCP接続の状態
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TcpState {
    Closed,
    Listen,
    SynSent,
    SynReceived,
    Established,
    FinWait1,
    FinWait2,
    CloseWait,
    Closing,
    LastAck,
    TimeWait,
}

/// TCP接続
#[derive(Debug, Clone)]
pub struct TcpConnection {
    pub local_addr: Ipv4Addr,
    pub local_port: u16,
    pub remote_addr: Ipv4Addr,
    pub remote_port: u16,
    pub state: TcpState,
    pub send_seq: u32,
    pub recv_seq: u32,
    pub send_window: u16,
    pub recv_window: u16,
}

impl TcpConnection {
    pub fn new(
        local_addr: Ipv4Addr,
        local_port: u16,
        remote_addr: Ipv4Addr,
        remote_port: u16,
    ) -> Self {
        TcpConnection {
            local_addr,
            local_port,
            remote_addr,
            remote_port,
            state: TcpState::Closed,
            send_seq: rand::random(),
            recv_seq: 0,
            send_window: 65535,
            recv_window: 65535,
        }
    }

    pub fn connection_id(&self) -> (Ipv4Addr, u16, Ipv4Addr, u16) {
        (self.local_addr, self.local_port, self.remote_addr, self.remote_port)
    }
}

/// TCP接続マネージャー
#[derive(Debug)]
pub struct TcpConnectionManager {
    connections: Arc<Mutex<HashMap<(Ipv4Addr, u16, Ipv4Addr, u16), TcpConnection>>>,
}

impl TcpConnectionManager {
    pub fn new() -> Self {
        TcpConnectionManager {
            connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn add_connection(&self, conn: TcpConnection) {
        let mut connections = self.connections.lock().unwrap();
        connections.insert(conn.connection_id(), conn);
    }

    pub fn get_connection(
        &self,
        local_addr: Ipv4Addr,
        local_port: u16,
        remote_addr: Ipv4Addr,
        remote_port: u16,
    ) -> Option<TcpConnection> {
        let connections = self.connections.lock().unwrap();
        connections.get(&(local_addr, local_port, remote_addr, remote_port)).cloned()
    }

    pub fn remove_connection(
        &self,
        local_addr: Ipv4Addr,
        local_port: u16,
        remote_addr: Ipv4Addr,
        remote_port: u16,
    ) {
        let mut connections = self.connections.lock().unwrap();
        connections.remove(&(local_addr, local_port, remote_addr, remote_port));
    }
}

impl Default for TcpConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tcp_flags() {
        let mut flags = TcpFlags::new();
        flags.syn = true;
        flags.ack = true;

        let byte = flags.to_u8();
        assert_eq!(byte, 0x12); // SYN (0x02) + ACK (0x10)

        let parsed = TcpFlags::from_u8(byte);
        assert_eq!(parsed.syn, true);
        assert_eq!(parsed.ack, true);
        assert_eq!(parsed.fin, false);
    }

    #[test]
    fn test_tcp_segment() {
        let mut flags = TcpFlags::new();
        flags.syn = true;

        let segment = TcpSegment::new(
            12345,
            80,
            1000,
            0,
            flags,
            65535,
            Vec::new(),
        );

        assert_eq!(segment.source_port, 12345);
        assert_eq!(segment.dest_port, 80);
        assert_eq!(segment.sequence_number, 1000);
        assert!(segment.flags.syn);
    }
}
