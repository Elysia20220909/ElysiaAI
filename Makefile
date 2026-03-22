# 🌸 ElysiaAI Magic Spells (Makefile)
# よく使う呪文（コマンド）を短くまとめた魔導書です。

.PHONY: help up down dev os lint format setup clean

help:
	@echo "🌸 ElysiaAI コマンド一覧 🌸"
	@echo "  make up      - 魔法陣を展開する (Docker Compose で全サービス起動)"
	@echo "  make down    - 魔法陣を閉じる (Docker Compose 停止)"
	@echo "  make dev     - 開発サーバーを起動する (Hot Reload)"
	@echo "  make os      - ElysiaAI と直接お話しする (Python Boot CLI)"
	@echo "  make lint    - コードの乱れを整える (Bun & Python)"
	@echo "  make format  - コードを美しく自動整形する"
	@echo "  make setup   - 開発環境を準備する (初期化)"
	@echo "  make clean   - 余分なものを浄化する"

# インフラの起動・停止
up:
	docker-compose -f config/docker/docker-compose.yml up -d

down:
	docker-compose -f config/docker/docker-compose.yml down

# 開発用
dev:
	bun run dev

os:
	python src/🌟boot.py

# コードをきれいに保つ
lint:
	bun run lint
	ruff check .

format:
	bun run format
	black .

# セットアップとクリーンナップ
setup:
	bun install
	bun run prepare
	python -m pip install -r requirements.txt

clean:
	bun run clean
