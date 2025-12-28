use std::io::{self, Read, Write};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DeviceError {
    #[error("Device not found")]
    DeviceNotFound,
    #[error("Permission denied")]
    PermissionDenied,
    #[error("IO error: {0}")]
    IoError(#[from] io::Error),
    #[error("Device already open")]
    AlreadyOpen,
}

/// ネットワークデバイスのトレイト
pub trait NetworkDevice: Send + Sync {
    /// デバイスを開く
    fn open(&mut self) -> Result<(), DeviceError>;

    /// デバイスを閉じる
    fn close(&mut self) -> Result<(), DeviceError>;

    /// パケットを送信
    fn send(&mut self, packet: &[u8]) -> Result<usize, DeviceError>;

    /// パケットを受信
    fn recv(&mut self, buffer: &mut [u8]) -> Result<usize, DeviceError>;

    /// デバイス名を取得
    fn name(&self) -> &str;

    /// MTU（Maximum Transmission Unit）を取得
    fn mtu(&self) -> usize;
}

/// TUN/TAPデバイス
#[derive(Debug)]
pub struct TunTapDevice {
    name: String,
    mtu: usize,
    is_open: bool,
    // In a real implementation, this would hold the actual device handle
    _handle: Option<()>,
}

impl TunTapDevice {
    pub fn new(name: String) -> Self {
        TunTapDevice {
            name,
            mtu: 1500,
            is_open: false,
            _handle: None,
        }
    }

    pub fn create_tun(name: &str) -> Result<Self, DeviceError> {
        Ok(TunTapDevice::new(name.to_string()))
    }

    pub fn create_tap(name: &str) -> Result<Self, DeviceError> {
        Ok(TunTapDevice::new(name.to_string()))
    }
}

impl NetworkDevice for TunTapDevice {
    fn open(&mut self) -> Result<(), DeviceError> {
        if self.is_open {
            return Err(DeviceError::AlreadyOpen);
        }

        // In a real implementation, open the TUN/TAP device
        self.is_open = true;
        Ok(())
    }

    fn close(&mut self) -> Result<(), DeviceError> {
        if !self.is_open {
            return Ok(());
        }

        // In a real implementation, close the TUN/TAP device
        self.is_open = false;
        Ok(())
    }

    fn send(&mut self, packet: &[u8]) -> Result<usize, DeviceError> {
        if !self.is_open {
            return Err(DeviceError::DeviceNotFound);
        }

        // In a real implementation, send the packet to the device
        Ok(packet.len())
    }

    fn recv(&mut self, buffer: &mut [u8]) -> Result<usize, DeviceError> {
        if !self.is_open {
            return Err(DeviceError::DeviceNotFound);
        }

        // In a real implementation, receive a packet from the device
        Ok(0)
    }

    fn name(&self) -> &str {
        &self.name
    }

    fn mtu(&self) -> usize {
        self.mtu
    }
}

/// モックネットワークデバイス（テスト用）
#[derive(Debug)]
pub struct MockDevice {
    name: String,
    mtu: usize,
    send_buffer: Vec<Vec<u8>>,
    recv_buffer: Vec<Vec<u8>>,
}

impl MockDevice {
    pub fn new(name: String) -> Self {
        MockDevice {
            name,
            mtu: 1500,
            send_buffer: Vec::new(),
            recv_buffer: Vec::new(),
        }
    }

    pub fn inject_packet(&mut self, packet: Vec<u8>) {
        self.recv_buffer.push(packet);
    }

    pub fn get_sent_packets(&self) -> &[Vec<u8>] {
        &self.send_buffer
    }
}

impl NetworkDevice for MockDevice {
    fn open(&mut self) -> Result<(), DeviceError> {
        Ok(())
    }

    fn close(&mut self) -> Result<(), DeviceError> {
        Ok(())
    }

    fn send(&mut self, packet: &[u8]) -> Result<usize, DeviceError> {
        self.send_buffer.push(packet.to_vec());
        Ok(packet.len())
    }

    fn recv(&mut self, buffer: &mut [u8]) -> Result<usize, DeviceError> {
        if let Some(packet) = self.recv_buffer.pop() {
            let len = std::cmp::min(buffer.len(), packet.len());
            buffer[..len].copy_from_slice(&packet[..len]);
            Ok(len)
        } else {
            Ok(0)
        }
    }

    fn name(&self) -> &str {
        &self.name
    }

    fn mtu(&self) -> usize {
        self.mtu
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_device() {
        let mut device = MockDevice::new("mock0".to_string());

        assert_eq!(device.name(), "mock0");
        assert_eq!(device.mtu(), 1500);

        let packet = vec![0x01, 0x02, 0x03, 0x04];
        device.inject_packet(packet.clone());

        let mut buffer = vec![0u8; 1024];
        let len = device.recv(&mut buffer).unwrap();

        assert_eq!(len, packet.len());
        assert_eq!(&buffer[..len], &packet[..]);
    }

    #[test]
    fn test_mock_device_send() {
        let mut device = MockDevice::new("mock0".to_string());

        let packet = vec![0xAA, 0xBB, 0xCC, 0xDD];
        let sent = device.send(&packet).unwrap();

        assert_eq!(sent, packet.len());
        assert_eq!(device.get_sent_packets().len(), 1);
        assert_eq!(device.get_sent_packets()[0], packet);
    }
}
