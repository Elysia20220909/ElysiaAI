/// QUIC/HTTP3の基礎実装
///
/// 参考: IETF RFC 9000 (QUIC)
/// - UDP上の信頼性のある多重化プロトコル
/// - 0-RTT接続確立
/// - ストリーム多重化
/// - 組み込みのTLS 1.3暗号化

use std::collections::HashMap;
use std::time::{Duration, Instant};
use std::net::Ipv4Addr;

/// QUICパケットタイプ
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuicPacketType {
    /// Initial - 接続確立の最初のパケット
    Initial,
    /// 0-RTT - 早期データ送信
    ZeroRtt,
    /// Handshake - ハンドシェイク完了
    Handshake,
    /// Retry - サーバーからのリトライ要求
    Retry,
    /// Short - データ転送用の短いヘッダー
    Short,
}

/// QUICフレームタイプ
#[derive(Debug, Clone, PartialEq)]
pub enum QuicFrame {
    /// Padding
    Padding(usize),
    /// Ping
    Ping,
    /// ACK確認応答
    Ack {
        largest_acknowledged: u64,
        ack_delay: Duration,
        ack_ranges: Vec<(u64, u64)>,
    },
    /// データストリーム
    Stream {
        stream_id: u64,
        offset: u64,
        data: Vec<u8>,
        fin: bool,
    },
    /// ストリームリセット
    ResetStream {
        stream_id: u64,
        error_code: u64,
    },
    /// 接続クローズ
    ConnectionClose {
        error_code: u64,
        reason: String,
    },
    /// 最大データ制限
    MaxData {
        max_data: u64,
    },
    /// 最大ストリームデータ
    MaxStreamData {
        stream_id: u64,
        max_data: u64,
    },
    /// 新規接続ID
    NewConnectionId {
        sequence: u64,
        connection_id: Vec<u8>,
    },
}

/// QUICパケット
#[derive(Debug, Clone)]
pub struct QuicPacket {
    pub packet_type: QuicPacketType,
    pub destination_id: Vec<u8>,
    pub source_id: Vec<u8>,
    pub version: u32,
    pub packet_number: u64,
    pub frames: Vec<QuicFrame>,
}

impl QuicPacket {
    pub fn new(
        packet_type: QuicPacketType,
        dest_id: Vec<u8>,
        src_id: Vec<u8>,
        packet_number: u64,
    ) -> Self {
        QuicPacket {
            packet_type,
            destination_id: dest_id,
            source_id: src_id,
            version: 1, // QUIC v1
            packet_number,
            frames: Vec::new(),
        }
    }

    pub fn add_frame(&mut self, frame: QuicFrame) {
        self.frames.push(frame);
    }

    /// パケットをシリアライズ（簡略版）
    pub fn serialize(&self) -> Vec<u8> {
        let mut bytes = Vec::new();

        // Long/Short Header
        match self.packet_type {
            QuicPacketType::Short => {
                bytes.push(0x40); // Short header
            }
            _ => {
                bytes.push(0xC0 | self.packet_type as u8);
                // Version
                bytes.extend_from_slice(&self.version.to_be_bytes());
            }
        }

        // Connection IDs
        bytes.push(self.destination_id.len() as u8);
        bytes.extend_from_slice(&self.destination_id);

        if self.packet_type != QuicPacketType::Short {
            bytes.push(self.source_id.len() as u8);
            bytes.extend_from_slice(&self.source_id);
        }

        // Packet Number
        bytes.extend_from_slice(&self.packet_number.to_be_bytes());

        // Frames (簡略化)
        for frame in &self.frames {
            match frame {
                QuicFrame::Padding(size) => {
                    bytes.extend(vec![0x00; *size]);
                }
                QuicFrame::Ping => {
                    bytes.push(0x01);
                }
                QuicFrame::Stream { stream_id, offset, data, fin } => {
                    let frame_type = if *fin { 0x0F } else { 0x0E };
                    bytes.push(frame_type);
                    bytes.extend_from_slice(&stream_id.to_be_bytes());
                    bytes.extend_from_slice(&offset.to_be_bytes());
                    bytes.extend_from_slice(&(data.len() as u64).to_be_bytes());
                    bytes.extend_from_slice(data);
                }
                QuicFrame::ConnectionClose { error_code, reason } => {
                    bytes.push(0x1C);
                    bytes.extend_from_slice(&error_code.to_be_bytes());
                    bytes.extend_from_slice(reason.as_bytes());
                }
                _ => {
                    // 他のフレームタイプは省略
                }
            }
        }

        bytes
    }
}

/// QUICストリーム
#[derive(Debug)]
pub struct QuicStream {
    pub stream_id: u64,
    pub send_buf: Vec<u8>,
    pub recv_buf: Vec<u8>,
    pub send_offset: u64,
    pub recv_offset: u64,
    pub fin_sent: bool,
    pub fin_received: bool,
    pub max_stream_data: u64,
}

impl QuicStream {
    pub fn new(stream_id: u64) -> Self {
        QuicStream {
            stream_id,
            send_buf: Vec::new(),
            recv_buf: Vec::new(),
            send_offset: 0,
            recv_offset: 0,
            fin_sent: false,
            fin_received: false,
            max_stream_data: 1024 * 1024, // 1MB
        }
    }

    pub fn send(&mut self, data: &[u8]) -> Result<usize, String> {
        if self.fin_sent {
            return Err("Stream already closed".to_string());
        }

        if self.send_offset + data.len() as u64 > self.max_stream_data {
            return Err("Flow control limit exceeded".to_string());
        }

        self.send_buf.extend_from_slice(data);
        let sent = data.len();
        self.send_offset += sent as u64;
        Ok(sent)
    }

    pub fn recv(&mut self, max_len: usize) -> Vec<u8> {
        let len = self.recv_buf.len().min(max_len);
        let data = self.recv_buf.drain(..len).collect();
        data
    }

    pub fn close(&mut self) {
        self.fin_sent = true;
    }
}

/// QUIC接続
#[derive(Debug)]
pub struct QuicConnection {
    pub connection_id: Vec<u8>,
    pub peer_addr: Ipv4Addr,
    pub peer_port: u16,
    pub streams: HashMap<u64, QuicStream>,
    pub next_stream_id: u64,
    pub packet_number: u64,
    pub max_data: u64,
    pub established: bool,
    pub last_activity: Instant,
}

impl QuicConnection {
    pub fn new(connection_id: Vec<u8>, peer_addr: Ipv4Addr, peer_port: u16) -> Self {
        QuicConnection {
            connection_id,
            peer_addr,
            peer_port,
            streams: HashMap::new(),
            next_stream_id: 0,
            packet_number: 0,
            max_data: 10 * 1024 * 1024, // 10MB
            established: false,
            last_activity: Instant::now(),
        }
    }

    /// 新しいストリームを作成
    pub fn create_stream(&mut self) -> u64 {
        let stream_id = self.next_stream_id;
        self.streams.insert(stream_id, QuicStream::new(stream_id));
        self.next_stream_id += 4; // Client-initiated bidirectional
        stream_id
    }

    /// ストリームにデータを送信
    pub fn send_stream_data(&mut self, stream_id: u64, data: &[u8]) -> Result<usize, String> {
        let stream = self.streams.get_mut(&stream_id)
            .ok_or_else(|| "Stream not found".to_string())?;
        stream.send(data)
    }

    /// ストリームからデータを受信
    pub fn recv_stream_data(&mut self, stream_id: u64, max_len: usize) -> Result<Vec<u8>, String> {
        let stream = self.streams.get_mut(&stream_id)
            .ok_or_else(|| "Stream not found".to_string())?;
        Ok(stream.recv(max_len))
    }

    /// ストリームをクローズ
    pub fn close_stream(&mut self, stream_id: u64) -> Result<(), String> {
        let stream = self.streams.get_mut(&stream_id)
            .ok_or_else(|| "Stream not found".to_string())?;
        stream.close();
        Ok(())
    }

    /// パケットを作成
    pub fn create_packet(&mut self, packet_type: QuicPacketType) -> QuicPacket {
        let packet_number = self.packet_number;
        self.packet_number += 1;

        QuicPacket::new(
            packet_type,
            self.connection_id.clone(),
            vec![],
            packet_number,
        )
    }

    /// 活動を更新
    pub fn update_activity(&mut self) {
        self.last_activity = Instant::now();
    }

    /// アイドルタイムアウトをチェック
    pub fn is_idle(&self, timeout: Duration) -> bool {
        self.last_activity.elapsed() > timeout
    }
}

/// QUIC接続マネージャー
#[derive(Debug)]
pub struct QuicConnectionManager {
    connections: HashMap<Vec<u8>, QuicConnection>,
    idle_timeout: Duration,
}

impl QuicConnectionManager {
    pub fn new() -> Self {
        QuicConnectionManager {
            connections: HashMap::new(),
            idle_timeout: Duration::from_secs(30),
        }
    }

    /// 新しい接続を作成
    pub fn create_connection(&mut self, peer_addr: Ipv4Addr, peer_port: u16) -> Vec<u8> {
        let connection_id = self.generate_connection_id();
        let conn = QuicConnection::new(connection_id.clone(), peer_addr, peer_port);
        self.connections.insert(connection_id.clone(), conn);
        connection_id
    }

    /// 接続を取得
    pub fn get_connection(&mut self, connection_id: &[u8]) -> Option<&mut QuicConnection> {
        self.connections.get_mut(connection_id)
    }

    /// 接続を削除
    pub fn remove_connection(&mut self, connection_id: &[u8]) {
        self.connections.remove(connection_id);
    }

    /// アイドル接続をクリーンアップ
    pub fn cleanup_idle_connections(&mut self) {
        self.connections.retain(|_, conn| !conn.is_idle(self.idle_timeout));
    }

    /// 接続ID生成
    fn generate_connection_id(&self) -> Vec<u8> {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(0);

        let id = COUNTER.fetch_add(1, Ordering::SeqCst);
        id.to_be_bytes().to_vec()
    }

    /// 統計情報
    pub fn connection_count(&self) -> usize {
        self.connections.len()
    }
}

impl Default for QuicConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}

/// HTTP/3 over QUIC（概念実装）
#[derive(Debug)]
pub struct Http3Connection {
    quic_conn: QuicConnection,
    control_stream: Option<u64>,
    request_streams: HashMap<u64, Http3Request>,
}

#[derive(Debug)]
pub struct Http3Request {
    pub method: String,
    pub path: String,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
}

impl Http3Connection {
    pub fn new(quic_conn: QuicConnection) -> Self {
        Http3Connection {
            quic_conn,
            control_stream: None,
            request_streams: HashMap::new(),
        }
    }

    /// HTTPリクエストを送信
    pub fn send_request(&mut self, method: &str, path: &str, body: &[u8]) -> Result<u64, String> {
        let stream_id = self.quic_conn.create_stream();

        // HTTP/3 QPA CKフレーム（簡略版）
        let mut request_data = Vec::new();
        request_data.extend_from_slice(format!("{} {}\r\n", method, path).as_bytes());
        request_data.extend_from_slice(b"content-length: ");
        request_data.extend_from_slice(body.len().to_string().as_bytes());
        request_data.extend_from_slice(b"\r\n\r\n");
        request_data.extend_from_slice(body);

        self.quic_conn.send_stream_data(stream_id, &request_data)?;

        Ok(stream_id)
    }

    /// HTTPレスポンスを受信
    pub fn recv_response(&mut self, stream_id: u64) -> Result<Vec<u8>, String> {
        self.quic_conn.recv_stream_data(stream_id, 65536)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quic_packet_creation() {
        let mut packet = QuicPacket::new(
            QuicPacketType::Initial,
            vec![1, 2, 3, 4],
            vec![5, 6, 7, 8],
            0,
        );

        packet.add_frame(QuicFrame::Ping);
        packet.add_frame(QuicFrame::Stream {
            stream_id: 0,
            offset: 0,
            data: vec![0x48, 0x65, 0x6c, 0x6c, 0x6f], // "Hello"
            fin: false,
        });

        let serialized = packet.serialize();
        assert!(!serialized.is_empty());
    }

    #[test]
    fn test_quic_stream() {
        let mut stream = QuicStream::new(0);

        let data = b"Hello, QUIC!";
        let sent = stream.send(data).unwrap();
        assert_eq!(sent, data.len());

        stream.close();
        assert!(stream.fin_sent);
    }

    #[test]
    fn test_quic_connection() {
        let mut conn = QuicConnection::new(
            vec![1, 2, 3, 4],
            Ipv4Addr::new(127, 0, 0, 1),
            8080,
        );

        let stream_id = conn.create_stream();
        assert_eq!(stream_id, 0);

        conn.send_stream_data(stream_id, b"test data").unwrap();
        conn.close_stream(stream_id).unwrap();
    }
}
