# M3e: 復旧対象の資料サービスを ELF に分離

基点は PR #118、コミット `20e523ce264ea2c1572d2007ff1cf64ea44fce11`。
復旧試験で使う PID 1 のサービスを `apps/document-service/` の独立した package と ELF に移した。
初回と各再起動は `Space::from_elf` で検査・確保・コピーし、ELF の entry から実行する。
`kernel/src/recovery_program.S` はクライアント専用になり、サービスの命令は含まない。

## 動作と境界

- 固定配置の RX / RW 各 1 ページという M3d の ELF 契約を使う。entry はコード先頭 + 16。
- サービスは初期データの定数と BSS のゼロを毎世代確認し、BSS に印を付ける。
- 既存 IPC で要求を受信し、syscall 6 で認可済み資料を取得して返信する。
- 認可判断、固定の資料バイト、プロセス別 capability 検査はカーネル側に残す。
- 故障・終了・CPU 上限でサービスを回収し、クライアントの明示的な再接続で再起動する。
- 古い通信・資料権限を拒否し、クライアントのページと保存データを保って読み取りを再開する。

今回の移行は `recovery-*` の 6 ケース。以前の `document-*` は M3b の試験コードを維持する。
新規ケースの追加ではなく復旧経路の移行で、全体は 45 ケースのまま。
再起動上限は 8 回。サービス ELF は kernel の RAM bundle に埋め込むため、差し替えには再ビルドが必要。
ディスク、動的リンク、汎用 spawn、実機対応、AI 推論、任意の第三者サービスの安全性は対象外。

## 検証方法

[native-os の手順](../../native-os/README.md)から `--case all` を実行する。
runner は probe と document-service を先にビルドし、両方の SHA-256 を記録する。
classifier は初回と全再起動のロード世代・entry、切断通知、古い権限の拒否、読み取り再開、
各世代の空きフレーム数、全終了後の完全回収を照合する。

3 つの対照試験で、別の probe ELF への取り違え、entry の無視、BSS への汚染を注入した。
すべて recovery-fault でゲスト 255 / runner 1 として検出し、元のソースに戻した後に全件を再実行した。
過去の M3c / M3d 記録は当時の証拠として変更していない。

## 最終結果

記録日時 (UTC): 2026-09-13T03:25:25.124887+00:00

QEMU 45/45、Rust 48/48、Python classifier 23/23 が成功。
fmt、host/kernel/probe/service/UEFI Clippy (-D warnings)、UTF-8、Git hygiene、staged gitleaks も通過。
ゲスト構成は QEMU 11.1.0、pc-q35-11.1、TCG、1 CPU、256 MiB、ネットワークなし。

- native_os_source_sha256: `b34f4b61b352469109aa9cc327710009ab491c390313ff73b61a052a99b5dd9d`
- kernel_sha256: `8a798d037b3709c962731949552bf4eecf44aaef0c602c3aae32fdabf8112348`
- user_elf_sha256: `a6188f3c0f46e37c84a0ea9b724377cf2965d5aff54a2568d4be046cbeb30495`
- service_elf_sha256: `f1ecd7a25a05adbbc21d58136a40df3b5b61d7e9cbedd1e6e733d3449fc137e4`
