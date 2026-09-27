# Agent の予算拒否記録と起動再試行

固定サイズの推論試験で、ページ予算の不足を Agent の永続記録へ残し、次の起動で一度だけ再計画して起動する経路を追加した。
対象は `infer-size-0` の合成整数モデルである。最初の拒否はプロセス起動前なので、これは Agent の**起動再試行**であり、稼働中の任意プロセスを復旧する機能ではない。

## 動作と権限

```text
1ページの提案 → 必要な2ページに足りない → Rejected を保存して停止
次の起動      → 現在の提案・ELF・全行を再検査 → Replanned を保存
              → LaunchCommitted を保存・flush・readback
              → 新しい起動権限で計算 → 全資源回収 → Completed を保存
再度の起動    → Completed は再実行せず停止
```

`--budget-recovery retry` は信頼されたビルド設定による明示的な試験方針であり、既定値は `off`。
記録だけから実行ファイル・権限・承認を復元しない。各起動で現在の埋め込み予算表と信頼側の ELF 識別値を再検査し、選択された形状の必要量を計算し直す。
再計画できるのは、表全体の構造・識別値・形状・上限が正しく、選択行だけが不足している場合に限る。
後続行に不正値があれば、先行する不足行で検査を打ち切らず拒否する。

予算は1ページから必要量の2ページへ補正する。上限16ページ、CPU 1024 tick、総フレーム上限32、資料・通信・ツールの権限、操作ごとの承認条件は維持する。
再計画は既知のデータ配置から求める決定論的な計算であり、LLMによる判断ではない。
サイズ試験は資料操作を実行せず、`state=Empty executions=0` を要求する。

| 保存された状態 | 次の起動での扱い |
| --- | --- |
| 空 | 拒否を記録して停止する |
| Rejected | 現在の信頼側設定を再検査し、再計画を記録する |
| Replanned | 同じ設定を再検査し、一度だけの起動を予約する |
| LaunchCommitted | 起動・完了の有無を断定できないため `launch-unknown` で停止する |
| Completed | `retry-exhausted` で停止する |
| 破損・別の対象・途中の空白 | 記録を変更せず停止する |

予約記録の書き込みに失敗すると、Agent を起動しない。完了記録は正常終了とメモリ・通信・資料権限の回収確認後にだけ追記する。
既存の操作 journal に記録が残っている場合も起動を止め、以前の操作を自動再実行しない。

## 記録の配置

専用32 KiBの QEMU テストディスクで、操作 journal のLBA 1〜8を維持し、Agent記録にはLBA 9〜12だけを使う。
4つの512-byteセクタへ `Rejected → Replanned → LaunchCommitted → Completed` の順で追記する。書き込みには既存のPIO、flush、readbackを使う。

各レコードはlittle endianで、以下を含む。未使用領域はゼロでなければならない。

| オフセット | 内容 |
| --- | --- |
| 0 | 8 bytes、形式識別子 `ELYBUD01` |
| 8 / 16 | u64の連番 / Agent ID |
| 24 / 56 | 32 bytesのGoal識別値 / 推論ELFのSHA-256 |
| 88 | u32起動モード |
| 92 / 94 / 96 | u16の提案ページ数 / 必要ページ数 / 上限 |
| 100 / 104 | u32の状態番号 / 前レコードCRC |
| 108 / 116 | u64のCPU予算 / u32の試行世代 |
| 120 / 122 / 124 | u16のbatch / features / classes |
| 128 / 130 / 132 | u16の単位1=native arena pages / 理由1=予算不足 / 配置版1 |
| 508 | 先頭508 bytesのCRC32 |

Goal識別値は既存の固定32-byte値で、暗号学的なハッシュではない。
読み出し時は、現在の信頼された要求から作る正規レコードと全バイトを比較し、CRC連鎖、対象、順序、予約領域を検査する。
CRCは認証ではなく、ディスク全体の巻き戻し防止機能もない。一度だけの制約は、今回の明示的な再試行設定と保持されたjournalの範囲に限られる。

## 再現手順

`native-os/` で、既存の固定版Rust/QEMU環境を使う。新規ディレクトリを出力先に指定する。

```powershell
python tools/validate_budget_recovery.py `
  --qemu <QEMUの絶対パス> `
  --firmware-dir <firmwareの絶対パス> `
  --output out/agent-budget-new-run
```

runnerは新規テスト用ファイルだけを使い、Agent再試行の各ブートのログ、ディスクの内容、前後のハッシュ、ビルド識別情報を保存する。
失敗があればsummaryの `completed` はfalseのままになる。実ディスクやホスト共有、ネットワークは接続しない。

`cut-replan` と `cut-launch` は記録を永続化した直後にdebug-exitで停止するチェックポイント試験。
`cut-replan` の次の起動は残る一回の起動へ進み、`cut-launch` の次の起動は成否不明として止まる。
途中書き込み、別Goal・ELF・形状、上限変更、空白・重複は、runnerが作るディスク内容への破損注入で調べる。
書き込みエラーにはQEMUの [blkdebug](https://www.qemu.org/docs/master/devel/testing/blkdebug.html) を使い、RejectedのLBA 9とReplannedのLBA 10へのEIOをゲストへ返す。
LaunchCommitted・Completedの書き込み、flush・readbackへの個別エラー注入や、ホストの実電断試験は実施していない。

## 検証範囲

2026-09-27の最終実行は `native-os/out/agent-budget-20260927-verified/summary.json` に保存した。
`completed=true`、13グループ・30ケースが成功。うち新しいAgent再試行は3設定で合計23ブートを検証した。
途中の統合実行では試験一覧の絞り込みが既存の復旧検証に必要な定義を隠したため失敗し、一覧を変更しない `selected_cases` 方式へ修正して全体を再実行した。

- Rustのworkspaceライブラリテスト85件が成功した。
- native Pythonテスト59件はWindowsとUbuntuの両方で成功し、研究側のPythonテスト24件もWindowsで成功した。
- host契約とguestカーネルのClippy、Rustfmt、対象PythonのRuff、差分の空白検査が成功した。
- 変更対象のソースと文書をGitleaksで確認し、この範囲で秘密情報の検出はなかった。
- Ubuntuは検証後に停止し、WSLの資源設定は変更していない。

統合runnerは、3種類の再試行設定、解析予算12形状、不正予算7種類、従来予算4ケース、既存の永続復旧4ケースを実行する。
新しい記録はディスク全体の期待値と比較し、操作領域や未使用領域に1 byteでも変更があれば失敗にする。
Rustの契約テストに加え、Pythonの検証器にも欠落・重複・順序違反・想定外書き込みの負例を用意した。

任意のAgent、動的なモデル変更、CPU不足の再計画、複数の未完了要求、記録のローテーション、再実行を伴う外部操作、実機の電断耐性は今回の対象外。
