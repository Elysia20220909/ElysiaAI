use rayon::prelude::*;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use super::device::NetworkDevice;
use super::ethernet::EthernetFrame;
use super::capture::{PacketCapture, PacketAnalyzer};
use super::buffer::{RingBuffer, PacketPool};

/// パケット処理統計
#[derive(Debug, Default, Clone)]
pub struct ProcessingStats {
    pub packets_received: u64,
    pub packets_processed: u64,
    pub packets_dropped: u64,
    pub bytes_received: u64,
    pub processing_time_ns: u64,
}

/// 並列パケット処理エンジン
pub struct ParallelPacketEngine {
    worker_threads: usize,
    ring_buffer: Arc<RingBuffer>,
    packet_pool: Arc<Mutex<PacketPool>>,
    capture: Option<Arc<PacketCapture>>,
    analyzer: Option<Arc<PacketAnalyzer>>,
    stats: Arc<Mutex<ProcessingStats>>,
}

impl ParallelPacketEngine {
    pub fn new(worker_threads: usize, buffer_size: usize) -> Self {
        ParallelPacketEngine {
            worker_threads,
            ring_buffer: Arc::new(RingBuffer::new(buffer_size)),
            packet_pool: Arc::new(Mutex::new(PacketPool::new(1000, 2048))),
            capture: None,
            analyzer: None,
            stats: Arc::new(Mutex::new(ProcessingStats::default())),
        }
    }

    /// パケットキャプチャを有効化
    pub fn enable_capture(&mut self, capture: PacketCapture) {
        self.capture = Some(Arc::new(capture));
    }

    /// パケット分析を有効化
    pub fn enable_analyzer(&mut self, analyzer: PacketAnalyzer) {
        self.analyzer = Some(Arc::new(analyzer));
    }

    /// パケットをバッチ処理
    pub fn process_batch(&self, frames: Vec<Vec<u8>>) {
        let start = Instant::now();

        // 並列処理を使用してフレームを処理
        let results: Vec<_> = frames
            .par_iter()
            .filter_map(|data| {
                EthernetFrame::parse(data).ok()
            })
            .collect();

        // 統計を更新
        let mut stats = self.stats.lock().unwrap();
        stats.packets_received += frames.len() as u64;
        stats.packets_processed += results.len() as u64;
        stats.packets_dropped += (frames.len() - results.len()) as u64;
        stats.bytes_received += frames.iter().map(|f| f.len() as u64).sum::<u64>();
        stats.processing_time_ns += start.elapsed().as_nanos() as u64;

        // キャプチャと分析
        if let Some(capture) = &self.capture {
            for frame in &results {
                capture.capture_frame(frame);
            }
        }

        if let (Some(analyzer), Some(capture)) = (&self.analyzer, &self.capture) {
            for packet in capture.get_packets() {
                analyzer.analyze_packet(&packet);
            }
        }
    }

    /// パケット受信ループ（高速）
    pub fn receive_loop<D: NetworkDevice>(&self, device: &mut D, duration_secs: u64) {
        let start = Instant::now();
        let mut buffer = vec![0u8; 2048];

        while start.elapsed().as_secs() < duration_secs {
            match device.recv(&mut buffer) {
                Ok(len) if len > 0 => {
                    // リングバッファに書き込み
                    if self.ring_buffer.write(&buffer[..len]).is_ok() {
                        let mut stats = self.stats.lock().unwrap();
                        stats.packets_received += 1;
                        stats.bytes_received += len as u64;
                    }
                }
                _ => {}
            }
        }
    }

    /// 統計を取得
    pub fn get_stats(&self) -> ProcessingStats {
        self.stats.lock().unwrap().clone()
    }

    /// 統計をリセット
    pub fn reset_stats(&self) {
        *self.stats.lock().unwrap() = ProcessingStats::default();
    }

    /// スループットを計算 (packets/sec, Mbps)
    pub fn calculate_throughput(&self) -> (f64, f64) {
        let stats = self.get_stats();
        let time_secs = (stats.processing_time_ns as f64) / 1_000_000_000.0;

        if time_secs > 0.0 {
            let pps = (stats.packets_processed as f64) / time_secs;
            let mbps = ((stats.bytes_received as f64) * 8.0) / (time_secs * 1_000_000.0);
            (pps, mbps)
        } else {
            (0.0, 0.0)
        }
    }

    /// パフォーマンスレポートを表示
    pub fn print_performance_report(&self) {
        let stats = self.get_stats();
        let (pps, mbps) = self.calculate_throughput();

        println!("\n=== Performance Report ===");
        println!("Packets Received:  {}", stats.packets_received);
        println!("Packets Processed: {}", stats.packets_processed);
        println!("Packets Dropped:   {}", stats.packets_dropped);
        println!("Bytes Received:    {} ({:.2} MB)",
            stats.bytes_received,
            (stats.bytes_received as f64) / 1_000_000.0
        );
        println!("Processing Time:   {:.2} ms",
            (stats.processing_time_ns as f64) / 1_000_000.0
        );
        println!("Throughput:        {:.2} packets/sec, {:.2} Mbps", pps, mbps);

        if stats.packets_received > 0 {
            let drop_rate = (stats.packets_dropped as f64) / (stats.packets_received as f64) * 100.0;
            println!("Drop Rate:         {:.2}%", drop_rate);
        }
    }
}

/// パケット処理パイプライン
pub struct PacketPipeline {
    stages: Vec<Box<dyn Fn(&EthernetFrame) -> bool + Send + Sync>>,
}

impl PacketPipeline {
    pub fn new() -> Self {
        PacketPipeline {
            stages: Vec::new(),
        }
    }

    /// 処理ステージを追加
    pub fn add_stage<F>(&mut self, stage: F)
    where
        F: Fn(&EthernetFrame) -> bool + Send + Sync + 'static,
    {
        self.stages.push(Box::new(stage));
    }

    /// パケットをパイプラインで処理
    pub fn process(&self, frame: &EthernetFrame) -> bool {
        for stage in &self.stages {
            if !stage(frame) {
                return false; // パイプラインを中断
            }
        }
        true
    }

    /// バッチ処理（並列）
    pub fn process_batch(&self, frames: &[EthernetFrame]) -> Vec<bool> {
        frames
            .par_iter()
            .map(|frame| self.process(frame))
            .collect()
    }
}

impl Default for PacketPipeline {
    fn default() -> Self {
        Self::new()
    }
}

/// ハッシュベースのパケット分散
pub struct PacketDistributor {
    num_workers: usize,
}

impl PacketDistributor {
    pub fn new(num_workers: usize) -> Self {
        PacketDistributor { num_workers }
    }

    /// パケットをワーカーに分散
    pub fn distribute(&self, frames: Vec<EthernetFrame>) -> Vec<Vec<EthernetFrame>> {
        let mut worker_queues: Vec<Vec<EthernetFrame>> =
            (0..self.num_workers).map(|_| Vec::new()).collect();

        for frame in frames {
            let hash = self.hash_frame(&frame);
            let worker_id = hash % self.num_workers;
            worker_queues[worker_id].push(frame);
        }

        worker_queues
    }

    /// フレームをハッシュ化（5-tuple）
    fn hash_frame(&self, frame: &EthernetFrame) -> usize {
        // 簡易的なハッシュ実装
        let mut hash = 0usize;
        for byte in &frame.payload[..frame.payload.len().min(20)] {
            hash = hash.wrapping_mul(31).wrapping_add(*byte as usize);
        }
        hash
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::network::ethernet::*;

    #[test]
    fn test_parallel_engine_stats() {
        let engine = ParallelPacketEngine::new(4, 1024 * 1024);

        let frames = vec![
            vec![0u8; 100],
            vec![0u8; 200],
            vec![0u8; 150],
        ];

        engine.process_batch(frames);

        let stats = engine.get_stats();
        assert_eq!(stats.packets_received, 3);
    }

    #[test]
    fn test_packet_pipeline() {
        let mut pipeline = PacketPipeline::new();

        // ステージ1: サイズチェック
        pipeline.add_stage(|frame| frame.total_size() > 60);

        // ステージ2: EtherTypeチェック
        pipeline.add_stage(|frame| frame.ether_type == EtherType::Ipv4);

        let dst = MacAddress::new([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
        let src = MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
        let payload = vec![0u8; 100];

        let frame = EthernetFrame::new(dst, src, EtherType::Ipv4, payload);

        assert!(pipeline.process(&frame));
    }

    #[test]
    fn test_packet_distributor() {
        let distributor = PacketDistributor::new(4);

        let dst = MacAddress::new([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
        let src = MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);

        let frames: Vec<_> = (0..10)
            .map(|i| {
                let payload = vec![i as u8; 100];
                EthernetFrame::new(dst, src, EtherType::Ipv4, payload)
            })
            .collect();

        let distributed = distributor.distribute(frames);

        assert_eq!(distributed.len(), 4);

        let total: usize = distributed.iter().map(|q| q.len()).sum();
        assert_eq!(total, 10);
    }
}
