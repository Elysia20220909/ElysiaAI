# M2a メモリ検証 — 予約領域と独自ページテーブル

2026-09-12、固定した QEMU 上で物理ページ管理と独自ページテーブルへの切り替えを検証した。
M2a は M2 の最初の単位で、プロセス隔離の達成を意味しない。
基準は M1 の `43b81a0eda53abcf45cb40e432423b3768e805e5`。
対象実装はこの文書を含む変更の [native-os](../../native-os/README.md)。

## 実装した境界

`memory/` は物理ページの資格と割り当て状態を二つのビットマップで管理する。
1 ページは 4 KiB、管理上限は 256 MiB。未割り当てページを取り出す処理と、
所有者が参照を取り除いた後に返す処理を提供する。アドレス自体を安全な権限とは扱わない。

- EFI Conventional Memory のみを利用する。Runtime 属性、Loader、Boot Services、
  Runtime Services、ACPI、MMIO、不明な種別は対象外。旧ファームウェア領域を再利用しない。
- 最初の 1 MiB を予約し、カーネル・起動情報・メモリマップの範囲も明示的に除外する。
- descriptor の長さ、stride、ページ整列、加算・乗算 overflow、範囲の重複を検査する。
  マップ全体の検査が終わるまで利用可能ページを公開しない。
- 二重解放、予約領域・未整列・範囲外の解放、所有状態を捨てる再初期化を拒否する。
- ゲスト起動時、マップから得た全候補を枯渇まで割り当てて数と予約除外を検査し、
  解放・再利用・二重解放拒否を確認してからページテーブルを割り当てる。
  この全件試験は管理状態の検査であり、全 RAM に書き込むメモリ診断ではない。

`kernel/src/paging.rs` は新しいフレームをゼロ初期化して四段ページテーブルを構築する。
UEFI のテーブルを複製・参照して使い続ける方式ではない。階層に使うフレームは最大 32 個。

| 対応付ける領域 | ページ権限 |
| --- | --- |
| カーネルのコード | supervisor / read / execute |
| 読み取り専用データと GDT | supervisor / read / no-execute |
| 書き込み可能データ、BSS、スタック、IDT | supervisor / read-write / no-execute |
| 新しいページテーブル | supervisor / read-write / no-execute |
| 読み書き試験用の 1 フレームと仮想アドレス 0x40000000 の別名 | supervisor / read-write / no-execute |

必要な範囲だけを 4 KiB ページで対応付ける。W+X と同じ仮想ページへの二重登録を拒否する。
BootInfo はカーネルのスタックへコピーし、UEFI マップはビットマップへ反映してから手放す。
切り替え後はローダーや UEFI のメモリマップへのポインターを参照しない。

NX 対応を CPUID で確認し、EFER.NXE と CR0.WP を有効にする。
CR4.PGE を落として古い global translation を無効化し、新しい root を CR3 に設定する。
読み戻した CR3 が新しい root と一致し、旧 root と異なることを確認する。
PCID または五段ページングが有効な環境は、今回の固定構成の対象外として停止する。
仕様の根拠: [Intel SDM](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html) の
Volume 3A、Paging と Protection、[UEFI メモリマップ](https://uefi.org/specs/UEFI/2.10_A/07_Services_Boot_Services.html)。

## 実測結果

M1 と同じ Rust 1.96.0、QEMU `11.1.0 (v11.1.0-12130-ge470268ff4)`、同梱 EDK II、
`pc-q35-11.1`、`qemu64`、TCG、1 CPU、256 MiB。画面・monitor・NIC は無効。
QEMU と二つの firmware ファイルのハッシュが M1 の記録と一致することを確認して再利用した。
外部 crate は r-efi 6.0.0 のまま。新しい外部依存やホストへのインストールはない。

| ケース | 必須の動作 | QEMU 期待 / 実測コード | 結果 |
| --- | --- | --- | --- |
| normal | フレーム検査 → CR3 切り替え → 別名経由で RAM の両端を読み書き → ready | 33 / 33 | 合格 |
| bad-boot-info | 破損した起動情報を拒否し、メモリ初期化に進まない | 35 / 35 | 合格 |
| invalid-opcode | 新しいアドレス空間で `ud2` の例外を診断 | 37 / 37 | 合格 |
| stale-map-key | マップキーの再取得後、新しいアドレス空間で起動 | 33 / 33 | 合格 |
| unmapped-page | 0x50000000 の読み取りを拒否、CR2 一致、PF error=0 | 39 / 39 | 合格 |
| readonly-page | RO データへの書き込みを拒否、CR2 一致、PF error=3 | 41 / 41 | 合格 |
| noexecute-page | NX データページでの実行を拒否、CR2 一致、PF error=0x11 | 43 / 43 | 合格 |

page fault は CPU の vector 14 で受け、スタック上の error code と CR2 のアドレスを取得する。
注入前に設定したアドレス・エラー種別が両方一致したときだけ、その試験の合格コードで終了する。
別の例外、別アドレス、別エラーを合格扱いしない。例外から復帰する処理はまだない。

判定 runner は M1 のログだけでは通らない。壊れた起動情報を除く全ケースで、
フレーム検査、CR3 切り替え、実際の RAM 読み書きの順序を必須にしている。
Rust のホスト側テストは既存 11 件とメモリ管理 6 件、Python の判定テストは 9 件。
format / clippy、encoding / Git hygiene、差分、相対リンク、機密情報検査も実行する。

## 試験が保護の欠落を検出することの確認

通常のコードから一時的に保護を外した二つのローカル検証も行った。

| 一時的に変えた点 | 観測 | runner 判定 |
| --- | --- | --- |
| CR0.WP の設定を解除へ変更 | 書き込みが成立し `failure:readonly-write-succeeded`、QEMU 255 | 不合格・runner 1 |
| 専用 NX 試験ページの leaf entry だけ NX を除去 | RET が実行され `failure:noexecute-call-succeeded`、QEMU 255 | 不合格・runner 1 |

一時変更は終了時に元のバイト列へ復元し、通常の 7 ケースを再実行する。
保護を解除する feature や経路はコミットしない。試験用ページの RET は、NX が効かなかったとき
確実に不合格へ戻すための内容であり、通常はその命令自体の実行が CPU に拒否される。
証拠は無視された `native-os/out/negative-controls/` に保持する。

## 再現手順と限界

取得・基本手順は [実装 README](../../native-os/README.md)。既存の検証用 QEMU を別の場所から
再利用する場合は、リポジトリルートで次の形で実行する。

```powershell
cargo +stable test --manifest-path native-os/Cargo.toml -p elysia-memory -p elysia-boot-protocol --locked
python -m unittest discover -s native-os/tools -p 'test_*.py' -v
python native-os/tools/boot_test.py --case all --qemu <QEMU本体のパス> --firmware-dir <shareのパス>
```

各起動は 45 秒で打ち切る。完全なログと環境・照合用ハッシュは
`native-os/out/<case>/serial.log` と `native-os/out/results.json`。コミットするのはソースと文書のみ。

M2a は起動時に一つのカーネル用アドレス空間を作る段階である。Ring 3、プロセス間の隔離、
システムコール、実行切替、動的な map/unmap、TLB shootdown、二重故障用スタック、
ページテーブルと firmware 領域の回収は未実装。フレーム番号の解放 API は内部の単一所有者を
前提とし、古いハンドルによる解放を防ぐ世代番号や Capability はまだない。
ページテーブルと試験用フレームは割り当てたまま保持する。

予約領域の再利用を拒否することと、CPU がページのアクセス権を強制することを検証した。
「不正なプロセスだけを停止し、ほかを継続する」という M2 全体の条件はまだ満たしていない。
AI 推論、実機、新規マシン全体での環境再現も未検証のままである。
