# M3d: RAM 上の静的ユーザー ELF

PR #117 のサービス復旧を基点に、別にビルドした小さな ELF を Ring 3 のプロセスとして起動する。
Windows ホスト上の QEMU/UEFI で検証する。Windows アプリ互換や実機対応ではない。

## 実装範囲

入力は最大 64 KiB の x86-64 little-endian ET_EXEC。RX と RW の PT_LOAD を各一つ、
それぞれ固定アドレス 0x40000000 / 0x60000000 に最大 4 KiB まで受け付ける。
ヘッダー、範囲、重複、権限、エントリーポイントを確保前に検査する。
プロセスごとのページテーブル、データとスタックを確保し、初期データをコピーして BSS をゼロ初期化する。
保護の粒度はページであり、セグメントの末尾までのバイト単位の境界ではない。

試験アプリはログ・yield・exit だけを使う。IPC・資料権限は付与せず、未提供 syscall は拒否する。
終了・故障時は既存の回収処理を使い、確保途中の失敗でも元の空きフレーム数へ戻す。

## 試験の意味

- elf-run: ELF のエントリーから二つのプロセスを実行し、初期データ、BSS、専用データの分離、終了時回収を確認する。
- elf-fault / elf-readonly / elf-noexecute: 不正命令、コードへの書き込み、データからの実行を止め、もう一方が完了する。
- elf-reject: ヘッダー、動的形式、インタープリター、W+X、カーネル領域、重複領域、不正 entry、整数オーバーフロー、切断の 9 変種を拒否し、資源が減らない。
- elf-rollback: 確保の 14 境界すべてに失敗を注入し、回収を確認する。

4 つの対照試験では、権限検査の除去、entry の無視、データコピーの除去、回収の除去を一つずつ行った。
すべてゲスト 255 / runner 1 で検出し、元のソースへ戻して全件を再実行した。

## 再現

[native-os の試験手順](../../native-os/README.md)の `--case all` を使う。
追加の外部依存はない。runner はユーザー ELF → カーネル → UEFI loader の順にビルドする。
ローカルの results.json とシリアルログは native-os/out に置き、バイナリやログはコミットしない。

## 限界

ELF は独立したビルド成果物だが、現段階ではカーネルへ埋め込んで RAM に置く。
差し替えにはカーネルと loader の再ビルドが必要。ディスクからの読み込み、実行時 spawn、
動的リンク、再配置、ASLR、TLS、FPU/SIMD の文脈保存は対象外。
既存の資料サービスはまだ従来の試験コードであり、ELF への移行は次の工程。
実機、新規マシン全体の環境構築、AI 推論、任意のアプリの安全な実行は未検証。

## 最終結果

記録日時 (UTC): 2026-09-13T03:18:18.720961+00:00

QEMU 45/45、Rust 48/48、Python classifier 22/22 が成功。
fmt、host/kernel/probe/UEFI Clippy (-D warnings)、UTF-8、Git hygiene、staged gitleaks も通過。
ゲスト構成は QEMU 11.1.0、pc-q35-11.1、TCG、1 CPU、256 MiB、ネットワークなし。

- native_os_source_sha256: `e571bc5a0dc130b28b40add9294ed03f7080b8032a97a830d859520ee72461bf`
- kernel_sha256: `1f8f42a23d3025f90a90e0527f338c7e854b8fbbff7d59e29331890d6aa0e578`
- user_elf_sha256: `e862cd59d08db620acdf0aed7bdd6ee7198dc508eb0ac3c6c9b8d817067acd37`
