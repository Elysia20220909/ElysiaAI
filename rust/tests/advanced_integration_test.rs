use elysia_rust::network::*;
use std::net::Ipv4Addr;
use std::sync::Arc;
use std::time::{Duration, Instant};
use std::fs;

/// BBR輻輳制御の統合テスト
#[test]
fn test_bbr_congestion_control_integration() {
    let mut bbr = congestion::BbrCongestionControl::new(10 * 1460);
    let now = Instant::now();

    // 初期状態の確認
    assert_eq!(bbr.state, congestion::CongestionState::SlowStart);
    assert_eq!(bbr.cwnd, 10 * 1460);

    // スロースタート期間
    for i in 0..10 {
        bbr.on_ack(1460, Duration::from_millis(50 + i), now);
    }

    // ウィンドウが増加していることを確認
    assert!(bbr.cwnd > 10 * 1460);

    // RTTが記録されていることを確認
    assert!(bbr.rtt_estimator.current_rtt().is_some());

    // 帯域幅推定が行われていることを確認
    assert!(bbr.btlbw > 0.0);

    // ペーシングレートが計算できることを確認
    let pacing_rate = bbr.pacing_rate();
    assert!(pacing_rate > 0.0);

    // パケットロス時の動作
    let cwnd_before_loss = bbr.cwnd;
    bbr.on_loss();
    assert_eq!(bbr.state, congestion::CongestionState::LossRecovery);
    assert!(bbr.cwnd <= cwnd_before_loss);
}

/// CUBIC輻輳制御の統合テスト
#[test]
fn test_cubic_congestion_control_integration() {
    let mut cubic = congestion::CubicCongestionControl::new(10 * 1460);
    let now = Instant::now();

    // 初期状態
    assert_eq!(cubic.state, congestion::CongestionState::SlowStart);

    // スロースタートフェーズ
    for _ in 0..5 {
        cubic.on_ack(1460, Duration::from_millis(30), now);
    }

    assert!(cubic.cwnd > 10 * 1460);

    // ssthreshに達したら輻輳回避に移行
    cubic.ssthresh = cubic.cwnd / 2;
    cubic.on_ack(1460, Duration::from_millis(30), now);

    // パケットロス検出
    let cwnd_before = cubic.cwnd;
    cubic.on_loss();

    assert_eq!(cubic.state, congestion::CongestionState::FastRecovery);
    assert!(cubic.cwnd < cwnd_before);
    assert!(cubic.ssthresh < cwnd_before);
    assert_eq!(cubic.w_max, cwnd_before as f64);

    // 回復フェーズ
    for _ in 0..10 {
        cubic.on_ack(1460, Duration::from_millis(30), now + Duration::from_secs(1));
    }

    // ウィンドウが回復していることを確認
    assert!(cubic.cwnd > cubic.ssthresh);
}

/// 輻輳制御マネージャーの統合テスト
#[test]
fn test_congestion_control_manager() {
    let bbr_manager = congestion::CongestionControlManager::new(
        congestion::CongestionControlAlgorithm::Bbr,
        10 * 1460,
    );

    let cubic_manager = congestion::CongestionControlManager::new(
        congestion::CongestionControlAlgorithm::Cubic,
        10 * 1460,
    );

    let now = Instant::now();

    // BBRマネージャー
    bbr_manager.on_ack(1460, Duration::from_millis(50), now);
    let bbr_cwnd = bbr_manager.current_cwnd();
    assert!(bbr_cwnd > 0);

    // CUBICマネージャー
    cubic_manager.on_ack(1460, Duration::from_millis(30), now);
    let cubic_cwnd = cubic_manager.current_cwnd();
    assert!(cubic_cwnd > 0);

    // ロス処理
    bbr_manager.on_loss();
    cubic_manager.on_loss();

    assert!(bbr_manager.current_cwnd() <= bbr_cwnd);
    assert!(cubic_manager.current_cwnd() <= cubic_cwnd);
}

/// RTT推定器の統合テスト
#[test]
fn test_rtt_estimator_integration() {
    let mut estimator = congestion::RttEstimator::new();

    // RTTサンプルを追加
    let samples = vec![
        Duration::from_millis(100),
        Duration::from_millis(110),
        Duration::from_millis(90),
        Duration::from_millis(105),
        Duration::from_millis(95),
    ];

    for sample in samples {
        estimator.add_sample(sample);
    }

    // SRTT（Smoothed RTT）が計算されている
    assert!(estimator.current_rtt().is_some());

    // 最小RTTが正しく追跡されている
    assert_eq!(estimator.min_rtt(), Duration::from_millis(90));

    // RTOが妥当な範囲内
    let rto = estimator.calculate_rto();
    assert!(rto >= Duration::from_secs(1));
    assert!(rto <= Duration::from_secs(60));
}

/// パケットキャプチャの統合テスト
#[test]
fn test_packet_capture_integration() {
    // TCPパケットのみをキャプチャするフィルター
    let mut filter = capture::CaptureFilter::new();
    filter.protocol = Some(ip::IpProtocol::Tcp);

    let capture = capture::PacketCapture::new(filter, 100);

    // テストパケットを生成してキャプチャ
    for i in 0..10 {
        let src_mac = ethernet::MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, i as u8]);
        let dst_mac = ethernet::MacAddress::BROADCAST;

        let src_ip = Ipv4Addr::new(192, 168, 1, 100 + i);
        let dst_ip = Ipv4Addr::new(192, 168, 1, 1);

        let mut tcp_flags = tcp::TcpFlags::new();
        tcp_flags.syn = i == 0;
        tcp_flags.ack = i > 0;

        let tcp_segment = tcp::TcpSegment::new(
            12345 + i as u16,
            80,
            1000 * (i + 1) as u32,
            2000,
            tcp_flags,
            65535,
            vec![0xAA, 0xBB, 0xCC],
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

    // キャプチャされたパケット数を確認
    assert_eq!(capture.packet_count(), 10);

    // パケット内容を確認
    let packets = capture.get_packets();
    assert_eq!(packets.len(), 10);

    // 最初のパケットはSYNフラグ
    assert!(packets[0].flags.as_ref().unwrap().contains("SYN"));

    // 2番目以降はACKフラグ
    for packet in &packets[1..] {
        assert!(packet.flags.as_ref().unwrap().contains("ACK"));
    }
}

/// パケット分析器の統合テスト
#[test]
fn test_packet_analyzer_integration() {
    let analyzer = capture::PacketAnalyzer::new();

    // 様々なプロトコルのパケットを生成
    let tcp_packet = capture::CapturedPacket {
        timestamp: 1000000,
        size: 100,
        protocol: ip::IpProtocol::Tcp,
        source_ip: Ipv4Addr::new(192, 168, 1, 100),
        dest_ip: Ipv4Addr::new(192, 168, 1, 1),
        source_port: Some(12345),
        dest_port: Some(80),
        raw_data: vec![],
        flags: Some("SYN".to_string()),
    };

    let udp_packet = capture::CapturedPacket {
        timestamp: 2000000,
        size: 200,
        protocol: ip::IpProtocol::Udp,
        source_ip: Ipv4Addr::new(10, 0, 0, 1),
        dest_ip: Ipv4Addr::new(10, 0, 0, 2),
        source_port: Some(53000),
        dest_port: Some(53),
        raw_data: vec![],
        flags: None,
    };

    // 複数回同じフローのパケットを送信
    for _ in 0..5 {
        analyzer.analyze_packet(&tcp_packet);
    }

    for _ in 0..3 {
        analyzer.analyze_packet(&udp_packet);
    }

    // 統計を確認
    let stats = analyzer.get_stats();
    assert_eq!(stats.tcp_packets, 5);
    assert_eq!(stats.udp_packets, 3);
    assert_eq!(stats.tcp_bytes, 500);
    assert_eq!(stats.udp_bytes, 600);  // 3パケット x 200バイト
    assert_eq!(stats.total_bytes, 1100);

    // トップフローを確認
    let top_flows = analyzer.get_top_flows(10);
    assert!(top_flows.len() >= 2);

    // UDPフローが最大バイト数（3パケット x 200 = 600バイト）
    let (_, flow_stats) = &top_flows[0];
    assert_eq!(flow_stats.bytes, 600);
}

/// キャプチャフィルターの統合テスト
#[test]
fn test_capture_filter_integration() {
    // ポート80のHTTPトラフィックのみをキャプチャ
    let mut filter = capture::CaptureFilter::new();
    filter.protocol = Some(ip::IpProtocol::Tcp);
    filter.dest_port = Some(80);

    let matching_packet = capture::CapturedPacket {
        timestamp: 0,
        size: 100,
        protocol: ip::IpProtocol::Tcp,
        source_ip: Ipv4Addr::new(192, 168, 1, 100),
        dest_ip: Ipv4Addr::new(192, 168, 1, 1),
        source_port: Some(12345),
        dest_port: Some(80),
        raw_data: vec![],
        flags: None,
    };

    let non_matching_packet = capture::CapturedPacket {
        timestamp: 0,
        size: 100,
        protocol: ip::IpProtocol::Tcp,
        source_ip: Ipv4Addr::new(192, 168, 1, 100),
        dest_ip: Ipv4Addr::new(192, 168, 1, 1),
        source_port: Some(12345),
        dest_port: Some(443),
        raw_data: vec![],
        flags: None,
    };

    assert!(filter.matches(&matching_packet));
    assert!(!filter.matches(&non_matching_packet));
}

/// ゼロコピーリングバッファの統合テスト
#[test]
fn test_ring_buffer_integration() {
    let buffer = buffer::RingBuffer::new(4096);

    // 大量のデータを書き込み・読み込み
    let mut total_written = 0u64;
    let mut total_read = 0u64;

    for i in 0..100 {
        let data = vec![i as u8; 100];
        if let Ok(_) = buffer.write(&data) {
            total_written += data.len() as u64;
        }

        let mut read_buf = vec![0u8; 50];
        if let Ok(len) = buffer.read(&mut read_buf) {
            total_read += len as u64;
        }
    }

    assert!(total_written > 0);
    assert!(total_read > 0);
    assert!(total_written > total_read);

    // 残りのデータを読み出す
    let mut read_buf = vec![0u8; 10000];
    while buffer.available_read() > 0 {
        if let Ok(len) = buffer.read(&mut read_buf) {
            total_read += len as u64;
        } else {
            break;
        }
    }

    // バッファフルで書き込みが失敗した可能性があるため、
    // total_read <= total_written であればOK
    assert!(total_read <= total_written);
    assert!(total_read > 0);
}

/// リングバッファのラップアラウンドテスト
#[test]
fn test_ring_buffer_wraparound_integration() {
    let buffer = buffer::RingBuffer::new(256);

    // バッファを満たす
    let data1 = vec![0xAAu8; 200];
    buffer.write(&data1).unwrap();

    // 一部読み出す
    let mut read_buf = vec![0u8; 150];
    let len = buffer.read(&mut read_buf).unwrap();
    assert_eq!(len, 150);

    // 再度書き込み（ラップアラウンド発生）
    let data2 = vec![0xBBu8; 150];
    buffer.write(&data2).unwrap();

    // 残りを全て読み出す
    let mut read_buf2 = vec![0u8; 300];
    let len1 = buffer.read(&mut read_buf2).unwrap();

    // 最初のデータの残り50バイト + 新しいデータ150バイト = 200バイト
    assert_eq!(len1, 200);

    // 最初の50バイトは0xAA
    assert_eq!(&read_buf2[..50], &vec![0xAAu8; 50][..]);
    // 次の150バイトは0xBB
    assert_eq!(&read_buf2[50..200], &vec![0xBBu8; 150][..]);
}

/// パケットプールの統合テスト
#[test]
fn test_packet_pool_integration() {
    let mut pool = buffer::PacketPool::new(10, 1500);

    // バッファを複数取得
    let mut buffers = Vec::new();
    for _ in 0..5 {
        if let Some(buf) = pool.acquire() {
            buffers.push(buf);
        }
    }

    assert_eq!(pool.allocated_count(), 5);

    // バッファを返却
    for buf in buffers {
        pool.release(buf);
    }

    assert_eq!(pool.allocated_count(), 0);

    // 再度取得（再利用される）
    let buf = pool.acquire().unwrap();
    assert_eq!(pool.allocated_count(), 1);
}

/// 並列パケット処理エンジンの統合テスト
#[test]
fn test_parallel_engine_integration() {
    let engine = parallel::ParallelPacketEngine::new(4, 1024 * 1024);

    // テストパケットをバッチ生成
    let mut frames = Vec::new();
    for i in 0..50 {
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

    // バッチ処理
    engine.process_batch(frames);

    let stats = engine.get_stats();
    assert_eq!(stats.packets_received, 50);

    // スループットを計算
    let (pps, mbps) = engine.calculate_throughput();
    assert!(pps >= 0.0);
    assert!(mbps >= 0.0);
}

/// パケットパイプラインの統合テスト
#[test]
fn test_packet_pipeline_integration() {
    let mut pipeline = parallel::PacketPipeline::new();

    let stage1_count = 0;
    let stage2_count = 0;
    let stage3_count = 0;

    // ステージ1: サイズフィルタ
    pipeline.add_stage(move |frame| {
        let _ = &stage1_count;
        frame.total_size() >= 64
    });

    // ステージ2: タイプフィルタ
    pipeline.add_stage(move |frame| {
        let _ = &stage2_count;
        frame.ether_type == ethernet::EtherType::Ipv4
    });

    // ステージ3: 常に通過
    pipeline.add_stage(move |_frame| {
        let _ = &stage3_count;
        true
    });

    // 合格パケット
    let dst = ethernet::MacAddress::BROADCAST;
    let src = ethernet::MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
    let payload = vec![0u8; 100];
    let frame1 = ethernet::EthernetFrame::new(dst, src, ethernet::EtherType::Ipv4, payload);

    assert!(pipeline.process(&frame1));

    // 不合格パケット（小さすぎる）
    let small_payload = vec![0u8; 10];
    let frame2 = ethernet::EthernetFrame::new(dst, src, ethernet::EtherType::Ipv4, small_payload);

    assert!(!pipeline.process(&frame2));

    // 不合格パケット（ARP）
    let arp_payload = vec![0u8; 100];
    let frame3 = ethernet::EthernetFrame::new(dst, src, ethernet::EtherType::Arp, arp_payload);

    assert!(!pipeline.process(&frame3));
}

/// パケット分散の統合テスト
#[test]
fn test_packet_distributor_integration() {
    let distributor = parallel::PacketDistributor::new(8);

    let dst = ethernet::MacAddress::BROADCAST;
    let src = ethernet::MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);

    // 様々なパケットを生成
    let frames: Vec<_> = (0..100)
        .map(|i| {
            let payload = vec![i as u8; 100 + (i % 50)];
            ethernet::EthernetFrame::new(dst, src, ethernet::EtherType::Ipv4, payload)
        })
        .collect();

    let distributed = distributor.distribute(frames);

    // 全ワーカーに分散されている
    assert_eq!(distributed.len(), 8);

    // 合計パケット数が保たれている
    let total: usize = distributed.iter().map(|q| q.len()).sum();
    assert_eq!(total, 100);

    // 各ワーカーがパケットを受け取っている
    let non_empty_workers = distributed.iter().filter(|q| !q.is_empty()).count();
    assert!(non_empty_workers > 0);
}

/// フルスタック統合テスト（全機能統合）
#[test]
fn test_full_stack_integration() {
    // 輻輳制御
    let mut bbr = congestion::BbrCongestionControl::new(10 * 1460);

    // パケットキャプチャ
    let mut filter = capture::CaptureFilter::new();
    filter.protocol = Some(ip::IpProtocol::Tcp);
    let capture = capture::PacketCapture::new(filter, 1000);

    // パケット分析
    let analyzer = capture::PacketAnalyzer::new();

    // 並列処理エンジン
    let engine = parallel::ParallelPacketEngine::new(4, 1024 * 1024);

    // パケットパイプライン
    let mut pipeline = parallel::PacketPipeline::new();
    pipeline.add_stage(|frame| frame.total_size() >= 64);
    pipeline.add_stage(|frame| frame.ether_type == ethernet::EtherType::Ipv4);

    let now = Instant::now();

    // パケットを生成して全機能を通す
    let mut all_frames = Vec::new();
    for i in 0..20 {
        let src_mac = ethernet::MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, i as u8]);
        let dst_mac = ethernet::MacAddress::BROADCAST;

        let src_ip = Ipv4Addr::new(192, 168, 1, 100 + (i % 50));
        let dst_ip = Ipv4Addr::new(192, 168, 1, 1);

        let mut tcp_flags = tcp::TcpFlags::new();
        tcp_flags.syn = i == 0;
        tcp_flags.ack = i > 0;

        let tcp_segment = tcp::TcpSegment::new(
            12345,
            80,
            1000 * (i + 1) as u32,
            2000,
            tcp_flags,
            65535,
            vec![0xCC; 100],
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

        // パイプライン処理
        if pipeline.process(&frame) {
            // キャプチャ
            capture.capture_frame(&frame);

            // 輻輳制御更新
            bbr.on_ack(frame.payload.len() as u32, Duration::from_millis(50), now);

            all_frames.push(frame.serialize());
        }
    }

    // 並列処理
    engine.process_batch(all_frames);

    // 分析
    for packet in capture.get_packets() {
        analyzer.analyze_packet(&packet);
    }

    // 全機能が正常に動作していることを確認
    assert!(capture.packet_count() > 0);
    assert!(bbr.cwnd > 10 * 1460);
    assert!(bbr.rtt_estimator.current_rtt().is_some());

    let stats = analyzer.get_stats();
    assert!(stats.tcp_packets > 0);
    assert!(stats.total_bytes > 0);

    let engine_stats = engine.get_stats();
    assert!(engine_stats.packets_received > 0);
}

/// PCAP保存の統合テスト
#[test]
fn test_pcap_writer_integration() {
    let pcap_path = "test_capture.pcap";

    // PCAPファイルに保存
    {
        let mut filter = capture::CaptureFilter::new();
        filter.protocol = Some(ip::IpProtocol::Tcp);

        let mut capture = capture::PacketCapture::new(filter, 100);
        capture.enable_pcap_output(pcap_path).unwrap();

        // テストパケットを生成
        for i in 0..5 {
            let src_mac = ethernet::MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, i as u8]);
            let dst_mac = ethernet::MacAddress::BROADCAST;

            let src_ip = Ipv4Addr::new(192, 168, 1, 100);
            let dst_ip = Ipv4Addr::new(192, 168, 1, 1);

            let mut tcp_flags = tcp::TcpFlags::new();
            tcp_flags.syn = true;

            let tcp_segment = tcp::TcpSegment::new(
                12345,
                80,
                1000,
                0,
                tcp_flags,
                65535,
                vec![0xDD; 50],
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
    }

    // ファイルが作成されていることを確認
    assert!(std::path::Path::new(pcap_path).exists());

    // ファイルサイズが妥当（ヘッダー + パケットデータ）
    let metadata = fs::metadata(pcap_path).unwrap();
    assert!(metadata.len() > 24); // PCAPグローバルヘッダーサイズ

    // クリーンアップ
    fs::remove_file(pcap_path).ok();
}

/// 高負荷時の統合テスト
#[test]
fn test_high_load_integration() {
    let engine = parallel::ParallelPacketEngine::new(8, 10 * 1024 * 1024);
    let _analyzer = capture::PacketAnalyzer::new();

    // 大量のパケットを生成
    let mut frames = Vec::new();
    for i in 0..1000 {
        let src_mac = ethernet::MacAddress::new([
            (i >> 8) as u8,
            i as u8,
            0x22,
            0x33,
            0x44,
            0x55,
        ]);
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

    // バッチ処理
    let start = Instant::now();
    engine.process_batch(frames);
    let elapsed = start.elapsed();

    let stats = engine.get_stats();
    assert_eq!(stats.packets_received, 1000);

    // パフォーマンスを確認
    let (pps, mbps) = engine.calculate_throughput();
    println!("Performance: {:.2} pps, {:.2} Mbps in {:?}", pps, mbps, elapsed);

    // 妥当な処理速度であることを確認（デバッグビルドでも動作）
    assert!(elapsed < Duration::from_secs(5));
}
