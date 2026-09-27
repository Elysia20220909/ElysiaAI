# 分類結果の永続化・追加評価・承認付き保存

2026-09-27、[実資料の分類Agent](DOCUMENT_AGENT_VALIDATION.md)を、一つの依頼を記録して再起動後に照合できる構成へ進めた。
Ubuntuで固定モデルを評価し、QEMUのRing 3で分類する。ホストが限定された依頼をGoalへ変換し、
カーネルは分類結果を永続化する。候補一覧の保存は、その後の信頼済みコンソールでの承認を必要とする。

## 一つの依頼と境界

`document_task.py`は、次の三つの依頼だけを受け付ける。

- カーネル開発の資料を探して
- 独自カーネルの資料を探して
- カーネル開発の資料を探してください

前後の空白、末尾の句読点、先頭の「こんにちは、」等を正規化する。
一致しない依頼・前後の空白除去後に残る制御文字・長すぎる入力は、資料の検証やセッション作成より前に拒否する。
これは有限の文法による変換であり、自由文を理解するLLMではない。
Goalは`elysia:document-classifier:v0001`、処理は許可済み8文書からの候補生成、
提案する操作は専用ディスクのLBA 17への512-byte結果レポート保存に固定する。
任意のホストファイルを開く機能や、汎用ファイルシステムへの保存は含まない。

分類Agentの権限は従来どおりcontext・authority・tools・networkが0、arena上限1ページ、CPU上限1024ticks。
Agentへディスクや承認のsyscallは与えない。内部の進捗記録と、承認が必要な結果レポートの保存を分ける。
ホストのCLIも自動承認せず、ゲストが分類完了後に表示するIDへの`approve <ID>` / `deny <ID>`を待つ。
IDは入力packetのSHA-256の先頭8bytesに由来する照合番号であり、秘密の認証トークンではない。
信頼済みCOM1を操作できるホストを信頼境界とする。ゲストFIFOの破棄はホスト側の入力queueまで消去する保証ではない。

## 永続状態

専用32KiBディスクの既存ヘッダー・操作journal・予算再試行領域は維持する。
今回の進捗はLBA 13〜16、結果レポートはLBA 17に置き、空のsectorへ一度だけ書く。
各書き込みをflushし、読み戻して全bytesを確認する。

```text
Started → Completed → SaveCommitted → Saved
                  └→ Denied / Interrupted
```

| 起動時の状態 | 動作 |
| --- | --- |
| 空 | Startedを保存した後でAgentを起動する |
| Started | 分類の成否不明として停止。自動で再実行しない |
| Completed | 記録済み結果を再利用。保存する場合だけ新しい承認を求める |
| SaveCommitted | 保存の成否不明として停止。書き直さない |
| Saved | 保存済みとして終了。Agent起動・承認要求・再保存なし |
| Denied / Interrupted | 決定済みとして終了。再要求・再保存なし |
| 破損・別のjob・不正なreport | 権限を復元せず拒否する |

Completedは全8件のID・スコア・分類を収集し、正常終了と資源回収の検査を通過した後だけ保存する。
各記録はAgent ID、Goal、モデル・入力・実際のpacket・実際のELFのSHA-256識別値、
固定予算、連番、前レコードのCRCを含む。Completed以降は全8件の結果も含む。入力本文自体は複製しない。
同じモデル・入力でも実行ELFが変わった場合、古い記録をそのまま再開しない。
正規形式全bytesと結果の順序を照合し、再計算されたCRCがあってもGoal・識別値・予約領域等の変更を拒否する。
CRCは署名や敵対的な書き換えへの認証ではない。保存媒体を攻撃者が自由に書き換える脅威モデルは未対応。

承認後にSaveCommittedを先に保存し、それからレポートを書き、最後にSavedを保存する。
途中停止では「必ず完了」と「二度と実行しない」を同時に保証できないため、成否不明は明示して停止する。
今回の書き込み前エラー注入では、SaveCommittedの書き込み失敗後はCompletedが残り、次回は新たな承認が必要になる。
一般のI/O失敗はflush・readback中にも起こりうるため、書き込みの成否を断定せず再起動時に照合する。
有効なSaveCommittedは成否不明として停止し、有効なSavedは再保存せず終了する。破損した記録は拒否する。
今回の中断試験はチェックポイントでの停止、書き込みエラー、破損入力であり、実機電断の保証ではない。
単一job専用ディスクを使い、複数jobの管理、領域回収、予算不足からの自動再計画との統合は今後の工程である。

## モデルを変更しない追加評価

`document_followup_corpus.json`に、従来の20件と異なる8件を、モデル予測を見る前に選んでSHA-256で固定した。
カーネル資料はclient ELF・操作契約・人間の承認・推論メモリ、ホスト資料は国際化・telemetry・GPU core・Tauri配布手順。
各クラス4件で、以前と同じパスや完全一致する内容を拒否する。

`document_followup.py`は元モデルのSHA-256を固定し、学習関数を呼ばない。
語彙64個・重み・bias・0のときだけ棄権する規則・品質目標を変更せずに評価する。
モデルSHA-256は`09399994c34ea7318b132ae63e3a463247974a431098325769f2a27a239ceb79`。
前処理はホスト側、分類はラベルもパスも含まない812-byte packetを受け取るRing 3側で行う。

UbuntuとWindowsの追加評価はどちらも8/8正解、誤分類0・棄権0、候補4件の適合率・再現率は各1.0だった。
固定モデルとpacketの全bytesが一致した。これは同一リポジトリの関連文書による少数評価であり、
話題や文体の独立性、未知分野への精度、棄権の実用性を示すものではない。
言い換えや別プロジェクトへの評価を行うまでは、一般的な資料検索の品質とは扱わない。

## 再現

既存の固定モデルを指定する。出力先は新規ディレクトリにする。

```sh
# Ubuntu、リポジトリroot
python3 experiments/agent_policy_lab/document_followup.py \
  --model experiments/agent_policy_lab/out/document-classifier-ubuntu-20260927/frozen-model.json \
  --output experiments/agent_policy_lab/out/document-followup-new
```

```powershell
# Windows、リポジトリroot。QEMU/firmwareには既存の固定版のパスを指定する。
python native-os/tools/validate_document_agent.py `
  --experiment experiments/agent_policy_lab/out/document-followup-new `
  --journal --output native-os/out/document-workflow-new `
  --qemu <QEMUの絶対パス> --firmware-dir <firmwareの絶対ディレクトリ>

python native-os/tools/document_task.py `
  --request 'こんにちは、カーネル開発の資料を探して。' `
  --experiment experiments/agent_policy_lab/out/document-followup-new `
  --session native-os/out/my-document-task --record-only `
  --qemu <QEMUの絶対パス> --firmware-dir <firmwareの絶対ディレクトリ>
```

同じ引数に`--resume`を追加すると既存jobを照合する。`--record-only`を外すと、Completedの結果に対する保存を提案する。
コンソールの表示を確認し、30秒以内に`approve <表示されたID>`か`deny <表示されたID>`を入力する。
セッションには照合用の`task.json`、検証済みpacketのコピー、`journal.raw`、起動ごとのログを保存する。
別Goal・別入力・別ELFの記録を混ぜない。成否不明の記録は成功にせず、CLIを失敗として終了する。
拒否・期限切れは保存0回で決定済みとなり、結果の状態をログに残す。

統合試験の承認は専用fixtureが送る試験入力であり、実際の利用者が個別操作に同意した証拠ではない。
試験runnerはディスク全32KiBを独立した期待値と照合し、承認の順序・理由、二重実行、資源回収を検査する。
成果物は`out/`以下のGit管理対象外に保存し、実資料の本文やモデルを外部へ送信しない。

## 検証記録

2026-09-27、固定版QEMU 11.1.0、`pc-q35-11.1`、TCG、1 CPU、256MiB、networkなしで検証した。

| 対象 | 結果 |
| --- | --- |
| 新しい文書群 | Ubuntu・Windowsで各8/8正解、誤分類0・棄権0。再学習なし、モデル・packet一致 |
| 独自カーネルでの結果 | 全8件のID・スコア・分類がホスト計算と一致 |
| 正常・不正入力 | 9起動合格。正常分類と8種類の入力拒否 |
| 永続分類記録 | 14起動合格。再利用、識別値・結果等の破損、Started復旧、書き込み失敗 |
| 承認付き保存 | 19起動合格。承認・拒否・不正入力・ID違い・期限切れ・再送、各再起動、保存時I/O失敗 |
| チェックポイントでの中断 | 4種類×初回と再起動＝8起動合格 |
| 日本語の依頼からのCLI | 4起動合格。分類・再利用・試験承認による保存・保存済みの再利用 |
| 資源 | 分類時arena実測1ページ。正常例のpid 0所有フレームは確保時16、解放後15。終了後に全体の空きフレーム基準へ復帰 |
| 単体試験 | Rust 91件、Python研究33件・native tooling67件。PythonはWindows・Ubuntu双方で合格 |

原本文書の大きさは1,237〜11,860bytesだが、ゲスト入力は固定の812bytesへ前処理済み。
このメモリ実測を原文長に比例する汎用LLMの必要メモリとは扱わない。
CPUは1024ticksの上限を維持しており、精密なCPU時間や高速化率は測定していない。

統合記録は`native-os/out/document-workflow-20260927/summary.json`と各`job-*/trials/runs.json`。
前者の15群は、journalなし9起動とjournalあり41起動の計50起動である。
CLIの4起動は`native-os/out/document-workflow-cli-20260927/results.json`、
実セッションのディスクと個別ログは`native-os/out/document-task-20260927/`に保存した。
文書評価は`experiments/agent_policy_lab/out/document-followup-{ubuntu,windows}-20260927/`。

既存の`operator-approve`、`operator-deny`、`infer-approve`、解析式予算の`infer-size-0/11`、
`persist-complete`の6群と、予算不足から再起動する`infer-size-0 / insufficient / retry`も合格した。
回帰記録は`native-os/out/document-workflow-regression-20260927/`。
host/guest/UEFIのClippy、Rustfmt、対象PythonのRuff、差分検査も合格した。
独立した読み取り検証でjournal全41起動のdisk・serial SHA-256と保存済みsectorの実体も照合した。
Ubuntuは検証後に起動前の停止状態へ戻し、WSLの資源設定は変更していない。
