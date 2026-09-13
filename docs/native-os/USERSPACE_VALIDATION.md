# M2b ユーザー空間の検証

2026-09-12、M2a のメモリ管理を基に、Ring 3 のユーザープロセス、最小システムコール、
協調切替、同期例外を起こしたプロセスの停止を追加した。
基準は文書整備の `72a994274c35a59201fcac9bae9d085a7cf5fc7d`。
実装は [native-os](../../native-os/README.md) のこの文書を含む変更である。
既存の [M1](BOOT_VALIDATION.md) と [M2a](MEMORY_VALIDATION.md) は当時の検証記録として残す。

## 確認する境界

| 対象 | 実装と検証 |
| --- | --- |
| 権限 | GDT に DPL3 の code/data と 64-bit TSS を追加。IRETQ で Ring 3 に移行し、実際の trap frame の CS を検査 |
| 入口 | INT 0x80 だけを DPL3 に公開。TSS RSP0 のカーネルスタックへ移り、15 個の汎用レジスターを保存。二重故障には IST1 |
| アドレス空間 | 各プロセスに別の root と物理ページ。kernel は supervisor-only、user code は RX、user data/stack は RW/NX |
| システムコール | log / yield / exit。不正番号、u32 外の終了状態、ポインター・長さ・桁あふれ・ページ境界を検査 |
| ログ | 最大 128 bytes を検査後にコピーし、16 進数で出力。ユーザー文字列をカーネル診断として解釈しない |
| 切替 | プロセスの frame を保存し、CR3 と復帰 frame を変更。両方が同じ仮想データ・スタック番地を使っても内容を保持 |
| 故障 | 同期ユーザー例外はそのプロセスを停止し、残りを実行。カーネル例外、NMI、二重故障、machine check は復帰しない |
| 復帰 | CS/SS、コードとスタックの範囲を検査。算術フラグと DF 以外の制御フラグを除去。NT を立てたユーザーからの復帰も検証 |
| 拡張レジスター | 保存復元を実装するまで CR0.EM / TS で使用を拒否。x87 命令が #NM になることを確認 |

GPR、TSS、IDT、IRET、ページ権限の設計は
[Intel Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
の Volume 3 の保護・割り込み・タスク管理、および Volume 2 の IRET を参照した。
カーネルの soft-float 前提は [Rust の bare-metal target](https://doc.rust-lang.org/rustc/platform-support/x86_64-unknown-none.html) による。

システムコールから返る通常のエラーはプロセスを止めない。u32 の exit 状態は記録して終了する。
試験の期待値は全プロセス終了後に照合し、スケジューラーの処理と分けている。
したがって、想定外のユーザー故障も先に隔離して相手を継続し、その後に試験を不合格にできる。

## 環境と結果

最終実行: `2026-09-12T14:03:22.678955+00:00`。Rust は `rustc 1.96.0 (ac68faa20 2026-05-25)`、QEMU は `QEMU emulator version 11.1.0 (v11.1.0-12130-ge470268ff4)`。
Windows x64、q35 / TCG、1 CPU、256 MiB、ゲスト NIC・画面・モニター無効。
取得元、ファームウェア、導入の範囲は [依存関係](../../native-os/DEPENDENCIES.md) を引き継ぐ。

| 検証 | 結果 |
| --- | --- |
| Rust 単体テスト | 22 件合格。boot-protocol 11、memory 6、kernel の契約 5 |
| Python の判定器テスト | 13 件合格。継続の欠落、誤った例外、停止後の再実行、不足した拒否記録を拒否 |
| Rust fmt / Clippy | ホスト用ライブラリ・テスト、bare-metal カーネル、UEFI ローダーで合格 |
| QEMU | 既存 7 ケースと M2b 11 ケース、計 18 ケース合格。runner の終了は 0 |
| 保護を壊す負の対照 | 6 種類すべてを不合格と検出。復元後、上記全ケースを再実行 |

カーネル ELF の SHA-256: `07488dfdd90613d6b63d3fac760443aaab12129fd2f85a824d31b8534de14b82`。
`native-os/` ソース照合値: `25202a14d11777b87ddec93bedb3dde9177c2f3afa8b6b7e97bfcb1c31c89712`。
これらは試験対象の照合用であり、配布物の生成・公開ではない。
全ケースの終了コード、所要時間、ローダーと使用ツールの照合値はローカルの `native-os/out/results.json` に記録する。

`user-kernel` の実測では、ユーザー 0 のカーネル領域読み取りを #PF、error=5 で拒否し、
ユーザー 1 の継続ログと終了まで到達した。`hex=62` はユーザーが出力した 1 byte の `b` を表す。

```text
kernel:user-stopped pid=0 vector=14 error=0x5 address=0x2000000
kernel:user-switch from=0 to=1
kernel:user-trap pid=1 vector=128 cpl=3
user:log pid=1 hex=62
kernel:user-trap pid=1 vector=128 cpl=3
kernel:user-exit pid=1 status=0
kernel:user-tests-passed mode=8
```

M2b の各ケースの QEMU 終了コードは 45。故障を注入したプロセスが止まるだけでは不十分で、
正常なプロセスの切替後のログと終了、全体の合格通知を順に要求する。


## 負の対照試験

通常コードの保護を一つずつ一時的に壊し、同じ QEMU 試験が失敗することを確かめた。
各回の変更はバイト列で復元した。通常ビルドへ切替可能なバイパス機能は追加していない。

| 一時変更 | 対象ケース | 結果 |
| --- | --- | --- |
| プロセス root のカーネル葉に USER を付与 | user-kernel | ゲスト 255、runner 1、不合格 |
| 両プロセスの DATA に同じ物理ページを割当て | user-cooperate | ゲスト 255、runner 1、不合格 |
| log の範囲検査を省略 | user-cooperate | ゲスト 255、runner 1、不合格 |
| yield で保存した RBX を破壊 | user-cooperate | ゲスト 255、runner 1、不合格 |
| 復帰フラグの制限を省略 | user-cooperate | ゲスト 255、runner 1、不合格 |
| 復帰先の検査を省略 | user-bad-return | ゲスト 255、runner 1、不合格 |

ローカルの `native-os/out/negative-controls.json` に結果と復元前のソース照合値を記録した。
変異ごとのシリアルログも `out/negative-*-serial.log` に保存する。これらは Git に含めない。

## 残る範囲

- 固定した 2 プロセス、埋め込んだアセンブリの試験用プログラム。任意の ELF ローダーやアプリ互換性はない。
- 1 CPU、割り込み無効、協調実行のみ。yield しない処理の CPU 独占は防げず、プリエンプションと CPU 予算の強制は未実装。
- 1 プロセスにつき user code/data/private/stack が各 4 KiB。ページと root は終了後も VM 終了まで保持し、再利用しない。
- ポインター検査は固定した読み取り可能領域の検査である。動的 map/unmap や共有メモリを追加する前に、所有権・権限・コピー中の変更への対処が必要。
- FPU/SIMD のプロセス別保存復元、TLS、マルチコア、IPC、Capability、資源回収、プロセス再起動は未実装。
- IST を配置したが、二重故障からの復帰や各ハードウェア例外の網羅的な故障注入は未検証。
- 推測実行のサイドチャネル、DMA、悪意あるファームウェア、実機、Secure Boot、ゲスト内 AI 推論は今回の検証範囲外。
- 新規マシンでの環境構築全体は未実証。限定した隔離試験の合格を、一般的な OS の完成や完全な安全性としない。

M2 の主要な隔離動作を固定した環境で確認したが、資源回収と一般化は残っている。
M3 の権限・サービスへ広げる前に、資源の寿命とスケジューリングの前提を整理する。
