# AI Coding Cost and Context Policy

## 要約

この文書は、ElysiaAI で AI コーディングを行うときの費用とコンテキスト管理の運用方針です。

- 節約の中心は、安いモデルを探すことではなく、不要な文脈を送らないことです。
- repo-wide context は既定で使わず、まず `rg` と `docs/INDEX.md` で対象を絞ります。
- 価格表やベンチマークは固定せず、実ログで検証します。
- ElysiaAI の local-first 方針を守り、費用削減のためだけに新しい cloud call は追加しません。

## 基本方針

AI に考えさせる前に、何を読ませるかを設計します。

- 既定ではリポジトリ全体を読ませません。
- まず `rg`、`rg --files`、または `docs/INDEX.md` で必要な範囲を探します。
- 変更対象が見えたら、関係するファイル、型、テスト、設定だけを読むようにします。
- 大きな tool output は、そのまま次のターンへ流さず、要点を短く圧縮します。
- 長い作業では、途中で「確認済みの事実」「触ったファイル」「未決事項」をまとめます。

通常読み込まない場所:

- `.Codex/completions/**`
- `.Codex/sessions/**`
- `docs/archive/**`
- ログ、アップロード、キャッシュ、生成済み削除結果

この方針は、古くからの良い開発作法と同じです。

- まず測る。
- まず絞る。
- まず小さく直す。
- それから必要なところへ深く入る。

## コンテキスト予算

作業の大きさごとに、目安となる context budget を置きます。これは厳密な上限ではなく、無駄な読み込みに気づくための目盛りです。

| Task type | Context budget |
| --- | --- |
| trivial edit | 2k-8k tokens |
| single-file bug or docs update | 8k-20k tokens |
| multi-layer feature | 20k-50k tokens |
| architecture or security review | 20k-100k tokens |
| repo-wide review | Only with explicit approval |

予算を超えそうな場合は、先に範囲を絞ります。

- 関係する route、lib、shared type、test を `rg` で特定します。
- `docs/INDEX.md` から必要な設計文書だけを開きます。
- startup context 用の `.Codex` ファイルを増やす前に、`docs/` に置けないか確認します。
- 何度も使う安定した前提は、短い要約として再利用します。

## モデルルーティング方針

モデルは呼び出し単価ではなく、失敗したときの損害で選びます。

| Tier | Use for |
| --- | --- |
| Premium | architecture, security, auth, crypto, migration, incident analysis |
| Workhorse | implementation, debugging, refactor, code review, test generation |
| Utility | lint, format, typo, rename, small YAML/JSON edits |
| Local | boilerplate, stub generation, autocomplete, simple syntax fixes |

判断基準:

- 失敗すると設計を戻す必要がある作業は Premium に寄せます。
- 日常の実装、debug、review は Workhorse を中心にします。
- すぐ直せる軽作業は Utility に寄せます。
- 雛形や補完は Local を優先します。

特定のモデル名や価格は、この文書では固定しません。

- 公式価格は変わります。
- ベンチマークは prompt、context、streaming、thinking mode、retry 回数で変わります。
- 外部記事の YAML は、そのまま貼れる共通設定ではなく、方針例として扱います。

## 計測項目

モデルやワークフローを変える前に、まず 1 週間だけ測ります。

最低限、次を記録します。

```text
timestamp
tool
task_type
model
input_tokens
output_tokens
cache_write_tokens
cache_read_tokens
reasoning_or_thinking_tokens
tool_call_count
elapsed_seconds
estimated_cost_usd
test_result
human_retry_required
```

見るべき指標:

- どの task type が一番高いか。
- tool call loop が何回回っているか。
- cache hit が本当に出ているか。
- premium model が軽作業に使われていないか。
- 安いモデルの retry が増えて、結果的に高くなっていないか。

## ElysiaAI での実務ルール

ElysiaAI は local-first の実験場です。費用削減のための運用も、この思想を崩さない形で行います。

- OpenAI、Anthropic、Kimi などの cloud model を新しく呼ぶ実装は、明示依頼がある場合だけ追加します。
- Bun / Elysia、FastAPI、Prisma、Tauri の既存境界を尊重します。
- `.Codex/` は起動時に読む小さな記憶として保ち、長い説明は `docs/` に置きます。
- `docs/archive/**` は歴史資料として扱い、通常の AI context には含めません。
- コード変更後は、変更範囲に応じて最小の quality gate を走らせます。

推奨プロンプト方針:

```text
Do not inspect the whole repository by default.
First identify the minimal files and symbols needed.
Use ripgrep/search before reading files.
When tool output is large, summarize it before continuing.
Ask for missing files only when necessary.
```

この文書の目的は、AI を小さく使うことではありません。

- 大事な判断には、十分な文脈と強いモデルを使います。
- 小さな作業には、小さな文脈と軽いモデルを使います。
- 文脈を粗末にせず、必要なところへ丁寧に灯りを当てます。
