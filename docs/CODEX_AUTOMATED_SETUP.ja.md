# Codex 対応 自動セットアップ

ElysiaAI で Codex / GitHub Copilot CLI / WinUI 3 を同じ Windows 開発環境で扱うための、ローカルファーストな自動セットアップ手順です。

この手順は、伝統的な「前提条件を確認してから導入する」作法を守りつつ、次回から一息で環境を整えられるようにするためのものです。

## 対象

- Windows 11
- PowerShell 5.1 以降
- winget
- GitHub Copilot CLI
- `winui@awesome-copilot`
- .NET 10 SDK
- Windows App Development CLI
- Windows App SDK WinUI C# templates
- Developer Mode

## 確認だけ行う

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Setup-CodexWinUI.ps1
```

## 自動セットアップを実行する

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Setup-CodexWinUI.ps1 -Apply
```

同じ内容は Bun からも呼び出せます。

```powershell
bun run setup:codex-winui
```

## Copilot の `/winui-setup` skill も実行する

通常はスクリプト側で前提条件を直接確認・導入します。Copilot CLI の skill まで実行したい場合だけ、次を使います。

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Setup-CodexWinUI.ps1 -Apply -RunWinUISetupSkill
```

## Developer Mode

管理者権限がある PowerShell では、スクリプトが Developer Mode のレジストリ設定を有効化します。

管理者権限がない場合は、手動で次を開いてください。

```powershell
Start-Process "ms-settings:developers"
```

その後、`Settings` → `System` → `For developers` → `Developer Mode` を `On` にします。

## セットアップ後の確認

```powershell
codex --version
copilot plugin list
dotnet --version
winapp --version
dotnet new list winui
```

期待する状態:

- `codex` が PATH にある、または `ELYSIA_CODEX_BIN` で Workbench 起動先を指定できる
- `winui@awesome-copilot` が表示される
- `.NET SDK` が表示される
- `winapp CLI` が表示される
- `winui-mvvm` などの WinUI templates が表示される

Codex CLI が PATH にない場合でも、Codex desktop からこのスクリプトを実行する用途では問題ありません。`bun run agents -- launch --target codex` でローカル起動まで扱いたい場合は、`ELYSIA_CODEX_BIN` に Codex 実行ファイルの絶対パスを設定してください。

## 注意

- `.env`、token、credential は読み取りません。
- push、deploy、publish は行いません。
- 破壊的な削除や `git reset --hard` は行いません。
- PATH 反映のため、winget インストール直後は新しい PowerShell を開くと安定します。
