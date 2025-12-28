/// GRO/GSO (Generic Receive/Segmentation Offload)
/// 
/// 参考: Linux Kernel GRO/GSO
/// - パケット集約による処理効率化
/// - CPUオーバーヘッド削減
/// - スループット向上

use std::collections::HashMap;
use std::time::{Duration, Instant};
use super::tcp::TcpSegment;
use super::ip::Ipv4Packet;
use std::net::Ipv4Addr;

/// GROコンテキスト（パケット集約）
#[derive(Debug)]
pub struct GroContext {
    /// 5-tuple別の集約バッファ
    aggregated_packets: HashMap<FlowKey, AggregatedFlow>,
    /// 集約タイムアウト
    timeout: Duration,
    /// 最大集約サイズ
    max_aggregate_size: usize,
}

/// フロー識別キー
#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub struct FlowKey {
    pub src_ip: Ipv4Addr,
    pub dst_ip: Ipv4Addr,
    pub src_port: u16,
    pub dst_port: u16,
    pub protocol: u8,
}

impl FlowKey {
    pub fn new(src_ip: Ipv4Addr, dst_ip: Ipv4Addr, src_port: u16, dst_port: u16, protocol: u8) -> Self {
        FlowKey {
            src_ip,
            dst_ip,
            src_port,
            dst_port,
            protocol,
        }
    }
    
    pub fn from_tcp_segment(segment: &TcpSegment, src_ip: Ipv4Addr, dst_ip: Ipv4Addr) -> Self {
        FlowKey::new(
            src_ip,
            dst_ip,
            segment.source_port,
            segment.dest_port,
            6, // TCP
        )
    }
}

/// 集約されたフロー
#[derive(Debug)]
pub struct AggregatedFlow {
    /// 集約されたセグメント
    pub segments: Vec<TcpSegment>,
    /// 集約開始時刻
    pub start_time: Instant,
    /// 合計バイト数
    pub total_bytes: usize,
    /// ベースシーケンス番号
    pub base_seq: u32,
}

impl AggregatedFlow {
    pub fn new(segment: TcpSegment) -> Self {
        let base_seq = segment.sequence_number;
        let bytes = segment.payload.len();
        
        AggregatedFlow {
            segments: vec![segment],
            start_time: Instant::now(),
            total_bytes: bytes,
            base_seq,
        }
    }
    
    /// セグメントを追加可能か判定
    pub fn can_aggregate(&self, segment: &TcpSegment, max_size: usize) -> bool {
        // フラグが異なる場合は集約不可
        if segment.flags.syn || segment.flags.fin || segment.flags.rst {
            return false;
        }
        
        // サイズ制限チェック
        if self.total_bytes + segment.payload.len() > max_size {
            return false;
        }
        
        // シーケンス番号の連続性チェック
        let expected_seq = self.base_seq.wrapping_add(self.total_bytes as u32);
        if segment.sequence_number != expected_seq {
            return false;
        }
        
        true
    }
    
    /// セグメントを追加
    pub fn add_segment(&mut self, segment: TcpSegment) {
        self.total_bytes += segment.payload.len();
        self.segments.push(segment);
    }
    
    /// 集約されたセグメントを1つのセグメントにマージ
    pub fn merge(&self) -> TcpSegment {
        if self.segments.is_empty() {
            panic!("No segments to merge");
        }
        
        let first = &self.segments[0];
        let mut merged_payload = Vec::with_capacity(self.total_bytes);
        
        for segment in &self.segments {
            merged_payload.extend_from_slice(&segment.payload);
        }
        
        TcpSegment {
            source_port: first.source_port,
            dest_port: first.dest_port,
            sequence_number: first.sequence_number,
            acknowledgment_number: first.acknowledgment_number,
            data_offset: first.data_offset,
            flags: first.flags.clone(),
            window_size: first.window_size,
            checksum: 0, // 再計算が必要
            urgent_pointer: first.urgent_pointer,
            options: first.options.clone(),
            payload: merged_payload,
        }
    }
}

impl GroContext {
    pub fn new() -> Self {
        GroContext {
            aggregated_packets: HashMap::new(),
            timeout: Duration::from_micros(100), // 100μs
            max_aggregate_size: 65536, // 64KB
        }
    }
    
    /// パケットを集約処理
    pub fn aggregate(&mut self, segment: TcpSegment, src_ip: Ipv4Addr, dst_ip: Ipv4Addr) -> Option<TcpSegment> {
        let flow_key = FlowKey::from_tcp_segment(&segment, src_ip, dst_ip);
        
        // 既存のフローがあるか確認
        if let Some(flow) = self.aggregated_packets.get_mut(&flow_key) {
            // タイムアウトチェック
            if flow.start_time.elapsed() > self.timeout {
                // タイムアウト: 既存フローをフラッシュして新規開始
                let merged = flow.merge();
                *flow = AggregatedFlow::new(segment);
                return Some(merged);
            }
            
            // 集約可能かチェック
            if flow.can_aggregate(&segment, self.max_aggregate_size) {
                flow.add_segment(segment);
                return None; // まだ集約中
            } else {
                // 集約不可: 既存フローをフラッシュして新規開始
                let merged = flow.merge();
                *flow = AggregatedFlow::new(segment);
                return Some(merged);
            }
        } else {
            // 新規フロー
            self.aggregated_packets.insert(flow_key, AggregatedFlow::new(segment));
            return None;
        }
    }
    
    /// タイムアウトしたフローをフラッシュ
    pub fn flush_timeouts(&mut self) -> Vec<TcpSegment> {
        let mut flushed = Vec::new();
        let timeout = self.timeout;
        
        self.aggregated_packets.retain(|_, flow| {
            if flow.start_time.elapsed() > timeout {
                flushed.push(flow.merge());
                false
            } else {
                true
            }
        });
        
        flushed
    }
    
    /// 全フローを強制フラッシュ
    pub fn flush_all(&mut self) -> Vec<TcpSegment> {
        let mut flushed = Vec::new();
        
        for (_, flow) in self.aggregated_packets.drain() {
            flushed.push(flow.merge());
        }
        
        flushed
    }
    
    /// 統計情報
    pub fn stats(&self) -> GroStats {
        let mut total_segments = 0;
        let mut total_bytes = 0;
        
        for flow in self.aggregated_packets.values() {
            total_segments += flow.segments.len();
            total_bytes += flow.total_bytes;
        }
        
        GroStats {
            active_flows: self.aggregated_packets.len(),
            total_segments,
            total_bytes,
        }
    }
}

impl Default for GroContext {
    fn default() -> Self {
        Self::new()
    }
}

/// GRO統計情報
#[derive(Debug, Clone)]
pub struct GroStats {
    pub active_flows: usize,
    pub total_segments: usize,
    pub total_bytes: usize,
}

/// GSOコンテキスト（パケット分割）
#[derive(Debug)]
pub struct GsoContext {
    /// 最大セグメントサイズ
    mss: usize,
}

impl GsoContext {
    pub fn new(mss: usize) -> Self {
        GsoContext { mss }
    }
    
    /// 大きなセグメントを複数のMSSサイズのセグメントに分割
    pub fn segment(&self, large_segment: &TcpSegment) -> Vec<TcpSegment> {
        if large_segment.payload.len() <= self.mss {
            return vec![large_segment.clone()];
        }
        
        let mut segments = Vec::new();
        let mut offset = 0;
        let mut seq = large_segment.sequence_number;
        
        while offset < large_segment.payload.len() {
            let chunk_size = (large_segment.payload.len() - offset).min(self.mss);
            let chunk = large_segment.payload[offset..offset + chunk_size].to_vec();
            
            let mut segment = TcpSegment {
                source_port: large_segment.source_port,
                dest_port: large_segment.dest_port,
                sequence_number: seq,
                acknowledgment_number: large_segment.acknowledgment_number,
                data_offset: large_segment.data_offset,
                flags: large_segment.flags.clone(),
                window_size: large_segment.window_size,
                checksum: 0,
                urgent_pointer: large_segment.urgent_pointer,
                options: large_segment.options.clone(),
                payload: chunk,
            };
            
            // 最後のセグメント以外はFINフラグをクリア
            if offset + chunk_size < large_segment.payload.len() {
                segment.flags.fin = false;
            }
            
            segments.push(segment);
            
            offset += chunk_size;
            seq = seq.wrapping_add(chunk_size as u32);
        }
        
        segments
    }
    
    /// 統計情報
    pub fn calculate_efficiency(&self, original_size: usize, segment_count: usize) -> f64 {
        if segment_count == 0 {
            return 0.0;
        }
        
        let overhead = segment_count * 40; // TCP(20) + IP(20) header per segment
        let total_size = original_size + overhead;
        
        original_size as f64 / total_size as f64
    }
}

impl Default for GsoContext {
    fn default() -> Self {
        Self::new(1460) // Standard MSS for Ethernet
    }
}

/// TSO (TCP Segmentation Offload) - GSOの専用版
#[derive(Debug)]
pub struct TsoContext {
    gso: GsoContext,
    enabled: bool,
}

impl TsoContext {
    pub fn new(mss: usize) -> Self {
        TsoContext {
            gso: GsoContext::new(mss),
            enabled: true,
        }
    }
    
    pub fn enable(&mut self) {
        self.enabled = true;
    }
    
    pub fn disable(&mut self) {
        self.enabled = false;
    }
    
    pub fn segment(&self, segment: &TcpSegment) -> Vec<TcpSegment> {
        if !self.enabled {
            return vec![segment.clone()];
        }
        
        self.gso.segment(segment)
    }
}

impl Default for TsoContext {
    fn default() -> Self {
        Self::new(1460)
    }
}

/// LRO (Large Receive Offload) - GROの専用版
#[derive(Debug)]
pub struct LroContext {
    gro: GroContext,
    enabled: bool,
}

impl LroContext {
    pub fn new() -> Self {
        LroContext {
            gro: GroContext::new(),
            enabled: true,
        }
    }
    
    pub fn enable(&mut self) {
        self.enabled = true;
    }
    
    pub fn disable(&mut self) {
        self.enabled = false;
    }
    
    pub fn aggregate(&mut self, segment: TcpSegment, src_ip: Ipv4Addr, dst_ip: Ipv4Addr) -> Option<TcpSegment> {
        if !self.enabled {
            return Some(segment);
        }
        
        self.gro.aggregate(segment, src_ip, dst_ip)
    }
    
    pub fn flush_all(&mut self) -> Vec<TcpSegment> {
        self.gro.flush_all()
    }
}

impl Default for LroContext {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::tcp::TcpFlags;
    
    #[test]
    fn test_gro_aggregation() {
        let mut gro = GroContext::new();
        
        let src_ip = Ipv4Addr::new(192, 168, 1, 100);
        let dst_ip = Ipv4Addr::new(192, 168, 1, 1);
        
        // 3つの連続したセグメントを作成
        let seg1 = TcpSegment::new(
            12345,
            80,
            1000,
            2000,
            TcpFlags::new(),
            65535,
            vec![0xAA; 100],
        );
        
        let seg2 = TcpSegment::new(
            12345,
            80,
            1100,
            2000,
            TcpFlags::new(),
            65535,
            vec![0xBB; 100],
        );
        
        let seg3 = TcpSegment::new(
            12345,
            80,
            1200,
            2000,
            TcpFlags::new(),
            65535,
            vec![0xCC; 100],
        );
        
        // 集約
        assert!(gro.aggregate(seg1, src_ip, dst_ip).is_none());
        assert!(gro.aggregate(seg2, src_ip, dst_ip).is_none());
        assert!(gro.aggregate(seg3, src_ip, dst_ip).is_none());
        
        // フラッシュ
        let merged = gro.flush_all();
        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].payload.len(), 300);
    }
    
    #[test]
    fn test_gso_segmentation() {
        let gso = GsoContext::new(100);
        
        let large_segment = TcpSegment::new(
            12345,
            80,
            1000,
            2000,
            TcpFlags::new(),
            65535,
            vec![0xDD; 350],
        );
        
        let segments = gso.segment(&large_segment);
        
        // 350バイトを100バイトずつ分割 = 4セグメント
        assert_eq!(segments.len(), 4);
        assert_eq!(segments[0].payload.len(), 100);
        assert_eq!(segments[1].payload.len(), 100);
        assert_eq!(segments[2].payload.len(), 100);
        assert_eq!(segments[3].payload.len(), 50);
    }
    
    #[test]
    fn test_flow_key() {
        let key1 = FlowKey::new(
            Ipv4Addr::new(192, 168, 1, 1),
            Ipv4Addr::new(192, 168, 1, 2),
            12345,
            80,
            6,
        );
        
        let key2 = FlowKey::new(
            Ipv4Addr::new(192, 168, 1, 1),
            Ipv4Addr::new(192, 168, 1, 2),
            12345,
            80,
            6,
        );
        
        assert_eq!(key1, key2);
    }
}
