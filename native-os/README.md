# ElysiaAI // INFINITE RESONANCE — 最初のカーネル

UEFI ローダーから独自の x86-64 カーネルへ制御を渡し、物理ページを管理して
独自ページテーブルへ切り替える、M1 / M2a / M2b / M2c / M3a の実装。固定した 2 プロセスを Ring 3 で動かし、
M2c ではタイマーによる強制切替と、終了・故障・予算到達時の資源回収を加えた。
M3a は固定した 2 者の IPC、権限ハンドル、待機と起床を扱う。
既存の Bun / Python / Tauri アプリとは独立した Rust workspace としてビルドする。
AI 推論、任意のアプリのロード、ファイルシステムはまだ含まない。

設計の背景は [独自 OS の構想](../docs/native-os/README.md)、
実測結果は [M1 起動検証](../docs/native-os/BOOT_VALIDATION.md) と
[M2a メモリ検証](../docs/native-os/MEMORY_VALIDATION.md)、
[M2b ユーザー空間の検証](../docs/native-os/USERSPACE_VALIDATION.md)、
[M2c 資源回収と実行制御](../docs/native-os/LIFECYCLE_VALIDATION.md)、
[M3a 通信と権限](../docs/native-os/IPC_VALIDATION.md)、
取得元と確認範囲は [依存関係](DEPENDENCIES.md) を参照する。

## 起動経路

```text
QEMU / EDK II UEFI
  -> EFI/BOOT/BOOTX64.EFI  (Rust x86_64-unknown-uefi)
  -> 埋め込んだ ELF の検査、32 MiB 番地へのロード
  -> GetMemoryMap / ExitBootServices
  -> _start              (Rust x86_64-unknown-none)
  -> カーネル専用スタック、GDT / IDT、起動情報の検査
  -> 物理ページの割り当て管理、予約領域・枯渇・解放の検査
  -> 独自 CR3 / ページ権限へ切り替え、対応付けた RAM の読み書き
  -> M2b ケースでは Ring 3、int 0x80、協調切替、プロセスの終了・故障
  -> M2c ケースでは PIT 割り込み、累積 tick 上限、停止後の回収・再生成
  -> M3a ケースでは send / receive / revoke、待機・起床、通信相手終了時の回収
  -> シリアル診断 / QEMU 終了
```

`bootloader/` はファームウェアとの引き継ぎ、`boot-protocol/` は起動情報と ELF の検査、
`memory/` はホスト側でも試験できる物理ページの管理、
`kernel/` は引き継ぎ後の CPU 設定、ページテーブル構築、故障診断を担当する。
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
cargo +stable test --manifest-path native-os/Cargo.toml -p elysia-boot-protocol -p elysia-memory -p elysia-kernel --lib --locked
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
| `unmapped-page` | 未マップ領域を読み取る | 注入 → page fault、CR2 と error=0 を照合 | 39 |
| `readonly-page` | 読み取り専用データへ書き込む | 注入 → page fault、CR2 と error=3 を照合 | 41 |
| `noexecute-page` | 実行禁止データページを呼び出す | 注入 → page fault、CR2 と error=0x11 を照合 | 43 |
| `user-cooperate` | 2 プロセスが yield して終了 | 各プロセスのレジスター・スタック・データ保持、両方の終了 | 45 |
| `user-kernel` / `user-peer` | カーネル領域 / 相手だけのページを読む | 違反したプロセスの停止 → 相手のログ・終了 | 45 |
| `user-readonly` / `user-noexecute` | ユーザーコードを書換え / データを実行 | 正確な page fault → 相手の継続 | 45 |
| `user-invalid-opcode` / `user-io` | UD2 / 特権 I/O | #UD / #GP → 相手の継続 | 45 |
| `user-bad-stack` / `user-bad-return` | 未マップのスタックへ push / 不正な復帰スタック | #PF / 復帰検査で停止 → 相手の継続 | 45 |
| `user-gate` / `user-fpu` | DPL0 ゲートへ INT / 未対応の x87 命令 | #GP / #NM → 相手の継続 | 45 |
| `user-preempt` | yield しない無限ループ | IRQ0 による切替、相手の完走、予算到達時の停止・回収 | 47 |
| `user-recycle` | 正常終了と #UD を 64 世代反復 | root の再利用、消去済みデータ、毎回同じ空きフレーム数 | 47 |
| `user-yield-spin` | yield を繰り返す無限ループ | 累積 tick を維持し、予算到達後に停止・回収 | 47 |
| `ipc-echo` | AX / BY の依頼・応答、権限・バッファ拒否 | 所有者・操作権限の検査、受信バッファ検査、待機と起床 | 49 |
| `ipc-peer-exit` / `ipc-peer-fault` | 相手が終了 / #UD | 待機解除で -32、正常な相手の終了と回収 | 49 |
| `ipc-revoke` | 受信権限で通信を失効 | 待機解除、古いハンドルの -9、キュー破棄 | 49 |
| `ipc-deadlock` | 両者が受信待ち | 二人目に -35、送信へ切替後の進行 | 49 |
| `ipc-queue` | 容量 2 件を超える送信 | -11、終了時の残存メッセージ消去 | 49 |

M2b の各ケースでは、Ring 3 からの呼出し、不正システムコールの拒否、yield による切替、
正常な相手の継続を必須にする。単にプロセスが故障しただけでは合格にならない。
ユーザーのログは 16 進数にして、カーネル診断を偽装する文字列を出せないようにする。

全ケースで、ローダー開始、ロード完了、Boot Services 終了、カーネルへの到達、
独自例外テーブルの設定を順に要求する。予期しない故障・panic・時間切れ・終了コードの不一致は
不合格。故障ケースに `kernel:ready` が出ても不合格とする。
壊れた起動情報のケースを除き、物理ページ検査、独自ページテーブルの有効化、
対応付けたメモリの読み書きも必須。M1 のログだけでは M2a の合格にしない。

`isa-debug-exit` へ書き込む値は通常 `0x10`、壊れた起動情報 `0x11`、意図的な例外 `0x12`、
page fault の試験 `0x13`〜`0x15`、M2b 全体の成功 `0x16`、M2c 全体の成功 `0x17`、M3a 全体の成功 `0x18`、予期しない失敗 `0x7f`。
QEMU は `(値 << 1) | 1` をプロセス終了コードとする。
したがってゲストの正常完了は 33 であり、全試験を通した Python runner 自体の成功は 0。

`native-os/out/<case>/serial.log` と `native-os/out/results.json` にローカルの証拠を残す。
結果にはツール版、ファームウェア・カーネル・ローダーとソースのハッシュ、実際の終了コード、
所要時間を含める。これは試験の照合用記録で、配布物のチェックサムではない。
生成物は `.gitignore` で除外する。

## 静的解析

起動試験でカーネルをビルドした後、リポジトリのルートで実行する。

```powershell
cargo +stable fmt --manifest-path native-os/Cargo.toml --all -- --check
cargo +stable clippy --manifest-path native-os/Cargo.toml -p elysia-boot-protocol -p elysia-memory -p elysia-kernel --lib --tests --locked -- -D warnings
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
- M2a は初期化中だけ UEFI の identity mapping を利用する。起動情報をカーネルのスタックへ
  コピーし、マップを物理ページ管理のビットマップへ反映した後、独自の四段ページテーブルへ切り替える。
  切り替え後はローダーのポインターを参照しない。旧ローダーやファームウェアの領域は回収しない。
- 4 KiB ページ、256 MiB までの物理メモリ、最初の 1 MiB は予約。
  EFI Conventional Memory かつ Runtime 属性のないページだけを対象にする。
  kernel / 起動情報 / map は明示的にも除外する。重複 descriptor は受け付けない。
- 有効化前の root だけを構築する。カーネル用テーブルは最大 256 フレーム、
  各プロセスの所有テーブルとユーザーページは合わせて最大 32 フレーム。カーネルの葉は supervisor-only。
  コードは RX、読み取り専用データは R/NX、データ・スタック・ページテーブルは RW/NX。
  CR0.WP と EFER.NXE を有効にし、旧 global TLB を除去して CR3 を更新する。
- 1 CPU 限定。カーネル内は割り込み無効、M2c のプリエンプション試験と M3a の試験でユーザー実行時に IRQ0 を許可。GDT / IDT / TSS を設定し、二重故障には専用 IST スタックを使う。
  カーネル例外は終了、同期ユーザー例外はそのプロセスを停止する。NMI・二重故障・machine check は復帰しない失敗とする。
- 起動情報のポインターは、このローダーからの有効なポインターを前提にする。
  任意の第三者ローダー、実機、Secure Boot、任意のアプリに対する完全な隔離を保証しない。

## M2b の暫定 ABI と制限

`int 0x80` を DPL3 から呼ぶ。番号は RAX、引数は RDI / RSI / RDX、返り値は RAX。
ほかの汎用レジスターと DF・算術フラグを保持する。これは固定試験用の ABI で、公開互換性は約束しない。

| RAX | 操作 | 引数と結果 |
| --- | --- | --- |
| 0 | log | RDI=ユーザーポインター、RSI=0〜128 bytes。所有する単一ページ内の範囲だけをコピーし、長さを返す。不正な範囲は -14 |
| 1 | yield | 他の runnable プロセスへ実行権を渡す。自分だけなら自分を継続し、0 を返す |
| 2 | exit | RDI=u32 の終了状態。範囲外は -22。受理したら戻らず、残りのプロセスへ移る |
| その他 | 未知の番号 | -38 を返す |

コード `0x40000000`、データ `0x60000000`、スタック `0x80000000` は各 4 KiB。
加えて `0x70000000 + pid * 0x2000` に各自専用の 4 KiB ページを持つ。
コードは user/RX、データ・専用ページ・スタックは user/RW/NX。
同じ仮想アドレスでも物理ページは別々である。カーネルの物理アドレス別名は supervisor-only。

ページと root はプロセスの所有物として確保する。停止後はカーネル root へ移り、
所有フレームをゼロ消去して返却する。64 世代の再生成と部分確保の失敗時の回収を試験する。
共有する supervisor-only の RAM マッピングとカーネル本体は回収対象に含めない。
M3a の receive はプロセスを待機させるが、カーネル内で待ち続けない。
保存 frame と受信先の数値情報を保持し、入口のカーネルスタックは 1 CPU の TSS RSP0 を共用する。
ユーザーのコード・スタック範囲と CS / SS を復帰前に検査し、危険な RFLAGS は除去する。
浮動小数点・SIMD の保存復元は未実装なので、CR0.EM / TS により使用を拒否する。

ユーザープログラムはカーネルに埋め込んだアセンブリの試験用コードで、任意の ELF を読み込まない。
M2c の `user-preempt` / `user-yield-spin` は PIT を約 100 Hz で動かす。
累積割り込み回数が上限（試験では pid 0 が 8、pid 1 が 64）に達したプロセスを停止する。
yield やシステムコールでカウンターを初期化しない。これは粗い tick 単位の制限であり、
厳密な CPU 時間計測や実時間の期限保証ではない。カーネル処理中は割り込みを受け付けない。
一般的な IPC 通信先と権限委譲、任意のアプリのロード、プロセス作成 API、AI 推論、実機向け APIC 対応は未実装。


## M3a の通信 ABI

起動時にカーネルが各プロセスへ send / receive の 2 ハンドルを与える。
固定試験では R8 が相手への send、R9 が自分の receive。第三者のハンドル値を知っていても、
自分の権限表に存在しなければ操作できない。乱数やハンドル値の秘密性には依存しない。

| RAX | 操作 | 引数と結果 |
| --- | --- | --- |
| 3 | send | RDI=send handle、RSI=読み取り元、RDX=0〜64 bytes。コピーしてキューへ入れ、長さを返す。満杯は -11 |
| 4 | receive | RDI=receive handle、RSI=書き込み先、RDX=0〜64 bytes の容量。到着済みならコピー、空なら待機。容量不足は -90 としメッセージを残す |
| 5 | revoke | RDI=自分の receive handle。2 者の通信全体を失効し、両方向のキューを消去する |

不正・別主体・失効したハンドルは -9、操作権限の違いは -13、バッファの範囲違反は -14。
長さ超過は -90。相手終了時、または revoke で待機中の呼び出しを取り消すときは -32。
2 者とも受信待ちになる要求は二人目へ -35 を返し、そのプロセスを実行可能のままにする。
どちらかの終了で両方向の未受信メッセージを捨てる。送信成功は相手が処理した保証ではない。

IPC 試験もタイマーを有効にし、各プロセスを最大 64 tick に制限する。
権限表、キュー、待機情報は固定長。動的な通信先作成・権限移譲・共有メモリ IPC はまだ提供しない。
