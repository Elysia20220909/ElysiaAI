# ElysiaAI // INFINITE RESONANCE

自分のデータと判断を、自分の手元に。

ElysiaAI は、カーネルから設計する独自の AI-Native OS を目指す長期開発プロジェクトです。
AI が扱う記憶、道具、権限を OS の設計に組み込み、人が実行を理解し、制御できる環境を目指します。
現在は、QEMU 上で起動・メモリ保護・ユーザープロセスの隔離を検証する初期カーネルを開発しています。

[English](README.en.md) · [日本語の入口](README.ja.md) ·
[行動規範](.github/CODE_OF_CONDUCT.md) · [開発への参加](CONTRIBUTING.md) ·
[ライセンス](LICENSE) · [セキュリティ](SECURITY.md)

## 現在地

この開発系統には、独自 OS と、既存 OS 上で動く AI アプリケーションが共存しています。
既存アプリの Python サービスを指す「AI Kernel」と、`native-os/` の独自カーネルは別のものです。
既存アプリが独自カーネル上で動作する段階には達していません。

| 対象 | 確認できていること | まだできないこと |
| --- | --- | --- |
| M1：起動 | UEFI から独自の x86-64 Rust カーネルへ制御を渡し、起動・故障をログで判別 | 実機起動、Secure Boot 対応 |
| M2a：メモリ管理 | 物理ページの割り当て・解放、独自ページテーブルへの切替、書込み禁止・実行禁止の故障検出 | 稼働中の任意のマッピング変更 |
| M2b：ユーザー空間 | Ring 3 の 2 プロセス、ログ・yield・exit、協調切替、違反したプロセスの停止と残りの継続 | 任意のアプリのロード |
| M2c：資源回収・実行制御 | 終了・故障・tick 上限で所有フレームを回収。タイマーで無限ループを中断し、別プロセスを継続。64 世代の再生成 | 厳密な CPU 時間課金、マルチコア、一般的なプロセス作成 API |
| M3a：通信と権限 | 最大 64 bytes・各方向 2 件の IPC、所有者・操作権限・世代の検査、待機と起床、失効・相手終了時の回収 | 権限の委譲・派生、任意の通信先 |
| M3b：RAM 資料サービス | 固定の資料を IPC で読み取り。送信者に結び付いた権限、範囲・失効検査、終了時の要求・権限回収 | ファイルシステム、ホスト資料の読み込み、権限委譲 |
| M3c：サービス復旧 | サービスだけを回収・再起動し、クライアントが新しい権限で再接続。8 回の反復と確保失敗の回収を検証 | 任意サービス管理、永続状態の復旧、再試行の待ち時間制御 |
| 既存 AI アプリ | Bun / Elysia.js、Python / FastAPI、Tauri を使うホスト OS 上の開発基盤 | 独自 OS への移植、独自カーネル上での AI 推論 |

M3c では、資料サービスの故障・終了・CPU 予算超過からの復旧を追加しました。
クライアントを残してサービスだけを作り直し、新しい権限で資料の読み取りを再開します。
対象は Windows が動く x86-64 / UEFI PC を想定し、まず Windows 上の QEMU で検証します。
ユーザー側の同期例外はそのプロセスを停止し、正常なプロセスを継続します。
カーネル側の故障は停止します。固定した 2 プロセスの試験であり、一般的な OS の完成ではありません。

2026-09-13 の検証記録では、指定した Windows / Rust / QEMU / UEFI の組み合わせで
39 ケースの起動・故障・資源回収・IPC・資料サービス・復旧試験に合格しています。条件と実測結果は
[M1 起動検証](docs/native-os/BOOT_VALIDATION.md) と
[M2a メモリ検証](docs/native-os/MEMORY_VALIDATION.md)、
[M2b ユーザー空間の検証](docs/native-os/USERSPACE_VALIDATION.md)、
[M2c 資源回収と実行制御](docs/native-os/LIFECYCLE_VALIDATION.md)、
[M3a 通信と権限](docs/native-os/IPC_VALIDATION.md)、
[M3b RAM 資料サービス](docs/native-os/DOCUMENT_SERVICE_VALIDATION.md)、
[M3c サービス復旧](docs/native-os/SERVICE_RECOVERY_VALIDATION.md) を参照してください。
新規マシンでの環境構築全体、実機、日常利用できる OS としての安定性は未検証です。

この文書は M3c を含む開発ブランチの内容を説明します。
設計・M1・M2a は [PR #109](https://github.com/Elysia20220909/ElysiaAI/pull/109)、
[PR #110](https://github.com/Elysia20220909/ElysiaAI/pull/110)、
[PR #111](https://github.com/Elysia20220909/ElysiaAI/pull/111) の順に積み重ねています。
M2b は文書整備の [PR #112](https://github.com/Elysia20220909/ElysiaAI/pull/112) の先に追加しています。
M2c は [PR #113](https://github.com/Elysia20220909/ElysiaAI/pull/113) の M2b を基にしています。
M3a は [PR #114](https://github.com/Elysia20220909/ElysiaAI/pull/114) の M2c を基にしています。
M3b は [PR #115](https://github.com/Elysia20220909/ElysiaAI/pull/115) の M3a を基にしています。
M3c は [PR #116](https://github.com/Elysia20220909/ElysiaAI/pull/116) をマージした開発ブランチを基にしています。
既定ブランチへの採用状況は各 PR で確認してください。

## 独自 OS を読む・試す

[設計の入口](docs/native-os/README.md)、[アーキテクチャ](docs/native-os/ARCHITECTURE.md)、
[マイルストーン](docs/native-os/MILESTONES.md) から、実装と次の課題を追えます。
実装は [native-os/](native-os/README.md) にあります。既存アプリとは独立した Rust workspace です。
試験ツールには Python を使います。

ビルド前に [依存関係と取得手順](native-os/DEPENDENCIES.md) を確認し、
`native-os/` を含む開発ブランチをチェックアウトしてください。
取得したソース・依存関係・スクリプトを確認してから、記載された版のツールを用意します。
環境の準備後、リポジトリのルートで実行します。

```powershell
cargo +stable test --manifest-path native-os/Cargo.toml -p elysia-boot-protocol -p elysia-memory -p elysia-kernel --lib --locked
python -m unittest discover -s native-os/tools -p 'test_*.py' -v
python native-os/tools/boot_test.py --case all
```

起動試験はカーネルをビルドし、画面・ゲスト NIC を無効にした QEMU で実行します。
結果は `native-os/out/` に保存されます。ツールの版、ターゲットの導入、静的解析、
各ケースの期待値は [実装側の手順](native-os/README.md) を正とします。

## 既存 AI アプリを開発する

既存アプリは、対話・記憶・ツール実行の体験をホスト OS 上で試すための開発基盤です。
その動作確認と独自 OS の起動試験は別に行います。
[Beta 0.1 テスターガイド](docs/BETA_0_1_TESTER_GUIDE.md) と
[開発への参加](CONTRIBUTING.md) を確認してください。
Bun / Python などを用意して依存関係とセットアップ処理を確認した後、ルートで実行します。

```powershell
bun scripts/manage.ts setup
bun scripts/manage.ts setup-python
bun scripts/manage.ts dev
```

`setup` は Bun の依存関係と Prisma クライアントを準備し、`.env` がなければ例から作成します。
`setup-python` は `.venv` を準備して Python の依存関係を導入します。
既存の設定や作業中の変更を確認してから実行してください。

ローカル処理を重視しますが、外部 API、モデル取得、連携先への通信は設定と利用機能に依存します。
「データが必ず端末外へ出ない」という保証ではありません。
接続先・権限・保存するデータは [セキュリティ方針](SECURITY.md) に沿って確認します。

## リポジトリの案内

| 場所 | 内容 |
| --- | --- |
| [docs/native-os/](docs/native-os/README.md) | 独自 OS の設計、段階計画、検証記録 |
| [native-os/](native-os/README.md) | UEFI ローダー、カーネル、メモリ管理、起動試験 |
| `packages/server/src/` / `src/` / `public/` | 既存アプリのサーバー・共有コード・画面 |
| `python/` | 既存アプリの AI サービス |
| `src-tauri/` | 既存 OS 向けデスクトップアプリ |
| `docs/` | 既存機能の運用・開発資料 |

既存機能の資料には、その機能固有の設計や過去の検証記録を含みます。
独自 OS の実装状況は `docs/native-os/` と対応するコード・試験結果で判断してください。

## 参加・報告・ライセンス

コード、文書、試験、設計レビューの参加手順は [CONTRIBUTING.md](CONTRIBUTING.md) にまとめています。
参加時は [行動規範](.github/CODE_OF_CONDUCT.md) を守り、脆弱性や秘密情報の漏えいは
通常の不具合報告に詳細を載せず、[SECURITY.md](SECURITY.md) の手順で相談してください。

ElysiaAI のライセンスは **MIT OR Apache-2.0** です。いずれかを選んで利用できます。
[LICENSE](LICENSE)、[MIT 全文](LICENSE-MIT)、[Apache-2.0 全文](LICENSE-APACHE) を参照してください。
依存ライブラリや第三者の素材には、それぞれのライセンスが適用されます。
