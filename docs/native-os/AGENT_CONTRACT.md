# Agent 契約の最小実装

この文書は、AI-Native OS の Agent 層を、既存の決定論的な authority kernel の上に置くための境界を記録します。

## 役割

`native-os/kernel/src/agent.rs` には、次の三つの契約があります。

- `AgentManifest`: 信頼済みの Agent identity、goal digest、context、authority、tool、資源上限、承認・復旧方針。
- `AgentProposal`: Agent が要求する変更案。これは権限ではありません。
- `PolicyDecision`: カーネルが返す `Allow`、`Deny`、`NeedsApproval`。

AI は `AgentProposal` を返せますが、`AgentManifest` を作成・拡張できません。カーネルは proposal を manifest と ceiling に照合し、context、authority、tool、memory、CPU、network、goal、policy のいずれかが上限を超えた時点で拒否します。

状態変更を伴う proposal は、manifest が `RequiredForMutation` の場合、検査に合格しても `NeedsApproval` になります。`Always` は読み取りにも承認を要求します。承認は別の operator / approval 契約で記録し、proposal 自身を承認情報として扱いません。`decide` は最初に manifest 自体を ceiling に照合し、その後で proposal を Agent 固有の manifest に照合します。縮小した予算や権限を、全体の ceiling まで戻すことはできません。

## 資源

資源要求の型には、メモリページ、CPU ticks、ネットワーク bytes、storage bytes があります。今回の kernel 契約では、実装済みの資源は CPU と memory だけです。非ゼロの network / storage 要求は `UnsupportedResource` として拒否します。CPU と memory の比較だけを通過して未対応の I/O を許可することはありません。

`Gpu`、`Npu`、`Fpga`、`CxlMemory`、`Qpu` は `ResourceKind` に予約していますが、ドライバ、隔離、回収、スケジューラが未実装のため `resource_supported` は `false` を返します。型を先に公開しても、未知の資源を暗黙に許可しないことを優先します。

推論上限は既存の `INFERENCE_BOOT` と揃え、最大 16 ページ、1024 ticks、ネットワーク 0 bytes です。Agent の予算は既存の process / launch の上限を置き換えず、上位の要求としてさらに制限します。

## 復旧

`RecoveryPolicy::RestartWithManifest` は、故障後に以前の manifest を再利用することを示します。復旧時に goal、authority、context、tool、資源上限を変更する API はありません。実際の再起動・フレーム回収は既存の `recovery` と `launch` が担当し、この型はその入力契約を表します。

## 実際のプロセスへの接続

推論の起動モード 56〜72 は、カーネル内の固定定義 `READ_AGENT` を検査して `ReadAgent` を作り、PID 0 の独立した Ring 3 ELF に結び付けます。ユーザー側の IPC から manifest を作成・差し替えする API はありません。汎用の動的プロセス生成ではありません。

`ReadAgent::launch` は、既存の `launch::Definition` に arena ページ上限と CPU ticks を渡します。context / authority / tools のいずれかから資料読み取りを除外すると、資料の grant 自体を発行しません。総所有フレームの上限は既存の32枚を維持します。memory_pages は推論 arena の上限であり、ページテーブルやスタックを含む全メモリの上限ではありません。

資料サービスは、起動定義と一致する Agent だけを受け付けます。要求元は IPC の実際の送信元、資料は現在の grant から取得します。通常の読み取り命令による承認迂回は拒否し、提案・承認済み実行・中断だけを既存の操作管理へ渡します。Agent が申告する `mutates_state` は、この実行境界の承認判定に使いません。

`READ_AGENT` は資料0を読み取る固定の仕事、承認は `Always`、故障後は `ReclaimAll` です。`goal_digest` の値はこの段階では32-byteの固定識別子であり、自然言語から計算した暗号学的ハッシュではありません。自然言語やモデル出力を認証する値として使えません。

## 一回限りの実行と永続記録

既存の `operations::Manager` が対象 grant、offset、length、予算、期限を含む Plan 全体を承認と結び付けます。承認前、変更された Plan、消費済み承認での実行を拒否します。永続 checkpoint は Proposed / Approved / Running / Completed 等の遷移を、既存の専用試験ディスクへ記録します。Running の記録後に処理結果が失われた場合は Unknown とし、自動で再実行しません。保証するのは最大一回の実行であり、故障時にも必ず一回成功するという意味ではありません。

今回 journal の形式は変更していません。記録には操作IDとcaller/executorが含まれますが、Agent ID、goal識別子、起動・回収イベントの独立した永続レコードはまだありません。起動時の Agent binding は serial 診断で確認します。再起動時は既存 journal の結果分類を行い、権限を復元せず終了します。

## 現在の範囲

実行するのは既存の小さな整数分類器と合成入力です。LLM、自然言語からの Goal 変換、RAG、Windowsの個人データ、GPU/NPU/CXL/QPU の実制御は含みません。Agent 自体の自動再起動も未実装です。`RestartWithManifest` は将来用の契約で、今回の実行経路では選択できません。

QEMU で確認する故障時の動作は Agent の停止、arena・ページテーブル・通信・資料権限の回収、相手プロセスの継続と終了です。既存の資料サービス再起動試験は回帰検証として実施し、Agent の再起動成功とは扱いません。

## 検証記録

2026-09-24、Windows ホスト、Rust 1.96.0、既存の QEMU 11.1.0 / q35 / TCG / 1 CPU / 256 MiB で検証しました。

| 検証 | 結果 |
| --- | --- |
| Rust の kernel / memory / boot-protocol / inference-client の lib 試験 | 79件合格。kernel は58件 |
| Python の QEMU 判定器試験 | 46件合格。binding の欠落・改変・重複・遅延を拒否する試験を追加 |
| QEMU | 下記10ケース合格 |
| 静的解析 | ホスト kernel lib/tests と x86_64-unknown-none kernel bin の Clippy（警告をエラー化）、Rustfmt、変更した Python の Ruff、git diff --check が合格 |
| 秘密情報検査 | Gitleaks で kernel/src と tools を検査し検出なし。docs は設定により走査0 bytesで、この結果を文書の検査済み根拠にはしない |

実行した QEMU ケースは `infer-approve`、`infer-short`、`infer-deny`、`infer-replay`、`infer-timeout`、`infer-fault`、`infer-mem-budget`、`infer-mem-release`、`operation-complete`、`recovery-repeat` です。全90ケースの再試験はしていません。

承認系の推論5ケースは、専用の journal を同じ仮想マシン構成で読み直し、結果分類と権限を復元しないことも確認します。承認は試験プログラムがシリアル入力へ送るもので、今回、人が入力する対話試験は実施していません。

ignored の `native-os/out/agent-runtime-results.json` に10ケースの結果とソース・バイナリ・ツールのハッシュ、各ケースのディレクトリに serial ログと専用ディスクを保存しました。各ケースは次のコマンドで再実行できます。

```powershell
python native-os/tools/boot_test.py --case infer-replay --qemu <qemu-system-x86_64.exe> --firmware-dir <share>
cargo +stable test --manifest-path native-os/Cargo.toml -p elysia-kernel -p elysia-memory -p elysia-boot-protocol -p elysia-inference-client --lib --locked
python -m unittest discover -s native-os/tools -p 'test_*.py'
```
