# ElysiaAI // INFINITE RESONANCE — 最初のカーネル

UEFI ローダーから独自の x86-64 カーネルへ制御を渡し、物理ページを管理して
独自ページテーブルへ切り替える、M1 / M2a / M2b / M2c / M3a / M3b / M3c / M3d / M3e / M3f の実装。固定した 2 プロセスを Ring 3 で動かし、
M2c ではタイマーによる強制切替と、終了・故障・予算到達時の資源回収を加えた。
M3a は固定した 2 者の IPC、権限ハンドル、待機と起床を扱う。
M3b では、許可した合成資料を RAM から読み取るサービスを加えた。
M3c はクライアントを維持したサービス再起動と、上限付きの再接続を扱う。
M3d は別ビルドの静的 ELF を RAM から検査してロードする。
既存の Bun / Python / Tauri アプリとは独立した Rust workspace としてビルドする。
AI 推論、汎用 ELF・ディスクからのロード、ファイルシステムはまだ含まない。

設計の背景は [独自 OS の構想](../docs/native-os/README.md)、
実測結果は [M1 起動検証](../docs/native-os/BOOT_VALIDATION.md) と
[M2a メモリ検証](../docs/native-os/MEMORY_VALIDATION.md)、
[M2b ユーザー空間の検証](../docs/native-os/USERSPACE_VALIDATION.md)、
[M2c 資源回収と実行制御](../docs/native-os/LIFECYCLE_VALIDATION.md)、
[M3a 通信と権限](../docs/native-os/IPC_VALIDATION.md)、
[M3b RAM 資料サービス](../docs/native-os/DOCUMENT_SERVICE_VALIDATION.md)、
[M3c サービス復旧](../docs/native-os/SERVICE_RECOVERY_VALIDATION.md)、
[M3d ユーザー ELF](../docs/native-os/USER_ELF_VALIDATION.md)、
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
  -> M3b ケースでは資料の read / revoke、範囲検査、サービス終了時の回収
  -> M3c ケースではサービスだけを再起動し、新しい権限で再接続
  -> M3d ケースでは別ビルドの静的ユーザー ELF をロード
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

最後のコマンドが、ユーザー ELF、カーネル、各ケースのローダーの順にビルドし、QEMU を順番に起動する。
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
$env:ELYSIA_CLIENT_ELF = (Resolve-Path native-os/target/x86_64-unknown-none/release/elysia-document-client).Path
$env:ELYSIA_SERVICE_ELF = (Resolve-Path native-os/target/x86_64-unknown-none/release/elysia-document-service).Path
$env:ELYSIA_USER_ELF = (Resolve-Path native-os/target/x86_64-unknown-none/release/elysia-user-probe).Path
cargo +stable clippy --manifest-path native-os/Cargo.toml -p elysia-kernel -p elysia-user-probe -p elysia-document-service -p elysia-document-client --target x86_64-unknown-none --locked -- -D warnings
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

## M3b の RAM 資料 ABI

資料は `documents.rs` 内の合成データ 2 件。カーネルが pid 0 へ資料 0、pid 1 へ資料 1 の
ハンドルを発行する。クライアント pid 0 は自身の資料だけをサービス pid 1 経由で読む。
要求に PID は含めず、固定 2 者の IPC から受信者の相手を送信者として確定する。
任意のエンドポイントへ拡張するときは、この送信者の導出を変更する必要がある。

| 項目 | 形式 |
| --- | --- |
| 要求 | 32 bytes、little-endian u64 × 4：操作、資料ハンドル、オフセット、長さ |
| 操作 | 1 = read、2 = 自分の読み取り権限の revoke。revoke のオフセット・長さは 0 |
| 応答 | 64 bytes：i64 状態、u64 長さ、最大 48 bytes のデータ。未使用部分は 0 |
| syscall 6 | `RDI=応答先`、`RSI=64`。pid 1 だけが、直前に届いた要求を一度処理できる |
| 戻り値 | 64 または負のエラー。応答内の状態は 0 / -9 / -22 / -38 / -90 |

応答先は所有する書き込み可能な範囲に限り、検査に失敗しても保留要求を消費しない。
保留要求がある間の次の receive と、処理済み要求の再実行は -11。クライアントからの
syscall 6 は -13。データの保管・権限検査はカーネル内であり、独立した汎用ファイルサーバーではない。
資料を読み終えた後に権限を失効しても、既に受け取ったコピーを取り消すものではない。

追加ケースは `document-read`、`document-denied`、`document-revoke`、`document-range`、
`document-service-exit`、`document-service-fault`。M3b までのケースは計 33 件で、M3c の 6 件、M3d の 6 件を含む `--case all` は計 45 件。
サービスも最大 64 tick の制約を受ける。終了・故障・予算停止時は保留要求と権限を破棄し、
通信資源とページを回収する。静的資料はカーネルの読み取り専用領域に残る。

## M3c の再接続 ABI

`syscall 7` は固定クライアント pid 0 だけが呼べる。サービス pid 1 が回収済みの場合に、
新しいアドレス空間・通信路・資料権限をまとめて作る。クライアントの root、レジスター、
メモリと累積 tick は維持し、失った依頼は自動再送しない。クライアントが -32 を受け取り、
再接続後に新しい読み取りを送る。

| 引数・結果 | 内容 |
| --- | --- |
| RDI / RSI | 書き込み可能な所有バッファ / 24 bytes |
| 成功 | 24。little-endian u64 × 3：新しい send、receive、資料ハンドル |
| -13 | クライアント以外の呼出し |
| -11 | サービスが残っている、再起動上限、接続状態が再作成を許さない |
| -22 / -14 | 応答長が 24 でない / 書けない応答先 |
| -12 | 新しいプロセスの構築失敗。部分確保は回収し、応答バッファと公開済み状態を保つ |
| -9 | 権限発行値の桁あふれ等。再発行しない |

再接続権限は固定した pid 0 にのみ与える初期ポリシーで、汎用のサービス作成 API ではない。
発行値と世代を継承して新しいハンドルを作る。古いハンドルの有効化は行わない。
資料 0 への権限は新しい接続に対して明示的に再発行するため、接続単位の revoke を永続的な禁止とはしない。
新しいセッションを組み立てる途中で失敗しても、既存の接続情報を先に書き換えない。

成功した再起動は最大 8 回。サービスは各世代 64 tick、クライアントは全世代を通じて 1024 tick。
失敗した再接続では回数を消費しないが、クライアントの tick 上限は継続する。待ち時間や指数的 backoff は未実装。
復旧試験は専用の 1 ページ以内のユーザーイメージを使い、既存ケースとロード経路を共有する。
`recovery-allocation` は新サービスの確保上限を一度だけ 3 フレームに制限して部分失敗を起こす。
通常の復旧経路は 32 フレームを上限とする。ケース一覧と実測値はサービス復旧の検証記録を参照する。

## M3d のユーザー ELF

`apps/probe/` はカーネルと別の Rust package と linker script を持つ最小プログラム。
runner が先にビルドし、`ELYSIA_USER_ELF` のファイルを kernel の起動用 RAM bundle に埋め込む。
実行コードは別 ELF だが、bundle の差し替えには現在カーネル・ローダーの再ビルドが必要。
ディスクやホストファイルを実行中のゲストから読む機能ではない。生成 ELF は ignored の target 内にだけ置く。

| 項目 | 最初の契約 |
| --- | --- |
| 形式 | 最大 64 KiB、ELF64 little-endian x86-64 ET_EXEC |
| program headers | ちょうど 2 個の PT_LOAD。動的・interpreter・その他の型は拒否 |
| コード | 0x40000000、RX、最大 4096 bytes。entry はファイル内にあるコード bytes の範囲 |
| データ | 0x60000000、RW/NX、最大 4096 bytes。file size を超える部分はゼロ |
| 整列 | 両セグメントとも p_align=4096、file offset は 4096 の倍数、ヘッダー領域外 |
| スタック | プロセス専用、既存の 0x80000000 に 1 ページ、RW/NX |
| 権限 | log / yield / exit のみ。IPC・資料・再起動のハンドルを発行しない |

検査は確保前に完了する。ファイル範囲の桁あふれ、切り詰め、セグメント重複、W+X、
カーネル・相手・スタックの配置、実行領域外の entry を拒否する。物理アドレス欄をロード先には使わない。
受け付ける配置が固定なので、既存の所有ページ・範囲検査を使える。汎用 ELF ローダーではない。

`elf-run` は初期データ・BSS・entry・独立ページを確認する。`elf-fault` / `elf-readonly` /
`elf-noexecute` は故障隔離、`elf-reject` は不正入力 9 種、`elf-rollback` は全 14 箇所の部分確保失敗を扱う。
ELF ケースは各プロセス 64 tick。ゲスト合格コード 51、runner 成功は 0。
リンカー設定変更も build script の入力として追跡する。手動ビルド時もユーザー ELF を先に作り、
`ELYSIA_USER_ELF`、`ELYSIA_SERVICE_ELF`、`ELYSIA_CLIENT_ELF` を設定してからカーネルをビルドする。

## M3e の資料サービス ELF

`apps/document-service/` は復旧試験のサービス側だけを独立させた内部 package。
`recovery-*` の 6 ケースでは PID 1 の初回起動・再起動とも検査済み ELF entry を使う。
runner は probe と service を先にビルドし、`ELYSIA_SERVICE_ELF` を追加で kernel に渡す。
M3e 時点ではクライアントをカーネル内に残したが、M3f で独立 ELF に移した。旧 `document-*` の 6 ケースは
M3b の試験コードを維持する。ケースの追加ではなく既存復旧経路の移行であり、全件数は 45。

サービスは受信した要求を syscall 6 へ渡す。読み取り権限の判定と資料バイトの提供は引き続きカーネルが行う。
ELF の出自だけで権限を与えず、既存のプロセス別 capability 検査を通す。
初期データと BSS を毎世代確認し、故障・終了・CPU 上限で回収後、新しいサービスをロードする。
クライアントの空間を保持し、古い通信・資料権限を拒否して読み取りを再開する。

[検証記録](../docs/native-os/SERVICE_ELF_VALIDATION.md)。ディスク、動的リンク、実行中の bundle 差し替えは対象外。

## M3f のクライアント ELF と起動契約

`apps/document-client/` は復旧クライアントの独立 package。旧 recovery_program.S を移し、カーネルへの
命令列の組み込みを除いた。runner は probe / service / client の三つの ELF を先に作り、各ハッシュを記録する。
`recovery-*` の初回起動は双方を ELF からロードし、再起動時は service だけをロードする。

| 起動レジスター | クライアント PID 0 | サービス PID 1 |
| --- | --- | --- |
| r8 / r9 | 自身の送信 / 受信 | 自身の送信 / 受信 |
| r11 | 自身の資料権限 | 0（資料権限を発行しない） |
| r10 / r14 | 0（相手の権限を渡さない） | 0 |
| r12 / r13 / r15 | PID / 試験モード / 世代 | PID / 試験モード / 世代 |

その他の汎用レジスターはゼロ。entry、stack、CPU 権限と flags はカーネルが設定する。
`launch::recovery_frame` は確保前に契約を確認し、初回と再起動に共通で使う。
資料の判定は IPC で確認した実際の送信者に結び付け、サービス自身への読み取り権限は不要。
再接続の 24-byte 応答はクライアント自身の新しい send / receive / document のみ。
各 ELF は未発行ハンドルと送受信の取り違えを試し、クライアントはサービス専用操作の拒否も確認する。
再接続後は古い資料権限・ゼロ権限の両方が拒否され、認可済みの読み取りだけを再開する。

従来の M3a/M3b 試験には負の検証用に相手のハンドルを渡す経路が残る。この契約は復旧 ELF の経路を対象とする。
log / yield / exit と役割限定 syscall 6 / 7 は既存の契約を維持し、一般的な権限委譲 API は追加しない。
[検証記録](../docs/native-os/CLIENT_ELF_VALIDATION.md)。全 45 ケース。実機や実行中の ELF 差し替えは未対応。

## M3g の起動定義

`kernel/src/launch.rs` の `BOOT` に ELF、通信先、資料権限、所有フレーム・CPU tick 上限を定義する。
カーネルの `CEILING` を超える定義は権限発行前に拒否する。初回と復旧で同じ定義を使い、
再起動時の定義変更も拒否する。対象は既存2プロセスで、外部設定や動的 spawn は未対応。
[設計と検証記録](../docs/native-os/LAUNCH_POLICY_VALIDATION.md) を参照。

## M4a の操作契約

固定した1操作について、承認した資料・入力・予算と実行要求を照合し、状態を RAM に記録する。
新しい `operation-*` の5ケースで、正常実行・拒否・中断・成否不明・失敗を区別する。
承認元は明示的な試験用入力。実ユーザー向け承認画面、永続記録、AI 推論は含まない。
[設計と検証記録](../docs/native-os/OPERATION_CONTRACT_VALIDATION.md) を参照。
