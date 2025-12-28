use std::net::{IpAddr, Ipv4Addr, SocketAddr as StdSocketAddr};
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use thiserror::Error;

use super::tcp::{TcpConnection, TcpConnectionManager, TcpState};
use super::udp::UdpDatagram;

#[derive(Debug, Error)]
pub enum SocketError {
    #[error("Socket not connected")]
    NotConnected,
    #[error("Socket already connected")]
    AlreadyConnected,
    #[error("Connection refused")]
    ConnectionRefused,
    #[error("Connection timeout")]
    ConnectionTimeout,
    #[error("Invalid address")]
    InvalidAddress,
    #[error("Buffer full")]
    BufferFull,
    #[error("Socket closed")]
    SocketClosed,
}

/// ソケットアドレス
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SocketAddr {
    pub ip: Ipv4Addr,
    pub port: u16,
}

impl SocketAddr {
    pub fn new(ip: Ipv4Addr, port: u16) -> Self {
        SocketAddr { ip, port }
    }

    pub fn from_std(addr: StdSocketAddr) -> Option<Self> {
        match addr.ip() {
            IpAddr::V4(ipv4) => Some(SocketAddr::new(ipv4, addr.port())),
            IpAddr::V6(_) => None,
        }
    }

    pub fn to_std(&self) -> StdSocketAddr {
        StdSocketAddr::new(IpAddr::V4(self.ip), self.port)
    }
}

/// ソケットの種類
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SocketType {
    Stream, // TCP
    Datagram, // UDP
}

/// ソケットの状態
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SocketState {
    Closed,
    Listening,
    Connected,
}

/// TCPソケット
#[derive(Debug)]
pub struct TcpSocket {
    local_addr: Option<SocketAddr>,
    remote_addr: Option<SocketAddr>,
    state: SocketState,
    connection: Option<TcpConnection>,
    recv_buffer: Arc<Mutex<VecDeque<u8>>>,
    send_buffer: Arc<Mutex<VecDeque<u8>>>,
    connection_manager: Arc<TcpConnectionManager>,
}

impl TcpSocket {
    pub fn new(connection_manager: Arc<TcpConnectionManager>) -> Self {
        TcpSocket {
            local_addr: None,
            remote_addr: None,
            state: SocketState::Closed,
            connection: None,
            recv_buffer: Arc::new(Mutex::new(VecDeque::new())),
            send_buffer: Arc::new(Mutex::new(VecDeque::new())),
            connection_manager,
        }
    }

    pub fn bind(&mut self, addr: SocketAddr) -> Result<(), SocketError> {
        self.local_addr = Some(addr);
        Ok(())
    }

    pub fn listen(&mut self) -> Result<(), SocketError> {
        if self.local_addr.is_none() {
            return Err(SocketError::InvalidAddress);
        }

        self.state = SocketState::Listening;
        Ok(())
    }

    pub fn connect(&mut self, remote_addr: SocketAddr) -> Result<(), SocketError> {
        if self.state != SocketState::Closed {
            return Err(SocketError::AlreadyConnected);
        }

        let local_addr = self.local_addr.ok_or(SocketError::InvalidAddress)?;

        // Create TCP connection
        let mut connection = TcpConnection::new(
            local_addr.ip,
            local_addr.port,
            remote_addr.ip,
            remote_addr.port,
        );
        connection.state = TcpState::SynSent;

        self.connection_manager.add_connection(connection.clone());
        self.connection = Some(connection);
        self.remote_addr = Some(remote_addr);
        self.state = SocketState::Connected;

        Ok(())
    }

    pub fn send(&self, data: &[u8]) -> Result<usize, SocketError> {
        if self.state != SocketState::Connected {
            return Err(SocketError::NotConnected);
        }

        let mut buffer = self.send_buffer.lock().unwrap();
        buffer.extend(data);
        Ok(data.len())
    }

    pub fn recv(&self, buf: &mut [u8]) -> Result<usize, SocketError> {
        if self.state != SocketState::Connected {
            return Err(SocketError::NotConnected);
        }

        let mut buffer = self.recv_buffer.lock().unwrap();
        let len = std::cmp::min(buf.len(), buffer.len());

        for i in 0..len {
            buf[i] = buffer.pop_front().unwrap();
        }

        Ok(len)
    }

    pub fn close(&mut self) -> Result<(), SocketError> {
        if let (Some(local), Some(remote)) = (self.local_addr, self.remote_addr) {
            self.connection_manager.remove_connection(
                local.ip,
                local.port,
                remote.ip,
                remote.port,
            );
        }

        self.state = SocketState::Closed;
        self.connection = None;
        Ok(())
    }
}

/// UDPソケット
#[derive(Debug)]
pub struct UdpSocket {
    local_addr: Option<SocketAddr>,
    recv_buffer: Arc<Mutex<VecDeque<(SocketAddr, Vec<u8>)>>>,
}

impl UdpSocket {
    pub fn new() -> Self {
        UdpSocket {
            local_addr: None,
            recv_buffer: Arc::new(Mutex::new(VecDeque::new())),
        }
    }

    pub fn bind(&mut self, addr: SocketAddr) -> Result<(), SocketError> {
        self.local_addr = Some(addr);
        Ok(())
    }

    pub fn send_to(&self, data: &[u8], addr: SocketAddr) -> Result<usize, SocketError> {
        let local = self.local_addr.ok_or(SocketError::InvalidAddress)?;

        let _datagram = UdpDatagram::new(local.port, addr.port, data.to_vec());

        // In a real implementation, this would send the datagram
        Ok(data.len())
    }

    pub fn recv_from(&self, buf: &mut [u8]) -> Result<(usize, SocketAddr), SocketError> {
        let mut buffer = self.recv_buffer.lock().unwrap();

        if let Some((addr, data)) = buffer.pop_front() {
            let len = std::cmp::min(buf.len(), data.len());
            buf[..len].copy_from_slice(&data[..len]);
            Ok((len, addr))
        } else {
            Err(SocketError::NotConnected)
        }
    }
}

impl Default for UdpSocket {
    fn default() -> Self {
        Self::new()
    }
}

/// 汎用ソケット
#[derive(Debug)]
pub enum Socket {
    Tcp(TcpSocket),
    Udp(UdpSocket),
}

impl Socket {
    pub fn tcp(connection_manager: Arc<TcpConnectionManager>) -> Self {
        Socket::Tcp(TcpSocket::new(connection_manager))
    }

    pub fn udp() -> Self {
        Socket::Udp(UdpSocket::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_socket_addr() {
        let addr = SocketAddr::new(Ipv4Addr::new(127, 0, 0, 1), 8080);
        assert_eq!(addr.ip, Ipv4Addr::new(127, 0, 0, 1));
        assert_eq!(addr.port, 8080);

        let std_addr = addr.to_std();
        let converted = SocketAddr::from_std(std_addr).unwrap();
        assert_eq!(converted, addr);
    }

    #[test]
    fn test_udp_socket_bind() {
        let mut socket = UdpSocket::new();
        let addr = SocketAddr::new(Ipv4Addr::new(0, 0, 0, 0), 5000);

        assert!(socket.bind(addr).is_ok());
        assert_eq!(socket.local_addr, Some(addr));
    }
}
