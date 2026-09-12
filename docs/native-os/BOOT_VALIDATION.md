# M1 起動検証 — UEFI から独自カーネルへ

2026-09-12 に、Windows ホスト上のヘッドレス QEMU で正常系と 3 種類の故障条件を実行した。
4 ケースとも所定の診断と終了コードを確認し、M1 の起動条件をこの仮想環境で満たした。
M0 の取得元・版・手順は固定したが、新規マシンへの環境構築全体はまだ実証していない。

対象ソースはこの文書と同じ変更にある [native-os](../../native-os/README.md)。
設計の基準は `f142939b2e6c2e9d32dda10f30bdd67eda621aeb`（設計 Draft PR #109）。
この実装のコミットは、この文書を含む PR の head で特定できる。

## 固定条件と結果

Rust `1.96.0 (ac68faa20 2026-05-25)`、QEMU
`11.1.0 (v11.1.0-12130-ge470268ff4)`、Windows build 20260811 と同梱 EDK II を使用した。
機種は `pc-q35-11.1`、CPU は `qemu64`、TCG、1 CPU、256 MiB。
画面・QEMU monitor・ゲスト NIC は無効、各試験は 45 秒で打ち切る。
UEFI 変数ファイルはケースごとに新しくコピーする。

```powershell
python native-os/tools/boot_test.py --case all
```

| ケース | 実際に観測した動作 | 期待 / 実測の終了コード | 判定 |
| --- | --- | --- | --- |
| normal | Boot Services 終了 → カーネル → 起動情報受理 → ready | 33 / 33 | 合格 |
| bad-boot-info | magic を破損させた情報をカーネルが header エラーで拒否 | 35 / 35 | 合格 |
| invalid-opcode | `ud2` を実行し、独自 IDT の vector 6 から診断・終了 | 37 / 37 | 合格 |
| stale-map-key | 最初のキーが拒否され、マップ再取得後の試行 1 で終了・起動成功 | 33 / 33 | 合格 |

4 ケースを通した runner は終了コード 0。ゲストの意図的な故障をホスト側の異常終了と
混同せず、各ケース固有の終了コードとログの順序を検査した。

正常系のシリアル出力抜粋:

```text
loader:entered
loader:kernel-loaded
loader:exit-attempt=0
loader:boot-services-exited
kernel:entered
kernel:exceptions-ready
kernel:boot-info-valid descriptors=100
kernel:ready
```

メモリマップのキー不一致時には、次の順序を観測した。

```text
loader:exit-attempt=0
loader:map-key-rejected
loader:exit-attempt=1
loader:boot-services-exited
```

検証は表示だけではない。ローダーの成功した `ExitBootServices` 呼び出しから
独立した ELF entry へ移り、専用スタックと GDT / IDT を設定する実装と照合した。
`ud2` の故障はローダーの文字列模擬ではなく、カーネルが CPU 命令を実行して発生させる。

## 補助検査

- Rust のホスト側テスト 11 件: 起動情報、ELF の範囲・重複・動的形式・entry・W+X などの拒否。
- Python のログ判定テスト 7 件: 全ケースの正常な判定、成功文だけ、終了コード不一致、
  カーネル未到達、処理順序違反、故障と ready の混在、キー拒否の欠落を検出。
- `cargo fmt --check`、3 package の `cargo clippy -- -D warnings`。
- リポジトリの encoding / Git hygiene、差分の空白と機密情報、変更した文書の相対リンク。

詳細な実行コマンドは [実装 README](../../native-os/README.md) を参照する。
ローカルの完全なログは `native-os/out/<case>/serial.log`、環境・照合用ハッシュ・
実測時間・判定は `native-os/out/results.json` に置く。これらの生成物はコミットしない。

## 実起動で見つけて修正した問題

最初は読み取り専用 FAT を接続する QEMU block node にも `readonly=on` が必要だった。
修正前はローダーへ到達せず終了コード 1 で失敗した。

次に、当初の 16 MiB 番地はこの EDK II の Boot Services data 領域に含まれ、
AllocateAddress が `EFI_NOT_FOUND` を返した。メモリマップで利用可能な範囲を確認して
リンク先と引き継ぎ契約を 32 MiB にそろえた。確保に失敗した領域への書き込みは行わない。
最終的な固定ロード範囲は 32〜40 MiB。別のファームウェアでその範囲が空く保証はない。

## 今回確認できていないこと

独自ページテーブル、物理メモリの回収・管理、プロセス隔離、システムコール、
割り込み駆動、複数 CPU、永続化、AI 推論、実機の起動、Secure Boot は対象外。
page fault の入口は実装したが、今回の CPU 故障注入は invalid opcode に限る。
二重故障用スタックや例外からの復帰も未実装である。

UEFI の残したメモリ配置を利用し、ローダー、起動情報、ページテーブルを保持する。
起動情報の値の検査だけで任意ポインターの安全性や分離を保証しない。
試験時間はファームウェアを含む一回の実行記録で、性能ベンチマークではない。

取得した開発ツールの部分的なソース・設定確認とダイジェスト照合を行ったが、
配布バイナリ全体の独立監査や再現ビルドは未実施。範囲は [依存関係](../../native-os/DEPENDENCIES.md) に記載した。
次の実装対象は M2 の予約領域を保護するメモリ管理と独自ページテーブルである。
