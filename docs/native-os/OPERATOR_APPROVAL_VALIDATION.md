# M5b：シリアル端末での操作承認

固定の RAM 資料を16 bytes 読む操作について、試験用の自動承認を
QEMU COM1 の入力で置き換える。従来の自動試験モードは回帰検証用に残す。
新しい mode 54 は専用ディスクを検査した後でのみ起動する。

## 操作

提案を永続保存してから、操作 ID、呼出元・実行役、版、対象ハンドル、
オフセット、長さ、byte 上限、実行期限 tick を表示する。
現在の対象は RAM 資料0（`ELYSIA RAM GUIDE`）、ハンドル256である。
`approve 1` または `deny 1` を入力して Enter を押す。承認は1回の読み取りだけに適用される。

入力は最大32 bytes の ASCII。違う ID、余分な引数、桁あふれ、制御文字、
長すぎる行は Interrupted として保存して終了する。拒否は Denied として保存する。
入力前と判断後に、ゲスト UART の受信 FIFO を消去する。ホスト側の stdin / pipe や
転送途中の入力は消去対象外のため、信頼された入力元は今回のプロンプトを確認してから送信する。
アプリからこの承認元を設定する syscall はない。

入力期限は PIT channel 2 の約50 ms × 600回、約30秒のゲスト時間。
無入力でも Interrupted を保存して終了する。タイマー停止・UART エラーも実行しない。
この期限は、プロセス実行に使う既存の `deadline-tick` とは別である。
単一 CPU のこの実装はカーネル内で入力待ちするため、その間ユーザープロセスは進まない。
`async-*` で追加した限定的な処理継続は [M5c の検証](ASYNC_APPROVAL_VALIDATION.md)を参照。
一般用途の非同期コンソールや承認 UI は今後の課題。

表示した Plan 全体を既存 Manager に渡す。承認後の内容変更、自己承認、
二重実行は既存の操作契約チェックで拒否する。
Approved / Running / Completed は従来の flush・読み戻しを経て保存する。
再起動時は記録を照合して停止し、操作や権限を復元しない。

## 手動入力の入口

Windows のターミナルから次を実行する（GUI 操作は不要）。
QEMU と firmware のパスには既存の固定版環境を指定する。

```powershell
python native-os/tools/boot_test.py --case operator-approve --operator-manual --qemu <qemu-system-x86_64.exe> --firmware-dir <share>
```

コマンドはビルドして新規の試験用ディスクを作り、提案が表示された後に stdin の入力を待つ。
終了後は同じディスクで再起動し、読み取りのみであることを検証する。
既存ディスクや物理デバイスのパスは受け付けない。各回のディスクとログは
`native-os/out/operator-approve/operator-*/` に残る。

`--operator-manual` を指定しない場合は自動試験入力を送る。
自動試験の成功は、人間による対話操作を実証したという意味ではない。

## 検証範囲

- operator-approve：承認後に1回だけ実行し、Completed を復旧する。
- operator-deny：Denied、実行0回。
- operator-invalid：余分な引数を拒否、Interrupted、実行0回。
- operator-wrong-id：違う ID を拒否、Interrupted、実行0回。
- operator-timeout：無入力で timeout、Interrupted、実行0回。
- operator-replay：承認を二つ送っても実行1回だけ。

全ケースで、再起動時にも旧 `approve 1` を送る。新たなプロンプト・ユーザー起動・
権限復元・追記がなく、ディスクハッシュが不変であることを要求する。
入力パーサーの桁あふれ等は Rust 単体試験、判定器の証拠欠落・誤った終了値・
未承認実行の誤受理は Python 単体試験で検査する。

## 信頼境界と限界

COM1 のホスト側を操作できる人・プログラムを信頼する。これは本人認証でも署名でもない。
AI や未信頼プログラムにこの入力経路を渡してはいけない。
ディスクを捨てて新規作成すると ID は再び1となる。永続的な世界全体の一意 ID や
ロールバック耐性を提供する仕組みではない。
一般的な復旧後の再承認・継続実行、資料更新、ネットワーク、AI 推論は含まない。
拒否・中断では VM を終了するため、通常運用のプロセス回収をこの経路で実証してはいない。
既存の CRC ログの認証・実電源断耐性に関する限界も変わらない。

## タイマーの参照

PIT mode 0 の出力判定は [QEMU i8254 共通実装](https://github.com/qemu/qemu/blob/master/hw/timer/i8254_common.c)、
channel 2 の制御ポートは [QEMU PC speaker 実装](https://github.com/qemu/qemu/blob/master/hw/audio/pcspk.c) を確認した。
この実装は既存の固定 QEMU 構成専用であり、実機ドライバーではない。

## 実行結果（2026-09-21）

Windows・固定 Rust 1.96.0 / QEMU 11.1.0 で QEMU 63/63ケース成功（既存57 + 新規6）。
Rust 61/61、Python 判定器31/31、Rustfmt、ホスト・カーネル Clippy（警告をエラー扱い）、
新規 Python の Ruff は成功した。入力期限のケースは再起動を含め約34.7秒で完了した。
手動入力用 CLI への標準入力による承認と、入力を送らず期限切れになる経路も成功。人が端末で入力する対話試験は未実施。
ステージ済み差分の検査は成功し、Gitleaks の秘密情報検出は0件だった。
