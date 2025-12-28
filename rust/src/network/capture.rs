use std::collections::HashMap;
use std::fs::File;
use std::io::{self, Write};
use std::net::Ipv4Addr;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use super::ethernet::{EthernetFrame, MacAddress, EtherType};
use super::ip::{Ipv4Packet, IpProtocol};
use super::tcp::TcpSegment;
use super::udp::UdpDatagram;

/// パケットキャプチャのフィルター
#[derive(Debug, Clone)]
pub struct CaptureFilter {
    pub protocol: Option<IpProtocol>,
    pub source_ip: Option<Ipv4Addr>,
    pub dest_ip: Option<Ipv4Addr>,
    pub source_port: Option<u16>,
    pub dest_port: Option<u16>,
}

impl CaptureFilter {
    pub fn new() -> Self {
        CaptureFilter {
            protocol: None,
            source_ip: None,
            dest_ip: None,
            source_port: None,
            dest_port: None,
        }
    }
    
    pub fn matches(&self, packet: &CapturedPacket) -> bool {
        if let Some(proto) = self.protocol {
            if packet.protocol != proto {
                return false;
            }
        }
        
        if let Some(src_ip) = self.source_ip {
            if packet.source_ip != src_ip {
                return false;
            }
        }
        
        if let Some(dst_ip) = self.dest_ip {
            if packet.dest_ip != dst_ip {
                return false;
            }
        }
        
        if let Some(src_port) = self.source_port {
            if packet.source_port != Some(src_port) {
                return false;
            }
        }
        
        if let Some(dst_port) = self.dest_port {
            if packet.dest_port != Some(dst_port) {
                return false;
            }
        }
        
        true
    }
}

impl Default for CaptureFilter {
    fn default() -> Self {
        Self::new()
    }
}

/// キャプチャされたパケット情報
#[derive(Debug, Clone)]
pub struct CapturedPacket {
    pub timestamp: u64,
    pub size: usize,
    pub protocol: IpProtocol,
    pub source_ip: Ipv4Addr,
    pub dest_ip: Ipv4Addr,
    pub source_port: Option<u16>,
    pub dest_port: Option<u16>,
    pub raw_data: Vec<u8>,
    pub flags: Option<String>,
}

impl CapturedPacket {
    /// パケットを人間が読める形式で表示
    pub fn format(&self) -> String {
        let time = self.timestamp as f64 / 1_000_000.0;
        let proto = format!("{:?}", self.protocol);
        
        let ports = if let (Some(src), Some(dst)) = (self.source_port, self.dest_port) {
            format!(":{} -> :{}", src, dst)
        } else {
            String::new()
        };
        
        let flags = self.flags.as_ref().map(|f| format!(" [{}]", f)).unwrap_or_default();
        
        format!(
            "{:10.6} {:6} {} -> {} {} bytes{}{}",
            time,
            proto,
            self.source_ip,
            self.dest_ip,
            self.size,
            ports,
            flags
        )
    }
}

/// パケットキャプチャエンジン
pub struct PacketCapture {
    filter: CaptureFilter,
    packets: Arc<Mutex<Vec<CapturedPacket>>>,
    max_packets: usize,
    pcap_writer: Option<Arc<Mutex<PcapWriter>>>,
}

impl PacketCapture {
    pub fn new(filter: CaptureFilter, max_packets: usize) -> Self {
        PacketCapture {
            filter,
            packets: Arc::new(Mutex::new(Vec::new())),
            max_packets,
            pcap_writer: None,
        }
    }
    
    /// PCAPファイルへの書き込みを有効化
    pub fn enable_pcap_output<P: AsRef<Path>>(&mut self, path: P) -> io::Result<()> {
        let writer = PcapWriter::new(path)?;
        self.pcap_writer = Some(Arc::new(Mutex::new(writer)));
        Ok(())
    }
    
    /// Ethernetフレームをキャプチャ
    pub fn capture_frame(&self, frame: &EthernetFrame) {
        if frame.ether_type != EtherType::Ipv4 {
            return;
        }
        
        if let Ok(ip_packet) = Ipv4Packet::parse(&frame.payload) {
            let mut captured = CapturedPacket {
                timestamp: Self::current_timestamp_micros(),
                size: frame.total_size(),
                protocol: ip_packet.protocol,
                source_ip: ip_packet.source,
                dest_ip: ip_packet.destination,
                source_port: None,
                dest_port: None,
                raw_data: frame.serialize(),
                flags: None,
            };
            
            // TCPまたはUDPの場合、ポート情報を抽出
            match ip_packet.protocol {
                IpProtocol::Tcp => {
                    if let Ok(tcp) = TcpSegment::parse(&ip_packet.payload) {
                        captured.source_port = Some(tcp.source_port);
                        captured.dest_port = Some(tcp.dest_port);
                        captured.flags = Some(Self::format_tcp_flags(&tcp));
                    }
                }
                IpProtocol::Udp => {
                    if let Ok(udp) = UdpDatagram::parse(&ip_packet.payload) {
                        captured.source_port = Some(udp.source_port);
                        captured.dest_port = Some(udp.dest_port);
                    }
                }
                _ => {}
            }
            
            // フィルターに一致する場合のみ保存
            if self.filter.matches(&captured) {
                let mut packets = self.packets.lock().unwrap();
                packets.push(captured.clone());
                
                // 最大数を超えたら古いものから削除
                if packets.len() > self.max_packets {
                    packets.remove(0);
                }
                
                // PCAPファイルに書き込み
                if let Some(writer) = &self.pcap_writer {
                    let _ = writer.lock().unwrap().write_packet(&captured);
                }
            }
        }
    }
    
    /// キャプチャしたパケットを取得
    pub fn get_packets(&self) -> Vec<CapturedPacket> {
        self.packets.lock().unwrap().clone()
    }
    
    /// パケット数を取得
    pub fn packet_count(&self) -> usize {
        self.packets.lock().unwrap().len()
    }
    
    /// キャプチャをクリア
    pub fn clear(&self) {
        self.packets.lock().unwrap().clear();
    }
    
    fn current_timestamp_micros() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_micros() as u64
    }
    
    fn format_tcp_flags(tcp: &TcpSegment) -> String {
        let mut flags = Vec::new();
        if tcp.flags.syn { flags.push("SYN"); }
        if tcp.flags.ack { flags.push("ACK"); }
        if tcp.flags.fin { flags.push("FIN"); }
        if tcp.flags.rst { flags.push("RST"); }
        if tcp.flags.psh { flags.push("PSH"); }
        if tcp.flags.urg { flags.push("URG"); }
        flags.join(",")
    }
}

/// PCAP形式でのパケット保存
pub struct PcapWriter {
    file: File,
}

impl PcapWriter {
    pub fn new<P: AsRef<Path>>(path: P) -> io::Result<Self> {
        let mut file = File::create(path)?;
        
        // PCAPグローバルヘッダーを書き込み
        Self::write_pcap_header(&mut file)?;
        
        Ok(PcapWriter { file })
    }
    
    fn write_pcap_header(file: &mut File) -> io::Result<()> {
        // Magic number (microsecond precision)
        file.write_all(&0xa1b2c3d4u32.to_le_bytes())?;
        // Version major
        file.write_all(&2u16.to_le_bytes())?;
        // Version minor
        file.write_all(&4u16.to_le_bytes())?;
        // Timezone offset
        file.write_all(&0i32.to_le_bytes())?;
        // Timestamp accuracy
        file.write_all(&0u32.to_le_bytes())?;
        // Snapshot length
        file.write_all(&65535u32.to_le_bytes())?;
        // Link layer type (Ethernet)
        file.write_all(&1u32.to_le_bytes())?;
        
        Ok(())
    }
    
    pub fn write_packet(&mut self, packet: &CapturedPacket) -> io::Result<()> {
        let ts_sec = (packet.timestamp / 1_000_000) as u32;
        let ts_usec = (packet.timestamp % 1_000_000) as u32;
        
        // パケットヘッダー
        self.file.write_all(&ts_sec.to_le_bytes())?;
        self.file.write_all(&ts_usec.to_le_bytes())?;
        self.file.write_all(&(packet.raw_data.len() as u32).to_le_bytes())?;
        self.file.write_all(&(packet.raw_data.len() as u32).to_le_bytes())?;
        
        // パケットデータ
        self.file.write_all(&packet.raw_data)?;
        
        Ok(())
    }
}

/// プロトコル統計
#[derive(Debug, Default, Clone)]
pub struct ProtocolStats {
    pub tcp_packets: u64,
    pub udp_packets: u64,
    pub icmp_packets: u64,
    pub total_bytes: u64,
    pub tcp_bytes: u64,
    pub udp_bytes: u64,
}

/// パケット分析ツール
pub struct PacketAnalyzer {
    stats: Arc<Mutex<ProtocolStats>>,
    flow_table: Arc<Mutex<HashMap<String, FlowStats>>>,
}

#[derive(Debug, Clone)]
pub struct FlowStats {
    pub packets: u64,
    pub bytes: u64,
    pub first_seen: u64,
    pub last_seen: u64,
}

impl PacketAnalyzer {
    pub fn new() -> Self {
        PacketAnalyzer {
            stats: Arc::new(Mutex::new(ProtocolStats::default())),
            flow_table: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    
    pub fn analyze_packet(&self, packet: &CapturedPacket) {
        let mut stats = self.stats.lock().unwrap();
        stats.total_bytes += packet.size as u64;
        
        match packet.protocol {
            IpProtocol::Tcp => {
                stats.tcp_packets += 1;
                stats.tcp_bytes += packet.size as u64;
            }
            IpProtocol::Udp => {
                stats.udp_packets += 1;
                stats.udp_bytes += packet.size as u64;
            }
            IpProtocol::Icmp => {
                stats.icmp_packets += 1;
            }
        }
        
        // フロー統計を更新
        if let (Some(src_port), Some(dst_port)) = (packet.source_port, packet.dest_port) {
            let flow_key = format!(
                "{}:{} -> {}:{}",
                packet.source_ip, src_port, packet.dest_ip, dst_port
            );
            
            let mut flows = self.flow_table.lock().unwrap();
            let flow = flows.entry(flow_key).or_insert(FlowStats {
                packets: 0,
                bytes: 0,
                first_seen: packet.timestamp,
                last_seen: packet.timestamp,
            });
            
            flow.packets += 1;
            flow.bytes += packet.size as u64;
            flow.last_seen = packet.timestamp;
        }
    }
    
    pub fn get_stats(&self) -> ProtocolStats {
        self.stats.lock().unwrap().clone()
    }
    
    pub fn get_top_flows(&self, n: usize) -> Vec<(String, FlowStats)> {
        let flows = self.flow_table.lock().unwrap();
        let mut sorted: Vec<_> = flows.iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();
        sorted.sort_by(|a, b| b.1.bytes.cmp(&a.1.bytes));
        sorted.truncate(n);
        sorted
    }
    
    pub fn print_summary(&self) {
        let stats = self.get_stats();
        
        println!("\n=== Packet Analysis Summary ===");
        println!("Total Packets: {}", stats.tcp_packets + stats.udp_packets + stats.icmp_packets);
        println!("  TCP: {} packets ({} bytes)", stats.tcp_packets, stats.tcp_bytes);
        println!("  UDP: {} packets ({} bytes)", stats.udp_packets, stats.udp_bytes);
        println!("  ICMP: {} packets", stats.icmp_packets);
        println!("Total Bytes: {}", stats.total_bytes);
        
        println!("\nTop 10 Flows:");
        for (i, (flow, stats)) in self.get_top_flows(10).iter().enumerate() {
            println!("  {}. {} - {} packets, {} bytes", i + 1, flow, stats.packets, stats.bytes);
        }
    }
}

impl Default for PacketAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_capture_filter() {
        let mut filter = CaptureFilter::new();
        filter.protocol = Some(IpProtocol::Tcp);
        
        let packet = CapturedPacket {
            timestamp: 0,
            size: 100,
            protocol: IpProtocol::Tcp,
            source_ip: Ipv4Addr::new(192, 168, 1, 1),
            dest_ip: Ipv4Addr::new(192, 168, 1, 2),
            source_port: Some(12345),
            dest_port: Some(80),
            raw_data: vec![],
            flags: None,
        };
        
        assert!(filter.matches(&packet));
    }

    #[test]
    fn test_packet_analyzer() {
        let analyzer = PacketAnalyzer::new();
        
        let packet = CapturedPacket {
            timestamp: 0,
            size: 100,
            protocol: IpProtocol::Tcp,
            source_ip: Ipv4Addr::new(10, 0, 0, 1),
            dest_ip: Ipv4Addr::new(10, 0, 0, 2),
            source_port: Some(5000),
            dest_port: Some(6000),
            raw_data: vec![],
            flags: None,
        };
        
        analyzer.analyze_packet(&packet);
        
        let stats = analyzer.get_stats();
        assert_eq!(stats.tcp_packets, 1);
        assert_eq!(stats.total_bytes, 100);
    }
}
