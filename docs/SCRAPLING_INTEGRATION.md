# Scrapling 統合ガイド

この文書は、ElysiaAI に組み込まれている [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) 統合の運用ガイドです。日本語での実装意図、セットアップ、検証方法をまとめています。英語版は [SCRAPLING_INTEGRATION.en.md](./SCRAPLING_INTEGRATION.en.md) を参照してください。

## 確認した upstream

2026-05-03 時点で、Scrapling の PyPI 最新版は `0.4.7` です。ElysiaAI の `requirements.txt` と `pyproject.toml` も `0.4.7` 系に合わせています。

本家ドキュメントは次の構成です。

- `README.md`: 英語の概要
- `docs/README_JP.md`: 日本語の概要
- `docs/fetching/`, `docs/parsing/`, `docs/spiders/`, `docs/cli/`, `docs/ai/`, `docs/api-reference/`: 英語の詳細ドキュメント
- ReadTheDocs: <https://scrapling.readthedocs.io/en/latest/>

ElysiaAI では、本家の詳細ドキュメントを丸ごと複製せず、ElysiaAI の Web 検索・ページ抽出に必要な使い方だけをこの文書に整理します。

## ElysiaAI での役割

Scrapling は、検索結果ページや参照 URL から読みやすい本文を抽出するために使います。Bun/Elysia 側から Python ブリッジを呼び出し、Python 側で Scrapling の `Selector` と必要に応じた fetcher を利用します。

主なファイルは次の通りです。

- `packages/server/src/lib/web-search.ts`: Web 検索結果から URL を選び、本文抽出を呼び出します。
- `packages/server/src/lib/scrapling-client.ts`: Bun から Python ブリッジを安全に起動します。
- `python/lib/scrapling_bridge.py`: Scrapling による HTML 解析、任意の fetcher、stdlib フォールバックを提供します。

## セットアップ

通常の本文抽出だけなら、標準の Python 依存を入れれば動作します。

```bash
python -m pip install -r requirements.txt
```

ブラウザ実行、ステルス fetch、Cloudflare などの強い bot 対策があるページを扱う場合は、Scrapling の fetcher 追加依存とブラウザを入れます。

```bash
python -m pip install "scrapling[fetchers]==0.4.7"
scrapling install
```

Python 実行ファイルを明示したい場合は、Bun 側で `ELYSIA_PYTHON` を設定します。

```powershell
$env:ELYSIA_PYTHON = "C:\Path\To\python.exe"
```

## 抽出モード

| モード | 用途 | 追加依存 |
| --- | --- | --- |
| `httpx` | 既定。軽量で安定した通常取得 | 不要 |
| `fetcher` | Scrapling の HTTP fetcher。ブラウザ風の取得を使いたい場合 | `scrapling[fetchers]` |
| `dynamic` | JavaScript 実行が必要なページ | `scrapling[fetchers]` と `scrapling install` |
| `stealth` | bot 対策が強いページの調査 | `scrapling[fetchers]` と `scrapling install` |

本文形式は `text`, `markdown`, `html` から選べます。AI に渡す要約素材には `text` または `markdown` を推奨します。`--ai-targeted` を付けると `main`, `article`, `[role="main"]`, `body` の順に主要コンテンツを優先します。

## CLI での検証

ローカル HTML を使った最小検証です。

```bash
python python/lib/scrapling_bridge.py \
  --html-file scratch/example.html \
  https://example.test \
  --max-chars 1000
```

URL を直接取得する場合です。

```bash
python python/lib/scrapling_bridge.py https://example.com --mode httpx --max-chars 1000
```

Scrapling fetcher を使う場合です。

```bash
python python/lib/scrapling_bridge.py https://example.com --mode fetcher --max-chars 1000
```

Markdown で抽出する場合です。

```bash
python python/lib/scrapling_bridge.py https://example.com --extraction-type markdown --ai-targeted
```

## Bun 側からの利用

`extractPageWithScrapling()` は URL を検証してから Python ブリッジを起動します。失敗した場合は `null` を返すため、Web 検索側は既存 snippet に自然にフォールバックできます。

```typescript
const extracted = await extractPageWithScrapling(result.url, {
  maxChars: 1200,
  timeoutMs: 15000,
  mode: "httpx",
  aiTargeted: true,
  extractionType: "text",
});
```

## セキュリティと運用方針

- `http` と `https` 以外の URL は受け付けません。
- 取得に失敗した場合は例外を UI に漏らさず、既存の検索結果へフォールバックします。
- `stealth` は公開情報の取得補助に限定し、認証回避、課金回避、利用規約違反の目的では使いません。
- 外部サイトへ連続アクセスする処理では、対象サイトの規約、robots.txt、レート制限を尊重してください。
- AI に渡す本文は必要最小限にし、`--ai-targeted` と `maxChars` でトークン量を抑えます。

## 検証コマンド

変更後は次を実行してください。

```bash
python -m pytest tests/python/test_scrapling_bridge.py tests/python/test_scrapling_advanced.py -q
python -m ruff check python/lib/scrapling_bridge.py tests/python/test_scrapling_bridge.py tests/python/test_scrapling_advanced.py
bunx tsc --noEmit --pretty false
bun run security:glassworm -- --ci
```

期待される状態は、Python テストが成功し、TypeScript 型チェックに新規エラーがなく、GlassWorm スキャンで blocking finding が出ないことです。
