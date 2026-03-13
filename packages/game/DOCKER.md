# Docker Multi-Architecture Build Guide

## Quick Start

### ゲームサーバーのビルド

```bash
# シングルアーキテクチャ（現在のプラットフォーム）
cd ElysiaAI/game
docker build -t elysia-game:latest .

# マルチアーキテクチャ（amd64 + arm64）
docker buildx build --platform linux/amd64,linux/arm64 -t elysia-game:latest .
```

### 実行

```bash
docker run -p 3001:3001 elysia-game:latest
```

## Docker Buildx セットアップ

```bash
# Buildxインストール確認
docker buildx version

# ビルダー作成
docker buildx create --name multiarch --use --bootstrap

# 確認
docker buildx ls
```

## マルチアーキテクチャビルド

```bash
# ビルドとプッシュ（Docker Hub/GitHub Container Registry）
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ghcr.io/youruser/elysia-game:latest \
  --push \
  ElysiaAI/game
```

## サイズ最適化

ゲームサーバーのDockerイメージ: ~50MB（Alpine + Bun standalone）

## 関連ドキュメント

- [BUILD_PLATFORM.md](BUILD_PLATFORM.md) - 詳細なビルドガイド
