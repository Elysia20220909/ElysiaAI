use elysia_rust::network::*;
use std::net::Ipv4Addr;

/// eBPFパケットフィルタのテスト
#[test]
fn test_ebpf_tcp_syn_filter() {
    let program = ebpf::BpfProgramBuilder::new("tcp_syn_filter")
        .tcp_syn_filter()
        .build()
        .unwrap();

    assert!(program.verify().is_ok());

    let mut vm = ebpf::BpfInterpreter::new();

    // TCPパケット（簡略化）
    let mut packet_data = vec![0u8; 100];
    packet_data[23] = 6; // TCP protocol
    packet_data[47] = 0x02; // SYN flag

    vm.load_packet(packet_data);
    let result = vm.execute(&program).unwrap();

    // プログラムが正常に実行されればOK（返り値は実装依存）
    assert!(result != 0);
}

/// eBPF算術演算のテスト
#[test]
fn test_ebpf_arithmetic() {
    let mut program = ebpf::BpfProgram::new("arithmetic");

    // R0 = 100
    program.add_instruction(ebpf::BpfInstruction::Store(0, 100));
    // R1 = 50
    program.add_instruction(ebpf::BpfInstruction::Store(1, 50));
    // R0 = R0 + R1 = 150
    program.add_instruction(ebpf::BpfInstruction::Add(0, 1));
    // R2 = 2
    program.add_instruction(ebpf::BpfInstruction::Store(2, 2));
    // R0 = R0 * R2 = 300
    program.add_instruction(ebpf::BpfInstruction::Mul(0, 2));
    program.add_instruction(ebpf::BpfInstruction::Return(0));

    let mut vm = ebpf::BpfInterpreter::new();
    let result = vm.execute(&program).unwrap();

    assert_eq!(result, 300);
}

/// eBPF条件分岐のテスト
#[test]
fn test_ebpf_conditional() {
    let mut program = ebpf::BpfProgram::new("conditional");

    // R0 = 200
    program.add_instruction(ebpf::BpfInstruction::Store(0, 200));
    // if R0 > 100, jump +2
    program.add_instruction(ebpf::BpfInstruction::JumpGreater(0, 100, 2));
    // else: R0 = 0
    program.add_instruction(ebpf::BpfInstruction::Store(0, 0));
    program.add_instruction(ebpf::BpfInstruction::Return(0));
    // then: R0 = 1
    program.add_instruction(ebpf::BpfInstruction::Store(0, 1));
    program.add_instruction(ebpf::BpfInstruction::Return(0));

    let mut vm = ebpf::BpfInterpreter::new();
    let result = vm.execute(&program).unwrap();

    assert_eq!(result, 1);
}

/// eBPF JITコンパイラのテスト
#[test]
fn test_ebpf_jit_compiler() {
    let mut program = ebpf::BpfProgram::new("simple");
    program.add_instruction(ebpf::BpfInstruction::Store(0, 42));
    program.add_instruction(ebpf::BpfInstruction::Return(0));

    let mut jit = ebpf::BpfJitCompiler::new();
    assert!(jit.compile(&program).is_ok());

    let native_code = jit.native_code();
    assert!(!native_code.is_empty());
}

/// QUIC接続のテスト
#[test]
fn test_quic_connection() {
    let mut conn = quic::QuicConnection::new(
        vec![1, 2, 3, 4],
        Ipv4Addr::new(192, 168, 1, 1),
        443,
    );

    // ストリーム作成
    let stream_id = conn.create_stream();
    assert_eq!(stream_id, 0);

    // データ送信
    let sent = conn.send_stream_data(stream_id, b"Hello, QUIC!").unwrap();
    assert_eq!(sent, 12);

    // ストリームクローズ
    conn.close_stream(stream_id).unwrap();
}

/// QUIC接続マネージャーのテスト
#[test]
fn test_quic_connection_manager() {
    let mut manager = quic::QuicConnectionManager::new();

    // 接続作成
    let conn_id1 = manager.create_connection(Ipv4Addr::new(192, 168, 1, 1), 443);
    let conn_id2 = manager.create_connection(Ipv4Addr::new(192, 168, 1, 2), 443);

    assert_eq!(manager.connection_count(), 2);

    // 接続取得
    let conn = manager.get_connection(&conn_id1).unwrap();
    let stream_id = conn.create_stream();
    conn.send_stream_data(stream_id, b"test").unwrap();

    // 接続削除
    manager.remove_connection(&conn_id2);
    assert_eq!(manager.connection_count(), 1);
}

/// QUICパケットのシリアライズ
#[test]
fn test_quic_packet_serialization() {
    let mut packet = quic::QuicPacket::new(
        quic::QuicPacketType::Initial,
        vec![1, 2, 3, 4],
        vec![5, 6, 7, 8],
        0,
    );

    packet.add_frame(quic::QuicFrame::Ping);
    packet.add_frame(quic::QuicFrame::Stream {
        stream_id: 0,
        offset: 0,
        data: b"Hello".to_vec(),
        fin: false,
    });

    let serialized = packet.serialize();
    assert!(!serialized.is_empty());
    assert!(serialized.len() > 20); // ヘッダー + データ
}

/// HTTP/3リクエストのテスト
#[test]
fn test_http3_request() {
    let quic_conn = quic::QuicConnection::new(
        vec![1, 2, 3, 4],
        Ipv4Addr::new(192, 168, 1, 1),
        443,
    );

    let mut http3 = quic::Http3Connection::new(quic_conn);

    let stream_id = http3.send_request("GET", "/index.html", b"").unwrap();
    assert_eq!(stream_id, 0);
}

/// GRO パケット集約のテスト
#[test]
fn test_gro_aggregation() {
    let mut gro = offload::GroContext::new();

    let src_ip = Ipv4Addr::new(192, 168, 1, 100);
    let dst_ip = Ipv4Addr::new(192, 168, 1, 1);

    // 連続した3つのセグメント
    let seg1 = tcp::TcpSegment::new(
        12345, 80, 1000, 2000,
        tcp::TcpFlags::new(), 65535,
        vec![0xAA; 100],
    );

    let seg2 = tcp::TcpSegment::new(
        12345, 80, 1100, 2000,
        tcp::TcpFlags::new(), 65535,
        vec![0xBB; 100],
    );

    let seg3 = tcp::TcpSegment::new(
        12345, 80, 1200, 2000,
        tcp::TcpFlags::new(), 65535,
        vec![0xCC; 100],
    );

    // 集約（タイムアウト前）
    assert!(gro.aggregate(seg1, src_ip, dst_ip).is_none());
    assert!(gro.aggregate(seg2, src_ip, dst_ip).is_none());
    assert!(gro.aggregate(seg3, src_ip, dst_ip).is_none());

    // 強制フラッシュ
    let merged = gro.flush_all();
    assert_eq!(merged.len(), 1);
    assert_eq!(merged[0].payload.len(), 300); // 100 * 3
}

/// GRO 統計情報のテスト
#[test]
fn test_gro_stats() {
    let mut gro = offload::GroContext::new();

    let src_ip = Ipv4Addr::new(192, 168, 1, 100);
    let dst_ip = Ipv4Addr::new(192, 168, 1, 1);

    let segment = tcp::TcpSegment::new(
        12345, 80, 1000, 2000,
        tcp::TcpFlags::new(), 65535,
        vec![0xDD; 200],
    );

    gro.aggregate(segment, src_ip, dst_ip);

    let stats = gro.stats();
    assert_eq!(stats.active_flows, 1);
    assert_eq!(stats.total_segments, 1);
    assert_eq!(stats.total_bytes, 200);
}

/// GSO パケット分割のテスト
#[test]
fn test_gso_segmentation() {
    let gso = offload::GsoContext::new(100); // MSS=100

    // 350バイトの大きなセグメント
    let large_segment = tcp::TcpSegment::new(
        12345, 80, 1000, 2000,
        tcp::TcpFlags::new(), 65535,
        vec![0xEE; 350],
    );

    let segments = gso.segment(&large_segment);

    // 100バイトずつ分割 = 4セグメント
    assert_eq!(segments.len(), 4);
    assert_eq!(segments[0].payload.len(), 100);
    assert_eq!(segments[1].payload.len(), 100);
    assert_eq!(segments[2].payload.len(), 100);
    assert_eq!(segments[3].payload.len(), 50);

    // シーケンス番号が正しく増加
    assert_eq!(segments[0].sequence_number, 1000);
    assert_eq!(segments[1].sequence_number, 1100);
    assert_eq!(segments[2].sequence_number, 1200);
    assert_eq!(segments[3].sequence_number, 1300);
}

/// GSO 効率計算のテスト
#[test]
fn test_gso_efficiency() {
    let gso = offload::GsoContext::new(1460);

    let efficiency = gso.calculate_efficiency(10000, 7);
    // 10000 bytes data / (10000 + 7 * 40 overhead)
    assert!(efficiency > 0.97);
    assert!(efficiency < 1.0);
}

/// TSO (TCP Segmentation Offload) のテスト
#[test]
fn test_tso_context() {
    let mut tso = offload::TsoContext::new(1460);

    let large_segment = tcp::TcpSegment::new(
        12345, 80, 1000, 2000,
        tcp::TcpFlags::new(), 65535,
        vec![0xFF; 5000],
    );

    // TSO有効
    tso.enable();
    let segments_enabled = tso.segment(&large_segment);
    assert!(segments_enabled.len() > 1);

    // TSO無効
    tso.disable();
    let segments_disabled = tso.segment(&large_segment);
    assert_eq!(segments_disabled.len(), 1);
}

/// LRO (Large Receive Offload) のテスト
#[test]
fn test_lro_context() {
    let mut lro = offload::LroContext::new();

    let src_ip = Ipv4Addr::new(10, 0, 0, 1);
    let dst_ip = Ipv4Addr::new(10, 0, 0, 2);

    let segment = tcp::TcpSegment::new(
        54321, 8080, 5000, 6000,
        tcp::TcpFlags::new(), 32768,
        vec![0x11; 150],
    );

    // LRO有効
    lro.enable();
    let result = lro.aggregate(segment.clone(), src_ip, dst_ip);
    assert!(result.is_none()); // 集約中

    // LRO無効
    lro.disable();
    let result = lro.aggregate(segment, src_ip, dst_ip);
    assert!(result.is_some()); // そのまま返す
}

/// フローキーのテスト
#[test]
fn test_flow_key() {
    let key1 = offload::FlowKey::new(
        Ipv4Addr::new(192, 168, 1, 1),
        Ipv4Addr::new(192, 168, 1, 2),
        12345,
        80,
        6,
    );

    let key2 = offload::FlowKey::new(
        Ipv4Addr::new(192, 168, 1, 1),
        Ipv4Addr::new(192, 168, 1, 2),
        12345,
        80,
        6,
    );

    let key3 = offload::FlowKey::new(
        Ipv4Addr::new(192, 168, 1, 1),
        Ipv4Addr::new(192, 168, 1, 2),
        12346, // 異なるポート
        80,
        6,
    );

    assert_eq!(key1, key2);
    assert_ne!(key1, key3);
}

/// 統合テスト: eBPF + QUIC + GRO
#[test]
fn test_advanced_features_integration() {
    // eBPFフィルタ
    let bpf_program = ebpf::BpfProgramBuilder::new("filter")
        .tcp_syn_filter()
        .build()
        .unwrap();

    // QUIC接続マネージャー
    let mut quic_mgr = quic::QuicConnectionManager::new();
    let conn_id = quic_mgr.create_connection(Ipv4Addr::new(127, 0, 0, 1), 443);

    // GRO/GSO
    let mut gro = offload::GroContext::new();
    let gso = offload::GsoContext::new(1460);

    // すべてが正常に動作することを確認
    assert!(bpf_program.verify().is_ok());
    assert_eq!(quic_mgr.connection_count(), 1);
    assert!(gro.stats().active_flows == 0);
    assert!(gso.calculate_efficiency(1000, 1) > 0.9);
}
