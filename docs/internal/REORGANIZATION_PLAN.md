# ファイル構成整理計画

## 🗂️ 実施する整理

### 1. 重複READMEの統合

- `README.md` (メイン) - 保持
- `README.ja.md` (日本語) - 保持
- `README.en.md` (英語) - 保持
- ❌ `README.old.md` - 削除（古いバージョン）
- ❌ `README.new.md` - 削除（一時ファイル）

### 2. ドキュメントの整理・統合

#### 削除対象（重複・古い情報）

- ❌ `CLEANUP_REPORT.md` - 一時レポート
- ❌ `DEPLOYMENT_READY_REPORT.md` - 一時レポート
- ❌ `docs/DEEP_STRUCTURE_UPDATE.md` - 古い構造情報
- ❌ `docs/STRUCTURE_UPDATE.md` - 古い構造情報
- ❌ `docs/OPTIMIZATION_REPORT.md` - 一時レポート
- ❌ `docs/UPGRADE_REPORT.md` - 一時レポート

#### 統合対象

- `docs/DEPLOYMENT_GUIDE.md` + `DEPLOYMENT.md` → `docs/DEPLOYMENT_GUIDE.md`
- `docs/SECURITY_ARCHITECTURE.md` + `docs/SECURITY_HARDENING.md` + `SECURITY.md` → `docs/SECURITY.md`
- `docs/PHASE5_API_SPEC.md` + `docs/PHASE5_PLUS_SUMMARY.md` → `docs/PHASE5_COMPLETE.md`

### 3. 整理後の構造

```
elysia-ai/
├── README.md (メイン)
├── README.ja.md (日本語)
├── README.en.md (英語)
├── LICENSE
├── SECURITY.md → docs/SECURITY.md (統合版)
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
├── docs/
│   ├── GETTING_STARTED.md (新規 - 簡潔なスタートガイド)
│   ├── DEPLOYMENT_GUIDE.md (統合版)
│   ├── SECURITY.md (統合版)
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── PHASE5_COMPLETE.md (統合版)
│   ├── ADVANCED_FEATURES.md
│   ├── PERSONAL_DEV_FEATURES.md
│   ├── PROJECT_STRUCTURE.md
│   ├── BENCHMARKS.md
│   ├── DISASTER_RECOVERY.md
│   ├── I18N_GUIDE.md
│   ├── INTEGRATION_GUIDE.md
│   ├── TELEMETRY_GUIDE.md
│   ├── VOICE_GUIDE.md
│   ├── VOICEVOX_SETUP.md
│   └── LINUX_SETUP.md
```

## 📋 実施手順

1. 古いREADMEを削除
2. レポートファイルを削除
3. ドキュメントを統合
4. 新しいGETTING_STARTEDを作成
5. リンクを更新

## ✅ 削減効果

- READMEファイル: 5個 → 3個
- ルートディレクトリのドキュメント: 削減
- docsフォルダ: 22個 → 15個
- 合計削減: 約14ファイル
