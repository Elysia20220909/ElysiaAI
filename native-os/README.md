# ElysiaAI // INFINITE RESONANCE — 最初のカーネル

UEFI ローダーから独自の x86-64 カーネルへ制御を渡す、M1 の起動実装。
既存の Bun / Python / Tauri アプリとは独立した Rust workspace としてビルドする。
AI 推論、プロセス、ファイルシステムはまだ含まない。

設計の背景は [独自 OS の構想](../docs/native-os/README.md)、
実測結果は [起動検証](../docs/native-os/BOOT_VALIDATION.md)、
取得元と確認範囲は [依存関係](DEPENDENCIES.md) を参照する。

## 起動経路

```text
QEMU / EDK II UEFI
  -> EFI/BOOT/BOOTX64.EFI  (Rust x86_64-unknown-uefi)
  -> 埋め込んだ ELF の検査、32 MiB 番地へのロード
  -> GetMemoryMap / ExitBootServices
  -> _start              (Rust x86_64-unknown-none)
  -> カーネル専用スタック、GDT / IDT、起動情報の検査
  -> シリアル診断 / QEMU 終了
```

`bootloader/` はファームウェアとの引き継ぎ、`boot-protocol/` は起動情報と ELF の検査、
`kernel/` は引き継ぎ後の CPU 設定と故障診断を担当する。
`platform.rs` の COM1 と QEMU 終了ポートは両方で使う。ホスト OS の API は呼ばない。

カーネルを ELF として別にビルドし、ローダーへ埋め込む。M1 ではディスク上の任意ファイルを
ロードしない。起動ごとに新しい UEFI 変数ストアを使い、前回の起動設定を引き継がない。

## 固定する環境

| 項目 | 値 |
| --- | --- |
| 検証ホスト | Windows x64、PowerShell、Python 3.14 |
| Rust | 1.96.0、既存の `stable` toolchain を版確認して使用 |
| リンカー | Rust 同梱 `rust-lld` |
| ターゲット | `x86_64-unknown-none` / `x86_64-unknown-uefi` |
| 外部 crate | `r-efi = 6.0.0`、既定 feature、`Cargo.lock` 固定 |
| QEMU | Windows build 20260811、11.1.0、`pc-q35-11.1` |
| CPU / 資源 | `qemu64`、TCG、1 CPU、256 MiB |
| UEFI | 同じ QEMU 配布元の `edk2-x86_64-code.fd` / `edk2-i386-vars.fd` |
| 入出力 | COM1 のみ、画面・モニター・ゲスト NIC 無効 |

この組み合わせが検証対象であり、別の QEMU、CPU、ファームウェアへの互換性は未確認。
再現時はまず [取得と展開](DEPENDENCIES.md#取得と展開) を済ませる。
`stable` が別の Rust 版ならスクリプトは停止する。暗黙に既定 toolchain を変更しない。

## ビルドと試験

リポジトリのルートから実行する。起動試験には管理者権限は不要。

```powershell
rustc +stable --version
rustup target add --toolchain stable x86_64-unknown-none x86_64-unknown-uefi
python -m unittest discover -s native-os/tools -p 'test_*.py' -v
cargo +stable test --manifest-path native-os/Cargo.toml -p elysia-boot-protocol --locked
python native-os/tools/boot_test.py --case all
```

最後のコマンドが、カーネルと各ケースのローダーをビルドし、QEMU を順番に起動する。
`--case normal` などで一つだけ実行できる。標準では各起動を 45 秒で打ち切り、
時間切れのプロセスを終了して不合格にする。`--timeout` の範囲は 1〜120 秒。
ツールの場所を変える場合は `--qemu` と `--firmware-dir` に指定する。

| ケース | 与える条件 | 必須の診断 | QEMU 終了コード |
| --- | --- | --- | --- |
| `normal` | 有効な起動情報 | `kernel:boot-info-valid` → `kernel:ready` | 33 |
| `bad-boot-info` | 起動情報の magic を壊す | `kernel:boot-info-rejected:header` | 35 |
| `invalid-opcode` | 検査後に CPU の `ud2` 命令を実行 | 注入 → vector 6 の故障診断 | 37 |
| `stale-map-key` | 最初の ExitBootServices へ誤ったキーを渡す | 拒否 → 再取得・再試行 → 正常完了 | 33 |

全ケースで、ローダー開始、ロード完了、Boot Services 終了、カーネルへの到達、
独自例外テーブルの設定を順に要求する。予期しない故障・panic・時間切れ・終了コードの不一致は
不合格。故障ケースに `kernel:ready` が出ても不合格とする。

`isa-debug-exit` へ書き込む値は通常 `0x10`、壊れた起動情報 `0x11`、意図的な例外 `0x12`、
予期しない失敗 `0x7f`。QEMU は `(値 << 1) | 1` をプロセス終了コードとする。
したがってゲストの正常完了は 33 であり、全試験を通した Python runner 自体の成功は 0。

`native-os/out/<case>/serial.log` と `native-os/out/results.json` にローカルの証拠を残す。
結果にはツール版、ファームウェア・カーネル・ローダーとソースのハッシュ、実際の終了コード、
所要時間を含める。これは試験の照合用記録で、配布物のチェックサムではない。
生成物は `.gitignore` で除外する。

## 静的解析

起動試験でカーネルをビルドした後、リポジトリのルートで実行する。

```powershell
cargo +stable fmt --manifest-path native-os/Cargo.toml --all -- --check
cargo +stable clippy --manifest-path native-os/Cargo.toml -p elysia-boot-protocol --all-targets --locked -- -D warnings
cargo +stable clippy --manifest-path native-os/Cargo.toml -p elysia-kernel --target x86_64-unknown-none --locked -- -D warnings
$env:ELYSIA_KERNEL_PATH = (Resolve-Path native-os/target/x86_64-unknown-none/release/elysia-kernel).Path
$env:ELYSIA_BOOT_MODE = 'normal'
cargo +stable clippy --manifest-path native-os/Cargo.toml -p elysia-bootloader --target x86_64-unknown-uefi --locked -- -D warnings
```

## 引き継ぎ契約と限界

- ELF64、little-endian、x86-64、ET_EXEC。最大 8 個の program header を検査し、
  動的リンク・再配置を必要とする像を受け付けない。ロード領域は 32〜40 MiB に限定する。
- UEFI が固定領域を確保できなければ停止する。範囲外、切り詰め、重複、W+X の load segment、
  実行可能な初期化済み領域にない entry を拒否する。
- UEFI エントリーは `efiapi`、カーネルへの引き継ぎは `sysv64`。
  RDI で `repr(C)` の `BootInfo` へのポインターを渡す。構造体の版は 1、サイズは 64 bytes。
  呼び出し元のスタックを引き継いだ後、カーネル冒頭で専用の 64 KiB スタックに切り替える。
- 起動情報と 32 KiB のメモリマップはローダー内の static 領域に置く。
  ExitBootServices のキー不一致時は、割り当てを増やさずマップを取り直し、最大 3 回で停止する。
  終了に成功した後はファームウェアサービスを呼ばない。
- M1 は UEFI が残した identity mapping を利用する。ローダー、マップ、ページテーブルを
  回収しない。ELF の W+X 拒否は入力の検査であり、CPU のページ権限を設定した証拠ではない。
- 割り込みは無効、1 CPU 限定。GDT と IDT は独自に設定するが、例外は診断して終了するだけ。
  page fault の専用入口はあるが今回の故障注入は `ud2`。二重故障用スタックや復帰処理は未実装。
- 起動情報のポインターは、このローダーからの有効なポインターを前提にする。
  任意の第三者ローダー、実機、Secure Boot、メモリ隔離を保証しない。

次の M2 では、予約領域を保護する物理メモリ管理と独自ページテーブルを先に作り、
ユーザー空間・システムコール・実行切替へ進む。
