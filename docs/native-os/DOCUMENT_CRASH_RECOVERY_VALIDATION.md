# 文書Agentの強制停止・復旧と権限の寿命

## 今回の保証範囲

対象は固定の文書分類Agentと、専用の試験ディスクへ保存する1件のレポートである。
`document_crash_test.py` はカーネルの境界待機を確認して、自分で起動したQEMU子プロセスを強制終了する。
カーネルの正常終了やタイムアウトを、強制停止成功として扱わない。

停止点は書込み・FLUSH・読戻し検査を終えた境界に置く。
ゲストは割込みを無効にして待機するため、ホストがログを検出するまで次の操作へ進まない。
通常の `record` / `publish` ではこの待機へ入らず、`crash-*` を明示した試験ビルドだけで有効になる。

| 試験モード | 強制停止点 | 再起動後の結果 |
| --- | --- | --- |
| `crash-start` | Startedの永続化後、Agent起動前 | `classification-unknown`。再分類しない |
| `crash-complete` | Completedの永続化後 | `already-completed`。記録済み結果を返し、再分類しない |
| `crash-save` | 承認後、SaveCommittedの永続化後、レポート保存前 | `save-unknown`。保存しない |
| `crash-report` | レポート保存後、Savedの記録前 | `save-unknown`。レポートが存在しても再保存しない |
| `crash-saved` | Savedの永続化後 | `already-saved`。再保存しない |

各試験は新規ディスクを1回だけ初期化する。強制停止後の媒体はホストで再生成・修復せず、
同じ媒体で2回再起動する。独立した期待値との全ディスク比較、前後のSHA-256、
復旧ログ、文書書込み関数への進入記録を検査する。同じ内容の再書込み試行も失敗となる。
旧承認と同じ文字列を再起動時に入力しても、これらの終了済み・不明状態で処理を再開してはならない。
これは承認nonceの暗号的な再送防止の証明ではなく、対象状態の復旧経路の検査である。

Completedから保存へ進むときは通常の `publish` 経路で新しい承認判断を要求する。
その経路は既存の `validate_document_goal_bridge.py` により、分類済み結果の再利用、
承認後の保存、保存済みの再開、拒否後の再開を別途検査する。
試験ツールによる承認入力は固定データに対するfixtureであり、人間の個別承認の証拠ではない。

## 権限失効の仕様

| 寿命・境界 | 現在の意味 | 保証しないこと |
| --- | --- | --- |
| プロセス終了・サービス故障 | 所有するgrantや保留要求を回収する。サービス再生成後、旧トークンは照合で拒否する | 元ポリシーに基づく新しいgrantの発行禁止 |
| 同一起動中のサービス再起動 | Serviceがメモリに保持する起動定義と一致する定義だけを使う。縮小した定義をBOOTへ戻す拡張も拒否する | 起動定義と独立した恒久的な失効台帳 |
| OS全体の再起動 | 信頼した起動ポリシーを検証して権限を構成する。文書journalから実行権限や承認を復元しない | 実行中の失効の永続化、起動をまたぐトークンの一意性・再送耐性 |

「旧トークンが無効」と「同じ資料への新しい権限も発行禁止」は別の条件である。
現在の実装は前者と起動定義の上限維持を扱う。恒久失効は今回追加していない。
将来追加する場合は、失効状態の永続化、再発行前の照合、状態不明時の拒否、
媒体の巻戻し対策、明示的な再許可の手順を別仕様として定義する必要がある。

Agentの提案は起動ポリシーや失効を上書きしない。
`AgentProposal::decide` の契約照合、`Service::start_defined` の定義照合、
`replacement_defined` の段階的再構築が、それぞれの境界を担う。
旧ハンドルの拒否・縮小権限の維持はRust単体試験の対象であり、
文書AgentのQEMU試験だけで一般のcapability機構全体を証明したとは扱わない。

## 再現方法

既存の固定版QEMU・firmwareと、評価済み文書bundleを指定する。ネットワークとGUIは使わない。
同じcheckoutのビルド出力を共有するため、他のビルド・QEMU試験と同時実行しない。

```powershell
$modes = 'crash-start', 'crash-complete', 'crash-save', 'crash-report', 'crash-saved'
foreach ($mode in $modes) {
    python native-os/tools/boot_test.py --case agent-document-classify `
        --document-bundle PATH_TO_VALIDATED_BUNDLE `
        --document-job $mode --qemu PATH_TO_QEMU --firmware-dir PATH_TO_FIRMWARE
    if ($LASTEXITCODE -ne 0) { throw "Failed: $mode" }
}
```

各試験の新規ディレクトリは `native-os/out/agent-document-classify/crash-*/`。
`runs.json` に子PID、終了コード、境界でのkill有無、タイムアウト、承認fixture入力、
ログと媒体のSHA-256を記録する。`kill.raw` と再起動後のスナップショットも保持する。
PIDやログだけで実行成功を判定せず、3回すべての検査が通った場合だけ `passed: true` にする。

## 限界

この試験はQEMUプロセスの強制終了であり、Windowsホストの電源断ではない。
FLUSH後の指定境界を検査しており、書込み途中の任意時点での停止、セクタの部分書込み、
ホストのキャッシュ喪失、実ストレージの耐久性、媒体改ざん・巻戻しは保証しない。
成否不明状態は自動再試行せず停止するため、作業を必ず完了させる保証もない。
外部API・Windows実ファイル・ネットワーク送信のexactly-onceや形式証明は対象外である。

## 2026-09-27の実行結果

| 確認 | 結果 |
| --- | --- |
| 最終の強制停止試験 | 5ケースすべて合格。5回の強制終了と10回の再起動、計15起動 |
| 強制停止後の媒体 | 全ケースで独立した期待値と一致。各2回の再起動前後でも変更なし |
| 再起動時の動作 | 再分類・承認プロンプト・文書書込み試行なし。古い承認入力でも再開なし |
| 通常経路の回帰 | `validate_document_goal_bridge.py` の8起動・17チェック合格 |
| Rust単体試験 | `cargo +stable test -p elysia-kernel --lib --offline`：67件合格 |
| Python単体試験 | native-os/tools の87件合格。うち新規3件は誤った停止成功判定、再書込み試行、子プロセス制御を検査 |
| 静的検査 | 変更対象PythonのRuff check/format、Rustのrustfmt、git diff --check 合格 |

Windows上のQEMU 11.1.0、pc-q35-11.1、TCG、1 CPU、256 MiB、networkなしで実行した。
最初の15起動で動作確認後、記録するログSHA-256を改行正規化前のファイル内容へ修正し、
5ケース15起動を再実行した。通常回帰8起動を含め、この作業では計38回QEMUを起動した。
最終記録のログ・媒体ハッシュも実ファイルと再照合した。

集約記録は `native-os/out/crash-recovery-20260927/verification-summary.json`。
同ディレクトリにコマンド出力・回帰結果・変更前の対象ファイルを保存した。
ソースの作業前ハッシュと照合し、既存ファイルの変更はbuild.rs、document_runtime.rs、
journal_disk.rs、document_job_test.pyの4件に限定され、その他の既存作業が維持されていることを確認した。
新規ファイルは強制停止runner、その単体試験、本書の3件。commit・pushは実施していない。
