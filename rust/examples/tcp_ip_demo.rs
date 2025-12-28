use elysia_rust::network::*;
use std::net::Ipv4Addr;
use std::sync::Arc;

fn main() {
    println!("=== TCP/IP Stack Demo ===\n");

    // 1. Ethernet Frame Example
    println!("1. Ethernet Frame Example");
    let dst_mac = ethernet::MacAddress::new([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    let src_mac = ethernet::MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
    let payload = vec![0x01, 0x02, 0x03, 0x04];

    let frame = ethernet::EthernetFrame::new(
        dst_mac,
        src_mac,
        ethernet::EtherType::Ipv4,
        payload.clone(),
    );

    println!("  Source MAC: {}", frame.source);
    println!("  Destination MAC: {}", frame.destination);
    println!("  EtherType: {:?}", frame.ether_type);
    println!("  Frame size: {} bytes\n", frame.total_size());

    // 2. IPv4 Packet Example
    println!("2. IPv4 Packet Example");
    let src_ip = Ipv4Addr::new(192, 168, 1, 100);
    let dst_ip = Ipv4Addr::new(192, 168, 1, 1);
    let ip_payload = vec![0xAA, 0xBB, 0xCC, 0xDD];

    let mut ip_packet = ip::Ipv4Packet::new(
        src_ip,
        dst_ip,
        ip::IpProtocol::Tcp,
        ip_payload,
    );

    println!("  Source IP: {}", ip_packet.source);
    println!("  Destination IP: {}", ip_packet.destination);
    println!("  Protocol: {:?}", ip_packet.protocol);
    println!("  TTL: {}", ip_packet.ttl);

    let serialized = ip_packet.serialize();
    println!("  Packet size: {} bytes", serialized.len());
    println!("  Checksum valid: {}\n", ip_packet.verify_checksum());

    // 3. TCP Segment Example
    println!("3. TCP Segment Example");
    let mut tcp_flags = tcp::TcpFlags::new();
    tcp_flags.syn = true;
    tcp_flags.ack = true;

    let tcp_segment = tcp::TcpSegment::new(
        12345, // source port
        80,    // destination port (HTTP)
        1000,  // sequence number
        2000,  // acknowledgment number
        tcp_flags,
        65535, // window size
        vec![0x48, 0x65, 0x6C, 0x6C, 0x6F], // "Hello" payload
    );

    println!("  Source Port: {}", tcp_segment.source_port);
    println!("  Destination Port: {}", tcp_segment.dest_port);
    println!("  Sequence Number: {}", tcp_segment.sequence_number);
    println!("  ACK Number: {}", tcp_segment.acknowledgment_number);
    println!("  Flags: SYN={}, ACK={}", tcp_segment.flags.syn, tcp_segment.flags.ack);
    println!("  Payload: {} bytes\n", tcp_segment.payload.len());

    // 4. UDP Datagram Example
    println!("4. UDP Datagram Example");
    let udp_payload = b"DNS Query".to_vec();
    let udp_datagram = udp::UdpDatagram::new(
        53000, // source port
        53,    // destination port (DNS)
        udp_payload.clone(),
    );

    println!("  Source Port: {}", udp_datagram.source_port);
    println!("  Destination Port: {}", udp_datagram.dest_port);
    println!("  Length: {} bytes", udp_datagram.length);
    println!("  Payload: {:?}\n", String::from_utf8_lossy(&udp_datagram.payload));

    // 5. Socket Example
    println!("5. Socket Example");
    let connection_manager = Arc::new(tcp::TcpConnectionManager::new());
    let mut tcp_socket = socket::TcpSocket::new(connection_manager);

    let local_addr = socket::SocketAddr::new(Ipv4Addr::new(0, 0, 0, 0), 8080);
    tcp_socket.bind(local_addr).expect("Failed to bind");
    println!("  TCP socket bound to {}", local_addr.to_std());

    let mut udp_socket = socket::UdpSocket::new();
    let udp_addr = socket::SocketAddr::new(Ipv4Addr::new(0, 0, 0, 0), 9090);
    udp_socket.bind(udp_addr).expect("Failed to bind");
    println!("  UDP socket bound to {}\n", udp_addr.to_std());

    // 6. Network Device Example
    println!("6. Network Device Example");
    let mut mock_device = device::MockDevice::new("mock0".to_string());
    mock_device.open().expect("Failed to open device");

    println!("  Device: {}", mock_device.name());
    println!("  MTU: {} bytes", mock_device.mtu());

    let test_packet = vec![0x00, 0x11, 0x22, 0x33, 0x44, 0x55];
    let sent = mock_device.send(&test_packet).expect("Failed to send");
    println!("  Sent {} bytes", sent);

    println!("\n=== Demo Complete ===");
}
