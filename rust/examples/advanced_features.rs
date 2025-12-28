use elysia_rust::network::*;
use std::net::Ipv4Addr;
use std::time::{Duration, Instant};

fn main() {
    println!("=== Advanced TCP/IP Stack Features Demo ===\n");

    // 1. TCP輻輳制御 - BBR
    demo_bbr_congestion_control();

    // 2. TCP輻輳制御 - CUBIC
    demo_cubic_congestion_control();

    // 3. パケットキャプチャと分析
    demo_packet_capture();

    // 4. ゼロコピーリングバッファ
    demo_ring_buffer();

    // 5. 並列パケット処理
    demo_parallel_processing();

    // 6. パケット処理パイプライン
    demo_packet_pipeline();

    println!("\n=== Demo Complete ===");
}

fn demo_bbr_congestion_control() {
    println!("1. TCP BBR Congestion Control Demo");
    println!("   BBR (Bottleneck Bandwidth and RTT) - Google開発の最新アルゴリズム");

    let mut bbr = congestion::BbrCongestionControl::new(10 * 1460);
    let now = Instant::now();

    println!("   初期 cwnd: {} bytes", bbr.cwnd);

    // ACKを受信してウィンドウを増やす
    for i in 1..=5 {
        bbr.on_ack(1460, Duration::from_millis(50 + i * 5), now);
        println!("   ACK {} - cwnd: {} bytes, 状態: {:?}",
            i, bbr.cwnd, bbr.state);
    }

    if let Some(rtt) = bbr.rtt_estimator.current_rtt() {
        println!("   推定RTT: {:.2} ms", rtt.as_secs_f64() * 1000.0);
    }
    println!("   推定帯域幅: {:.2} Mbps", bbr.btlbw * 8.0 / 1_000_000.0);
    println!("   ペーシングレート: {:.2} Mbps\n", bbr.pacing_rate() * 8.0 / 1_000_000.0);
}

fn demo_cubic_congestion_control() {
    println!("2. TCP CUBIC Congestion Control Demo");
    println!("   CUBIC - Linux標準の輻輳制御アルゴリズム");

    let mut cubic = congestion::CubicCongestionControl::new(10 * 1460);
    let now = Instant::now();

    println!("   初期 cwnd: {} bytes", cubic.cwnd);

    // スロースタート
    for i in 1..=3 {
        cubic.on_ack(1460, Duration::from_millis(30), now);
        println!("   ACK {} - cwnd: {} bytes, 状態: {:?}",
            i, cubic.cwnd, cubic.state);
    }

    // ロスを検出
    println!("   パケットロス検出！");
    cubic.on_loss();
    println!("   cwnd: {} bytes, ssthresh: {} bytes\n", cubic.cwnd, cubic.ssthresh);
}

fn demo_packet_capture() {
    println!("3. Packet Capture and Analysis Demo");
    println!("   Wireshark風のパケットキャプチャ機能");

    // フィルターを設定（TCPパケットのみ）
    let mut filter = capture::CaptureFilter::new();
    filter.protocol = Some(ip::IpProtocol::Tcp);

    let capture = capture::PacketCapture::new(filter, 1000);
    let analyzer = capture::PacketAnalyzer::new();

    // サンプルパケットを生成してキャプチャ
    for i in 0..5 {
        let src_mac = ethernet::MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
        let dst_mac = ethernet::MacAddress::new([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);

        let src_ip = Ipv4Addr::new(192, 168, 1, 100);
        let dst_ip = Ipv4Addr::new(192, 168, 1, 1);

        let mut tcp_flags = tcp::TcpFlags::new();
        tcp_flags.syn = i == 0;
        tcp_flags.ack = i > 0;

        let tcp_segment = tcp::TcpSegment::new(
            12345 + i,
            80,
            1000 * (i + 1) as u32,
            2000,
            tcp_flags,
            65535,
            format!("Packet {}", i).into_bytes(),
        );

        let tcp_bytes = tcp_segment.serialize(src_ip, dst_ip);
        let mut ip_packet = ip::Ipv4Packet::new(src_ip, dst_ip, ip::IpProtocol::Tcp, tcp_bytes);
        let ip_bytes = ip_packet.serialize();

        let frame = ethernet::EthernetFrame::new(
            dst_mac,
            src_mac,
            ethernet::EtherType::Ipv4,
            ip_bytes,
        );

        capture.capture_frame(&frame);
    }

    println!("   キャプチャしたパケット: {} 個", capture.packet_count());
    println!("   パケット一覧:");
    for (i, packet) in capture.get_packets().iter().enumerate() {
        println!("     {}. {}", i + 1, packet.format());
    }

    // 分析
    for packet in capture.get_packets() {
        analyzer.analyze_packet(&packet);
    }
    analyzer.print_summary();
    println!();
}

fn demo_ring_buffer() {
    println!("4. Zero-Copy Ring Buffer Demo");
    println!("   高速パケット処理用のゼロコピーバッファ");

    let buffer = buffer::RingBuffer::new(8192);

    println!("   バッファ容量: {} bytes", buffer.capacity());

    // データを書き込む
    let data1 = b"Hello, ";
    let data2 = b"Zero-Copy ";
    let data3 = b"World!";

    buffer.write(data1).unwrap();
    buffer.write(data2).unwrap();
    buffer.write(data3).unwrap();

    println!("   書き込み: {} bytes", data1.len() + data2.len() + data3.len());
    println!("   読み込み可能: {} bytes", buffer.available_read());

    // 読み出す
    let mut read_buf = vec![0u8; 100];
    let len = buffer.read(&mut read_buf).unwrap();

    println!("   読み出し: {} bytes", len);
    println!("   内容: {:?}", String::from_utf8_lossy(&read_buf[..len]));
    println!("   総スループット: {} bytes\n", buffer.total_bytes());
}

fn demo_parallel_processing() {
    println!("5. Parallel Packet Processing Demo");
    println!("   マルチコアCPUを活用した並列パケット処理");

    let engine = parallel::ParallelPacketEngine::new(4, 1024 * 1024);

    // サンプルパケットをバッチ生成
    let mut frames = Vec::new();
    for i in 0..100 {
        let src_mac = ethernet::MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, (i % 256) as u8]);
        let dst_mac = ethernet::MacAddress::BROADCAST;
        let payload = vec![(i % 256) as u8; 500];

        let frame = ethernet::EthernetFrame::new(
            dst_mac,
            src_mac,
            ethernet::EtherType::Ipv4,
            payload,
        );
        frames.push(frame.serialize());
    }

    println!("   バッチサイズ: {} パケット", frames.len());
    println!("   ワーカースレッド数: 4");

    // バッチ処理
    let start = Instant::now();
    engine.process_batch(frames);
    let elapsed = start.elapsed();

    println!("   処理時間: {:.2} ms", elapsed.as_secs_f64() * 1000.0);
    engine.print_performance_report();
    println!();
}

fn demo_packet_pipeline() {
    println!("6. Packet Processing Pipeline Demo");
    println!("   柔軟なパケット処理パイプライン");

    let mut pipeline = parallel::PacketPipeline::new();

    // ステージ1: サイズチェック
    pipeline.add_stage(|frame| {
        let ok = frame.total_size() >= 60;
        if !ok {
            println!("     パイプライン: サイズ不足 ({} bytes)", frame.total_size());
        }
        ok
    });

    // ステージ2: EtherTypeチェック
    pipeline.add_stage(|frame| {
        let ok = frame.ether_type == ethernet::EtherType::Ipv4;
        if !ok {
            println!("     パイプライン: IPv4以外のパケット");
        }
        ok
    });

    // ステージ3: 統計収集
    pipeline.add_stage(|frame| {
        println!("     パイプライン: パケット通過 (サイズ: {} bytes)", frame.total_size());
        true
    });

    // テストパケット
    let dst = ethernet::MacAddress::BROADCAST;
    let src = ethernet::MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
    let payload = vec![0u8; 100];

    let frame = ethernet::EthernetFrame::new(dst, src, ethernet::EtherType::Ipv4, payload);

    println!("   パケット処理開始:");
    let result = pipeline.process(&frame);
    println!("   結果: {}\n", if result { "成功" } else { "失敗" });
}
