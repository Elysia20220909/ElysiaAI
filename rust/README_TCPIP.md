# TCP/IP Stack Implementation in Rust

このディレクトリには、Rustで実装された自作TCP/IPスタックが含まれています。

## 機能

### レイヤー2 - Ethernet
- MACアドレス処理
- Ethernetフレームのパース/シリアライズ
- EtherType識別（IPv4, ARP, IPv6）
- ブロードキャスト/マルチキャスト検出

### レイヤー3 - IP
- IPv4パケット処理
- IPヘッダーチェックサム計算/検証
- TTL管理
- プロトコル識別（ICMP, TCP, UDP）

### レイヤー4 - TCP/UDP
#### TCP
- TCPセグメントのパース/シリアライズ
- TCPフラグ処理（SYN, ACK, FIN, RST, PSH, URG）
- 接続管理（Connection Manager）
- 状態遷移（State Machine）
- チェックサム計算（疑似ヘッダー含む）

#### UDP
- UDPデータグラムのパース/シリアライズ
- チェックサム計算（疑似ヘッダー含む）
- チェックサム検証

### Socket API
- TCPソケット（Stream）
- UDPソケット（Datagram）
- bind, connect, listen, send, recv操作
- 送受信バッファ管理

### Network Device
- TUN/TAPデバイス抽象化
- モックデバイス（テスト用）
- デバイスI/O操作

## 使用方法

### デモプログラムの実行

```bash
cd rust
cargo run --example tcp_ip_demo
```

### テストの実行

```bash
# 全テストを実行
cargo test

# 特定のモジュールのテストを実行
cargo test network::ethernet
cargo test network::ip
cargo test network::tcp
cargo test network::udp

# カバレッジ付きでテストを実行
cargo test --all-features
```

### コード例

#### Ethernetフレームの作成と送信

```rust
use elysia_rust::network::ethernet::*;

let dst = MacAddress::new([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
let src = MacAddress::new([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
let payload = vec![0x01, 0x02, 0x03, 0x04];

let frame = EthernetFrame::new(dst, src, EtherType::Ipv4, payload);
let bytes = frame.serialize();
```

#### IPv4パケットの作成

```rust
use elysia_rust::network::ip::*;
use std::net::Ipv4Addr;

let src = Ipv4Addr::new(192, 168, 1, 100);
let dst = Ipv4Addr::new(192, 168, 1, 1);
let payload = vec![0xAA, 0xBB, 0xCC, 0xDD];

let mut packet = Ipv4Packet::new(src, dst, IpProtocol::Tcp, payload);
let bytes = packet.serialize();
```

#### TCPソケットの使用

```rust
use elysia_rust::network::{socket::*, tcp::*};
use std::sync::Arc;
use std::net::Ipv4Addr;

let manager = Arc::new(TcpConnectionManager::new());
let mut socket = TcpSocket::new(manager);

let local = SocketAddr::new(Ipv4Addr::new(0, 0, 0, 0), 8080);
socket.bind(local)?;
socket.listen()?;

// Accept connections and process data...
```

## アーキテクチャ

```
┌─────────────────────────────────┐
│      Application Layer          │
│    (Socket API - socket.rs)     │
└──────────┬──────────────────────┘
           │
┌──────────▼──────────┬───────────▼──────────┐
│    TCP (tcp.rs)     │     UDP (udp.rs)     │
│  - Connection Mgmt  │   - Datagram Send    │
│  - State Machine    │   - Stateless        │
└──────────┬──────────┴───────────┬──────────┘
           │                      │
┌──────────▼──────────────────────▼──────────┐
│         IP Layer (ip.rs)                   │
│  - IPv4 Packet Processing                  │
│  - Routing, Fragmentation                  │
└──────────┬────────────────────────────────┘
           │
┌──────────▼────────────────────────────────┐
│    Ethernet Layer (ethernet.rs)           │
│  - Frame Parse/Serialize                  │
│  - MAC Address Handling                   │
└──────────┬────────────────────────────────┘
           │
┌──────────▼────────────────────────────────┐
│    Network Device (device.rs)             │
│  - TUN/TAP Interface                      │
│  - Physical/Virtual Device I/O           │
└───────────────────────────────────────────┘
```

## ファイル構成

```
src/network/
├── mod.rs          # モジュール定義
├── ethernet.rs     # Ethernetレイヤー実装
├── ip.rs           # IPレイヤー実装
├── tcp.rs          # TCPレイヤー実装
├── udp.rs          # UDPレイヤー実装
├── socket.rs       # Socket API実装
└── device.rs       # ネットワークデバイス抽象化

examples/
└── tcp_ip_demo.rs  # デモプログラム
```

## 制限事項と今後の実装予定

### 現在の制限
- IPv6サポートなし（IPv4のみ）
- ARPプロトコル未実装
- ICMPプロトコル未実装
- TCPの完全な状態遷移未実装
- TCPの輻輳制御未実装
- フラグメンテーション/リアセンブリ未実装
- 実際のネットワークI/Oは抽象化のみ

### 今後の実装予定
- [ ] IPv6サポート
- [ ] ARP/NDP実装
- [ ] ICMP/ICMPv6実装
- [ ] TCP完全な状態マシン
- [ ] TCP輻輳制御（Reno, CUBIC等）
- [ ] IPフラグメンテーション
- [ ] TUN/TAP実デバイスI/O
- [ ] ルーティングテーブル
- [ ] パケットフィルタリング
- [ ] QoS/トラフィック制御

## パフォーマンス最適化

- `bytes`クレートによるゼロコピーバッファ管理
- 非同期I/O対応（Tokio統合）
- ロックフリーデータ構造の使用検討
- パケット処理のバッチング

## 参考資料

- [RFC 791 - Internet Protocol](https://tools.ietf.org/html/rfc791)
- [RFC 793 - Transmission Control Protocol](https://tools.ietf.org/html/rfc793)
- [RFC 768 - User Datagram Protocol](https://tools.ietf.org/html/rfc768)
- [smoltcp - TCP/IP stack in Rust](https://github.com/smoltcp-rs/smoltcp)

## ライセンス

AGPL-3.0-or-later
