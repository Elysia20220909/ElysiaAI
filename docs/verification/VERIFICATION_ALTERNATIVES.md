# 検証スクリプト代替方法

PowerShell履歴のUnicodeエラーを回避するため、3つの代替検証スクリプトを用意しました。

## 問題の概要

PowerShell 5.1の履歴ファイルが絵文字などのUnicode文字をエンコードできず、以下のエラーが発生:

```
System.Text.EncoderFallbackException:
インデックス 54 にある Unicode 文字 \uD83C を指定されたコード ページに変換できません
```

**影響**: PowerShell履歴保存のみ(サービス稼働には影響なし)

## 代替スクリプト一覧

### 1. ⭐ verify-simple.bat (推奨)

**特徴**:

- cmd.exeベースのバッチファイル
- PowerShellを最小限使用(履歴に残らない短いコマンドのみ)
- Windows標準機能のみで動作
- 絵文字なし、シンプルな出力

**使い方**:

```cmd
verify-simple.bat
```

**出力例**:

```
========================================
   SIMPLE SERVICE VERIFICATION
========================================

[1/4] Redis (6379)...
      [OK] Redis is running
[2/4] FastAPI (8000)...
      [OK] FastAPI is running (50 quotes)
[3/4] Ollama (11434)...
      [OK] Ollama is running (2 models)
[4/4] RAG Search...
      [OK] RAG search working (3 results)

========================================
   RESULT: 4/4 services OK
========================================

[SUCCESS] All services are operational!
```

### 2. 🌐 verify-curl.bat

**特徴**:

- curlを使用したHTTPベースの検証
- より正確なHTTPステータスコードチェック
- JSONレスポンスを直接確認可能

**前提条件**:

- Windows 10 1803以降(curl標準搭載)
- または手動でcurlをインストール

**使い方**:

```cmd
verify-curl.bat
```

**出力例**:

```
========================================
   CURL-BASED SERVICE VERIFICATION
========================================

Using curl for HTTP checks...

[1/4] Redis (6379)...
      [OK] Redis port is open
[2/4] FastAPI (8000)...
      [OK] FastAPI is responding
      (Quotes: 50)
[3/4] Ollama (11434)...
      [OK] Ollama is responding
      (Models: 2)
[4/4] RAG Search...
      [OK] RAG search is working
      (Results: 3)

========================================
   RESULT: 4/4 services OK
========================================

[SUCCESS] All services are operational!
```

### 3. 🐧 verify-wsl.sh (Linux環境)

**特徴**:

- WSL(Windows Subsystem for Linux)で実行
- Bashスクリプト
- カラー出力対応
- 最も高速

**前提条件**:

- WSLがインストール済み
- Ubuntu/Debian等のLinuxディストリビューション

**WSLインストール**:

```powershell
wsl --install
```

**使い方**:

```bash
# WSL環境で実行
cd /mnt/c/Users/hosih/elysia-ai
bash verify-wsl.sh

# またはWindows側から
wsl bash verify-wsl.sh
```

**出力例**:

```
========================================
   WSL SERVICE VERIFICATION
========================================

[1/4] Redis (6379)... [OK] Redis is running
[2/4] FastAPI (8000)... [OK] FastAPI is running (Quotes: 50)
[3/4] Ollama (11434)... [OK] Ollama is running (Models available)
[4/4] RAG Search... [OK] RAG search is working

========================================
   RESULT: 4/4 services OK
========================================

[SUCCESS] All services are operational!
```

## 比較表

| スクリプト          | 環境       | 速度 | 追加要件 | おすすめ度        |
| ------------------- | ---------- | ---- | -------- | ----------------- |
| verify-simple.bat   | cmd        | 普通 | なし     | ⭐⭐⭐⭐⭐        |
| verify-curl.bat     | cmd + curl | 速い | curl     | ⭐⭐⭐⭐          |
| verify-wsl.sh       | WSL/Linux  | 最速 | WSL      | ⭐⭐⭐            |
| verify-services.ps1 | PowerShell | 普通 | なし     | ⭐⭐ (履歴エラー) |

## PowerShell 7 (pwsh) による完全な解決

PowerShell 5.1の代わりにPowerShell 7を使用すると、Unicode履歴エラーが発生しません。

### インストール方法

```powershell
# wingetを使用(Windows 11/10推奨)
winget install Microsoft.PowerShell

# または手動ダウンロード
# https://github.com/PowerShell/PowerShell/releases
```

### PowerShell 7で実行

```powershell
# pwshで起動
pwsh

# 既存のスクリプトを実行
.\verify-services.ps1
```

**利点**:

- ✅ UTF-8がデフォルト(絵文字対応)
- ✅ より高速
- ✅ クロスプラットフォーム対応
- ✅ 新機能追加

## 自動化

### タスクスケジューラで定期実行

**verify-simple.bat を使用**:

```cmd
# タスクスケジューラを開く
taskschd.msc

# 新しいタスクを作成
操作: C:\Users\hosih\elysia-ai\verify-simple.bat
トリガー: 毎日 9:00 AM
```

### Windows Terminalで簡単起動

**プロファイルに追加**:

```json
{
  "name": "Service Verification",
  "commandline": "cmd.exe /c C:\\Users\\hosih\\elysia-ai\\verify-simple.bat & pause",
  "startingDirectory": "C:\\Users\\hosih\\elysia-ai"
}
```

## トラブルシューティング

### verify-simple.bat がエラーを返す

```cmd
# デバッグモード
verify-simple.bat > debug.log 2>&1
notepad debug.log
```

### curl が見つからない

```powershell
# curlのバージョン確認
curl --version

# インストールされていない場合
winget install cURL.cURL
```

### WSLが起動しない

```powershell
# WSLの状態確認
wsl --status

# WSLを更新
wsl --update

# Ubuntuをインストール
wsl --install -d Ubuntu
```

## まとめ

### 推奨する使用方法

1. **日常的な確認**: `verify-simple.bat`
   - 最もシンプルで確実
   - PowerShell履歴エラーなし
   - Windows標準環境で動作

2. **詳細な検証**: `verify-curl.bat`
   - HTTPステータスコード確認
   - JSONレスポンス検証
   - より正確な診断

3. **開発環境**: `verify-wsl.sh`
   - Linux環境で高速実行
   - カラー出力で見やすい
   - スクリプト拡張が容易

4. **PowerShell愛好家**: PowerShell 7 + `verify-services.ps1`
   - Unicode完全対応
   - 最新機能利用可能
   - 既存スクリプト活用

---

**作成日**: 2025-12-04
**対象プロジェクト**: elysia-ai
**目的**: PowerShell履歴Unicodeエラー回避
