# Kubernetes Backup and Recovery Strategy

## 要約

このメモは、ElysiaAIをKubernetes上で運用する場合のバックアップと復旧の考え方です。

Beta 0.1の主戦場はローカルPCとTauri配布ですが、将来ホームサーバーや小規模クラスタへ移すなら、復旧手順は先に紙へ落としておく価値があります。壊れた時に初めて考えるのでは遅いからです。

## 方針

- GitにあるものはGitから戻す
- DBとPVにあるものはスナップショットとバックアップから戻す
- Secretはバックアップ対象に含めても、復旧時の復号権限を最小にする
- RTOとRPOを先に決め、ツール選定を後にする
- 復旧演習を月1回行い、机上のRunbookで終わらせない

## 推奨構成

### コントロールプレーン

- Terraformまたは手順化されたクラスタ作成
- HelmまたはKustomizeによるElysiaAI関連リソースの再適用
- GitHub Actionsからの手動復旧ワークフロー

### バックアップ

- VeleroでKubernetesリソースをバックアップする
- CSI snapshotが使えるPVはVolumeSnapshotを使う
- snapshotが使えないPVはVelero File System Backupを使う
- node-agentはKopiaを基本に考え、Resticは非推奨状況を確認してから使う
- バックアップ先はS3互換ストレージ、NAS、またはクラウドオブジェクトストレージにする

### ElysiaAIで守る対象

- Prisma DB
- PostgreSQLまたはSQLiteの永続ボリューム
- Redis永続化を使う場合のAOF/RDB
- Milvus Liteまたはベクトルストアのデータ
- KnowledgeSource / DocumentChunk
- Project Memory
- Artifact revision
- Privacy Ledger / ActionLog
- Tauri配布成果物とchecksum

## RTO / RPOの目安

| 対象 | RTO目安 | RPO目安 | 復旧方法 |
| --- | ---: | ---: | --- |
| 静的UI / API | 30分 | Git管理 | 再デプロイ |
| Project Memory / Artifact | 4時間 | 1時間以内 | DB/PV復元 |
| Knowledge chunks | 8時間 | 24時間以内 | 再索引可 |
| Privacy Ledger | 4時間 | 15分以内 | DB/PV復元 |
| Tauri配布物 | 2時間 | リリース単位 | Release artifact復元 |

## バックアップスケジュール

- 毎時: DBスナップショット
- 毎日: Kubernetesリソース全体
- 毎日: PVバックアップ
- 毎週: 復旧演習用のリストア検証
- リリース直前: 手動スナップショット
- リリース直後: 変更済みリソースのバックアップ

## 復旧パイプライン

- 復旧対象のnamespaceを決める
- Terraformまたはクラスタ作成手順で土台を戻す
- VeleroでnamespaceとKubernetesリソースを戻す
- PVまたはVolumeSnapshotを戻す
- Secretを復号し、最小範囲で再投入する
- ElysiaAIのhealthを確認する
- RAG再索引を小さな文書から再開する
- Privacy LedgerとActionLogの連続性を確認する
- `docs/EMERGENCY_ROLLBACK_RUNBOOK.md` に沿って外部連携を段階的に戻す

## GitHub Actions手動復旧の考え方

復旧ワークフローは自動発火させず、`workflow_dispatch` だけにします。

入力例:

- target environment
- namespace
- backup name
- snapshot id
- dry run
- approver

守ること:

- `pull_request` では絶対に復旧ジョブを動かさない
- self-hosted runnerは信頼済みworkflowだけで使う
- Secret、署名鍵、DB認証情報をログに出さない
- dry runで対象リソースを出し、本実行は人間承認後にする

## Velero運用チェックリスト

- [ ] Veleroのバックアップ先にアクセスできる
- [ ] namespace単位で復元できる
- [ ] PV snapshotが取れている
- [ ] snapshot不可PVのFile System Backup方針が決まっている
- [ ] Secret復旧の手順が分離されている
- [ ] リストア後にPrisma migration状態を確認できる
- [ ] RAG再索引手順がある
- [ ] Privacy Ledgerの連続性を確認できる
- [ ] 月1回の復旧演習を実施している

## 参考

- Velero: https://velero.io/
- Velero File System Backup: https://velero.io/docs/v1.18/file-system-backup/
- OpenTelemetry / Observability: `docs/OBSERVABILITY_QUICKSTART_2026.md`
- ElysiaAI emergency rollback: `docs/EMERGENCY_ROLLBACK_RUNBOOK.md`
