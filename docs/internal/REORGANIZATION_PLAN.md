# ファイル構�E整琁E��画

## 🗂�E�E実施する整琁E
### 1. 重複READMEの統吁E
- `README.md` (メイン) - 保持
- `README.ja.md` (日本誁E - 保持
- `README.en.md` (英誁E - 保持
- ❁E`README.old.md` - 削除�E�古ぁE��ージョン�E�E- ❁E`README.new.md` - 削除�E�一時ファイル�E�E
### 2. ドキュメント�E整琁E�E統吁E
#### 削除対象�E�重褁E�E古ぁE��報�E�E
- ❁E`CLEANUP_REPORT.md` - 一時レポ�EチE- ❁E`DEPLOYMENT_READY_REPORT.md` - 一時レポ�EチE- ❁E`docs/DEEP_STRUCTURE_UPDATE.md` - 古ぁE��造惁E��
- ❁E`docs/STRUCTURE_UPDATE.md` - 古ぁE��造惁E��
- ❁E`docs/OPTIMIZATION_REPORT.md` - 一時レポ�EチE- ❁E`docs/UPGRADE_REPORT.md` - 一時レポ�EチE
#### 統合対象

- `docs/DEPLOYMENT_GUIDE.md` + `DEPLOYMENT.md` ↁE`docs/DEPLOYMENT_GUIDE.md`
- `docs/SECURITY_ARCHITECTURE.md` + `docs/SECURITY_HARDENING.md` + `SECURITY.md` ↁE`docs/SECURITY.md`
- `docs/PHASE5_API_SPEC.md` + `docs/PHASE5_PLUS_SUMMARY.md` ↁE`docs/PHASE5_COMPLETE.md`

### 3. 整琁E���E構造

```
elysia-ai/
├── README.md (メイン)
├── README.ja.md (日本誁E
├── README.en.md (英誁E
├── LICENSE
├── SECURITY.md ↁEdocs/SECURITY.md (統合版)
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
├── docs/
━E  ├── GETTING_STARTED.md (新要E- 簡潔なスタートガイチE
━E  ├── DEPLOYMENT_GUIDE.md (統合版)
━E  ├── SECURITY.md (統合版)
━E  ├── ARCHITECTURE.md
━E  ├── API.md
━E  ├── PHASE5_COMPLETE.md (統合版)
━E  ├── ADVANCED_FEATURES.md
━E  ├── PERSONAL_DEV_FEATURES.md
━E  ├── PROJECT_STRUCTURE.md
━E  ├── BENCHMARKS.md
━E  ├── DISASTER_RECOVERY.md
━E  ├── I18N_GUIDE.md
━E  ├── INTEGRATION_GUIDE.md
━E  ├── TELEMETRY_GUIDE.md
━E  ├── VOICE_GUIDE.md
━E  ├── VOICEVOX_SETUP.md
━E  └── LINUX_SETUP.md
```

## 📋 実施手頁E
1. 古いREADMEを削除
2. レポ�Eトファイルを削除
3. ドキュメントを統吁E4. 新しいGETTING_STARTEDを作�E
5. リンクを更新

## ✁E削減効极E
- READMEファイル: 5倁EↁE3倁E- ルートディレクトリのドキュメンチE 削渁E- docsフォルダ: 22倁EↁE15倁E- 合計削渁E 紁E4ファイル
