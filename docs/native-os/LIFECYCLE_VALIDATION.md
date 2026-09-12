# M2c 資源回収と実行制御の検証

M2b の `1533fa61e2d7f125d948f0bd840be00d84c3d4c2` を基に、停止したプロセスの
所有メモリ回収と、タイマー割り込みによる実行切替を追加した。
実装は [native-os](../../native-os/README.md)。M1・M2a・M2b の記録は当時の結果として残す。
対象は x86-64 / UEFI PC。Windows 上の固定 QEMU で試験し、実機起動や Windows アプリ互換性は扱わない。

## 所有と回収

各プロセスは、独自 root、私有ページテーブル、コード・データ・専用領域・スタックの
4 ページを所有する。確保した全フレームを固定長の所有リストに記録し、最大 32 フレームに制限する。
構築途中で上限に達した場合も、未完成の root を有効化せず、所有済みの全フレームを返却する。
試験は最初の確保から完成直前までの各確保境界に上限を注入し、空き数が戻ることを検査する。
これは確保上限の注入試験であり、QEMU の全物理メモリを消費した試験ではない。
物理アロケーター自体の枯渇・再利用・二重解放はホストの単体テストでも検査する。

exit、同期ユーザー例外、tick 上限のいずれでも runnable を落とし、次の順で回収する。

1. カーネルの root へ CR3 を切り替え、古いユーザー変換を失効させる。PCID と global mapping は使わない。
2. 停止したプロセスの所有リストを取り出す。有効な root 自身の解放は拒否する。
3. 全所有フレームをゼロ消去し、物理アロケーターへ返す。再確保前に消去結果を読み戻す。
4. 保存した root とレジスター frame を消去し、残ったプロセスへ切り替える。
5. 全プロセス停止時に、作成前と同じ空きフレーム数になったことを検査する。

カーネルには、利用可能な EFI Conventional Memory のみを supervisor/RW/NX で参照する
RAM マッピングを `1 << 39` に設ける。kernel image、予約領域、firmware、MMIO は含めない。
プロセス root はこの supervisor-only の部分を借用し、回収時にも共有テーブルを解放しない。
カーネル用テーブルの最大数は 256。これらの長寿命フレームは回収試験の基準値より前に確保する。

## 実行制御

固定 q35 / 1 CPU で legacy PIC を設定し、PIT の IRQ0 を vector 32 へ接続する。
PIT divisor は 11,932、約 100 Hz。ユーザー実行中だけ IF を許可し、カーネルの割り込みゲートでは IF を落とす。
IRQ0 は汎用レジスターと IRET frame を保存し、EOI を返して次の runnable プロセスへ切り替える。
ユーザーの POPF で IF を消せないことと、危険な復帰フラグをカーネルで除くことを試験する。

割り込みを受けたプロセスに tick を累積し、試験用上限（pid 0 は 8、pid 1 は 64）で停止する。
yield やシステムコールはカウンターを初期化しない。通常終了・故障と同じ回収経路を通る。
これはサンプリングされた tick 数であり、厳密な CPU 使用時間の課金やハードリアルタイムの保証ではない。
カーネル処理中は割り込みを遅延し、複数の PIT tick が合流する可能性がある。
現在のシステムコールは非ブロックかつ処理量を制限している。カーネル自身の無限ループを救う仕組みは含まない。

PIT の背景は [Intel 8254 timers](https://edc.intel.com/content/www/jp/ja/design/products-and-solutions/processors-and-chipsets/700-series-chipset-family-platform-controller-hub-datasheet-volume-1-of/002/8254-timers/)、
割り込み、IRET、CPL と IOPL の扱いは [Intel SDM](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html) を参照する。

## 試験ケース

| ケース | 検査する動作 |
| --- | --- |
| `user-preempt` | pid 0 が syscall も yield もせず無限ループ。IRQ0 で中断し、pid 1 がレジスター・スタックを保持して P → Q を出力、正常終了。pid 0 は 8 tick で停止 |
| `user-yield-spin` | pid 0 が yield を繰り返しても tick を失わず上限で停止。pid 1 は P → Q と正常終了 |
| `user-recycle` | 64 世代、計 128 プロセス。各世代で正常終了と #UD を発生させ、2 root の分離・root フレームの再利用・新規データのゼロ状態・回収後の空き数を確認 |
| 既存 18 ケース | 起動、メモリ保護、Ring 3、syscall 検査、ユーザー例外後の継続を、新しい所有・回収処理で再検証 |

判定器は終了コードだけでなく、連続した tick、停止後に再実行しないこと、世代番号、回収件数、
基準と一致する空き数、正常プロセスの継続を照合する。M2c のゲスト終了コードは 47、runner の成功は 0。

## 負の対照

通常ソースを一時変更し、各回で元のバイト列へ戻した。変更を選ぶビルド設定は残していない。

| 省いた処理 | 実測 |
| --- | --- |
| タイマー設定 | 6 秒で QEMU を停止、runner 1 |
| 停止したプロセスの解放 | `process-resource-leak`、guest 255 / runner 1 |
| 切替先の tick を毎回 0 へ戻す | 6 秒で QEMU を停止、runner 1 |
| IRQ0 での frame 保存 | `lifecycle-verdict`、guest 255 / runner 1 |
| 解放時のゼロ消去 | `released-data-not-zero`、guest 255 / runner 1 |

消去試験は最初に確保側へ注入してしまい、想定した解放側の省略になっていなかった。
その実行を解放検査の成功とは数えず、注入位置を直して上記の失敗を確認した。

## 未実装・未検証

- 固定した 2 スロットと埋込みアセンブリの試験。任意の ELF、spawn API、一般的な終了待ち・再起動ポリシーはない。
- 所有対象はメモリと保存コンテキスト。ファイル記述子、IPC、Capability、デバイス資源はまだ存在しない。
- APIC / SMP、FPU・SIMD 保存復元、TLS、厳密な CPU 時間課金、優先度と公平性の一般化は未実装。
- 実機、Secure Boot、DMA・サイドチャネル対策、新規マシン全体での環境構築は未検証。
- ゲスト内の AI 推論、ネットワーク、永続化、日常利用向け UI はこの変更の対象外。

## 最終結果

実行記録: `2026-09-12T14:43:12.128032+00:00`。`rustc 1.96.0 (ac68faa20 2026-05-25)`、`QEMU emulator version 11.1.0 (v11.1.0-12130-ge470268ff4)`。
Windows x64、`pc-q35-11.1` / TCG、1 CPU、256 MiB、ゲスト NIC・画面・モニター無効。
ツールとファームウェアの取得元・確認範囲は [依存関係](../../native-os/DEPENDENCIES.md) を引き継ぐ。
新たな依存、インストール処理、Git hook、外部通信は追加していない。

| 検証 | 結果 |
| --- | --- |
| Rust 単体テスト | 23 件合格（boot-protocol 11、memory 7、kernel 5） |
| Python 判定器 | 15 件合格 |
| fmt / Clippy | ホストのライブラリ・テスト、bare-metal kernel、UEFI loader で合格 |
| QEMU | 21 ケース合格、runner 0。負の対照を復元後の全件実行 |
| 部分確保 | 14 箇所の確保境界を注入し、回収後の空き数を照合 |
| 再生成 | 64 世代・128 プロセス。毎世代 52613 free frames へ復帰 |

ローカルの `native-os/out/results.json` と各ケースの `serial.log` に詳細を保存する。
次の値は試験対象の照合値であり、配布用チェックサムではない。ソースの値は runner と同じく
`native-os/` 内のファイル名と内容を対象にし、`target` / `out` / `__pycache__` を除く。

```text
native-os source SHA-256: fb1e3857bd18daa41b61f42a1ed5f9201a83129739762040998d94570329d170
kernel ELF SHA-256: aefe5f4e70b090eb1be73c2040d6dfe8aa93256a8804a692b0ab895872e52357
```

再現コマンドと環境指定は [ビルドと試験](../../native-os/README.md#ビルドと試験) を参照する。
実行制御だけなら `--case user-preempt`、回収の反復なら `--case user-recycle` を選べる。
