use elysia_rust::network::*;
use std::net::Ipv4Addr;
use std::sync::Arc;

#[test]
fn test_full_tcp_stack() {
    // 1. Create an Ethernet frame with an IPv4 packet containing a TCP segment

    // Create TCP segment
    let mut tcp_flags = tcp::TcpFlags::new();
    tcp_flags.syn = true;

    let tcp_payload = b"Hello, TCP!".to_vec();
    let tcp_segment = tcp::TcpSegment::new(
        12345,
        80,
        1000,
        0,
        tcp_flags,
        65535,
        tcp_payload.clone(),
    );

    let src_ip = Ipv4Addr::new(192, 168, 1, 100);
    let dst_ip = Ipv4Addr::new(192, 168, 1, 1);
    let tcp_bytes = tcp_segment.serialize(src_ip, dst_ip);

    // Create IPv4 packet
    let mut ip_packet = ip::Ipv4Packet::new(
        src_ip,
        dst_ip,
        ip::IpProtocol::Tcp,
        tcp_bytes,
    );
    let ip_bytes = ip_packet.serialize();

    // Create Ethernet frame
    let src_mac = ethernet::MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
    let dst_mac = ethernet::MacAddress::new([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);
    let eth_frame = ethernet::EthernetFrame::new(
        dst_mac,
        src_mac,
        ethernet::EtherType::Ipv4,
        ip_bytes.clone(),
    );

    let frame_bytes = eth_frame.serialize();

    // 2. Parse the frame back
    let parsed_frame = ethernet::EthernetFrame::parse(&frame_bytes).unwrap();
    assert_eq!(parsed_frame.source, src_mac);
    assert_eq!(parsed_frame.destination, dst_mac);
    assert_eq!(parsed_frame.ether_type, ethernet::EtherType::Ipv4);

    // 3. Parse the IPv4 packet
    let parsed_ip = ip::Ipv4Packet::parse(&parsed_frame.payload).unwrap();
    assert_eq!(parsed_ip.source, src_ip);
    assert_eq!(parsed_ip.destination, dst_ip);
    assert_eq!(parsed_ip.protocol, ip::IpProtocol::Tcp);
    assert!(parsed_ip.verify_checksum());

    // 4. Parse the TCP segment
    let parsed_tcp = tcp::TcpSegment::parse(&parsed_ip.payload).unwrap();
    assert_eq!(parsed_tcp.source_port, 12345);
    assert_eq!(parsed_tcp.dest_port, 80);
    assert_eq!(parsed_tcp.sequence_number, 1000);
    assert!(parsed_tcp.flags.syn);
    assert_eq!(parsed_tcp.payload, tcp_payload);
}

#[test]
fn test_full_udp_stack() {
    // Create UDP datagram
    let udp_payload = b"DNS Query Data".to_vec();
    let src_ip = Ipv4Addr::new(10, 0, 0, 1);
    let dst_ip = Ipv4Addr::new(10, 0, 0, 2);

    let udp_datagram = udp::UdpDatagram::new(53000, 53, udp_payload.clone());
    let udp_bytes = udp_datagram.serialize(src_ip, dst_ip);

    // Create IPv4 packet
    let mut ip_packet = ip::Ipv4Packet::new(
        src_ip,
        dst_ip,
        ip::IpProtocol::Udp,
        udp_bytes,
    );
    let ip_bytes = ip_packet.serialize();

    // Create Ethernet frame
    let src_mac = ethernet::MacAddress::new([0x11, 0x22, 0x33, 0x44, 0x55, 0x66]);
    let dst_mac = ethernet::MacAddress::new([0x77, 0x88, 0x99, 0xAA, 0xBB, 0xCC]);
    let eth_frame = ethernet::EthernetFrame::new(
        dst_mac,
        src_mac,
        ethernet::EtherType::Ipv4,
        ip_bytes,
    );

    let frame_bytes = eth_frame.serialize();

    // Parse back
    let parsed_frame = ethernet::EthernetFrame::parse(&frame_bytes).unwrap();
    let parsed_ip = ip::Ipv4Packet::parse(&parsed_frame.payload).unwrap();
    let parsed_udp = udp::UdpDatagram::parse(&parsed_ip.payload).unwrap();

    assert_eq!(parsed_udp.source_port, 53000);
    assert_eq!(parsed_udp.dest_port, 53);
    assert_eq!(parsed_udp.payload, udp_payload);
    assert!(parsed_udp.verify_checksum(src_ip, dst_ip));
}

#[test]
fn test_socket_tcp_communication() {
    let connection_manager = Arc::new(tcp::TcpConnectionManager::new());

    // Create server socket
    let mut server_socket = socket::TcpSocket::new(connection_manager.clone());
    let server_addr = socket::SocketAddr::new(Ipv4Addr::new(127, 0, 0, 1), 8080);
    server_socket.bind(server_addr).unwrap();
    server_socket.listen().unwrap();

    // Create client socket
    let mut client_socket = socket::TcpSocket::new(connection_manager.clone());
    let client_addr = socket::SocketAddr::new(Ipv4Addr::new(127, 0, 0, 1), 12345);
    client_socket.bind(client_addr).unwrap();

    // In a real implementation, connect would establish the connection
    // For this test, we just verify the setup
    assert_eq!(server_socket.local_addr, Some(server_addr));
    assert_eq!(client_socket.local_addr, Some(client_addr));
}

#[test]
fn test_network_device_mock() {
    let mut device = device::MockDevice::new("test0".to_string());

    device.open().unwrap();

    // Test sending
    let packet1 = vec![0x01, 0x02, 0x03, 0x04];
    let packet2 = vec![0x05, 0x06, 0x07, 0x08];

    device.send(&packet1).unwrap();
    device.send(&packet2).unwrap();

    let sent_packets = device.get_sent_packets();
    assert_eq!(sent_packets.len(), 2);
    assert_eq!(sent_packets[0], packet1);
    assert_eq!(sent_packets[1], packet2);

    // Test receiving
    let inject_packet = vec![0xAA, 0xBB, 0xCC, 0xDD];
    device.inject_packet(inject_packet.clone());

    let mut recv_buffer = vec![0u8; 1024];
    let len = device.recv(&mut recv_buffer).unwrap();
    assert_eq!(len, inject_packet.len());
    assert_eq!(&recv_buffer[..len], &inject_packet[..]);

    device.close().unwrap();
}

#[test]
fn test_tcp_connection_manager() {
    let manager = tcp::TcpConnectionManager::new();

    let local_ip = Ipv4Addr::new(192, 168, 1, 100);
    let remote_ip = Ipv4Addr::new(192, 168, 1, 1);

    let conn = tcp::TcpConnection::new(local_ip, 12345, remote_ip, 80);

    manager.add_connection(conn.clone());

    let retrieved = manager.get_connection(local_ip, 12345, remote_ip, 80);
    assert!(retrieved.is_some());

    let retrieved_conn = retrieved.unwrap();
    assert_eq!(retrieved_conn.local_addr, local_ip);
    assert_eq!(retrieved_conn.local_port, 12345);
    assert_eq!(retrieved_conn.remote_addr, remote_ip);
    assert_eq!(retrieved_conn.remote_port, 80);

    manager.remove_connection(local_ip, 12345, remote_ip, 80);

    let after_remove = manager.get_connection(local_ip, 12345, remote_ip, 80);
    assert!(after_remove.is_none());
}

#[test]
fn test_ip_checksum_validation() {
    let src = Ipv4Addr::new(10, 0, 0, 1);
    let dst = Ipv4Addr::new(10, 0, 0, 2);
    let payload = vec![0x01, 0x02, 0x03, 0x04];

    let mut packet = ip::Ipv4Packet::new(src, dst, ip::IpProtocol::Tcp, payload);
    let serialized = packet.serialize();

    // Parse and verify checksum
    let parsed = ip::Ipv4Packet::parse(&serialized).unwrap();
    assert!(parsed.verify_checksum());

    // Corrupt the packet and verify checksum fails
    let mut corrupted = serialized.clone();
    corrupted[10] ^= 0xFF; // Flip bits in the first byte of source IP

    let parsed_corrupted = ip::Ipv4Packet::parse(&corrupted).unwrap();
    assert!(!parsed_corrupted.verify_checksum());
}
