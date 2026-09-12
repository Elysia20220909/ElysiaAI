# 開発依存関係と確認範囲

確認日: 2026-09-12。ツールはローカル試験のために使い、リポジトリへバイナリを追加しない。
ホストの既定 Rust 設定、実機の起動設定、既存アプリの依存関係には変更を加えない。

| 依存 | 固定する版と取得元 | 用途 / ライセンス |
| --- | --- | --- |
| Rust / rust-lld | [Rust 1.96.0](https://static.rust-lang.org/dist/channel-rust-1.96.0.toml)、既存 toolchain | ビルド。Rust は MIT / Apache-2.0、LLVM 部分は Apache-2.0 with LLVM exception |
| r-efi | [crates.io 6.0.0](https://crates.io/crates/r-efi/6.0.0)、Cargo.lock 固定 | UEFI 型と定数。MIT または Apache-2.0 を選択可能 |
| QEMU | [Windows build 20260811](https://qemu.weilnetz.de/w64/)、QEMU 11.1.0 | ローカルエミュレーター。GPL-2.0 と各同梱物の個別ライセンス |
| EDK II firmware | 上記 QEMU に含まれる `edk2-*.fd` | UEFI。`edk2-licenses.txt` に EDK II と同梱ライブラリの条件 |
| 7-Zip | [26.03 x64](https://github.com/ip7z/7zip/releases/tag/26.03) | インストーラーを実行せず中身を取り出す補助。LGPL、BSD、一部 unRAR 制限 |
| Python | 既存の 3.14、標準ライブラリのみ | ビルドの呼び出し、制限時間、ログ判定。PSF License |

Rust の既存インストールは今回再構築していない。追加するのは UEFI / bare-metal の二つの
target standard library。`x86_64-unknown-none` は `no_std`、UEFI エントリーは `efiapi` を使う。
根拠: [bare-metal target](https://doc.rust-lang.org/rustc/platform-support/x86_64-unknown-none.html)、
[UEFI target](https://doc.rust-lang.org/rustc/platform-support/unknown-uefi.html)。

## 実行前に確認した範囲

| 観点 | 確認内容と残る範囲 |
| --- | --- |
| ソース | r-efi の manifest・公開入口・UEFI table/status 定義、QEMU の NSIS 包装と debug-exit、7-Zip の CLI 入口を確認。エミュレーターと圧縮ライブラリ全体の監査ではない |
| 依存関係 | r-efi は既定構成で依存なし、build script・proc macro なし。任意の rustc 用 feature は使わない。QEMU の同梱 DLL はその配布物に依存する |
| インストール | QEMU NSIS は管理者権限、レジストリ、ショートカット操作を持つため実行しない。7-Zip もインストーラーを実行せず、必要な CLI と DLL を展開する |
| Git hooks | 新しい workspace の active hooks はなし。既存リポジトリの通知 hook は有効化しない。crate と展開バイナリ取得は Git hook を実行しない |
| CI | r-efi の公開 workflow は存在するが実行しない。この追加で workflow・外部通知・配布 job を作らない |
| 同梱バイナリ | QEMU の配布元 SHA-512、7-Zip の release asset SHA-256 を照合。ファームウェアと実際に使う実行ファイルのハッシュをローカル試験結果へ記録する |
| 認証情報 | ゲストと runner に API key やホストの認証ファイルを渡さない。GitHub 認証はソースの Draft PR 作成のみ |
| 外部通信 | 取得時は公式取得先と crate registry へ HTTPS。起動時はゲスト NIC を作らず、ホストディスク・ホーム共有なし。仮想 FAT で渡すのはケース専用 ESP のみ |

QEMU の Windows 配布は upstream master ベースの experimental build と案内されている。
今回、配布バイナリをソースから再現ビルドして一致確認するところまでは行っていない。
ダイジェストの一致は取得内容の照合であり、配布元自体やバイナリに欠陥がないことの証明ではない。
7-Zip の取得ファイルは Authenticode 上 `NotSigned`。公式 release asset の SHA-256 と照合する。
QEMU の取得ファイルは署名証明書の期限切れとして返された。署名を有効とは扱わず、
配布元が掲載する SHA-512 との一致を確認した。

参考: [QEMU 包装スクリプト](https://github.com/stweil/qemu/blob/master/qemu.nsi)、
[DLL 収集処理](https://github.com/stweil/qemu/blob/master/scripts/nsis.py)、
[debug-exit 実装](https://github.com/qemu/qemu/blob/master/hw/misc/debugexit.c)、
[firmware の由来](https://github.com/qemu/qemu/blob/master/pc-bios/README)、
[7-Zip CLI](https://github.com/ip7z/7zip/blob/26.03/CPP/7zip/UI/Console/Main.cpp)。

## 取得と展開

Windows のリポジトリルートから実行する手順。PowerShell のエラーを停止条件にし、
各ネイティブコマンドの終了コードも確認する。ダウンロード先 `.tools/` は Git 管理対象外。
既存環境では再取得不要。これらのコマンドはシステムへのインストールを行わない。

```powershell
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force .tools/downloads, .tools/7zip, .tools/qemu | Out-Null
Invoke-WebRequest 'https://qemu.weilnetz.de/w64/qemu-w64-setup-20260811.exe' -OutFile .tools/downloads/qemu-w64-setup-20260811.exe
Invoke-WebRequest 'https://qemu.weilnetz.de/w64/qemu-w64-setup-20260811.sha512' -OutFile .tools/downloads/qemu.sha512
Invoke-WebRequest 'https://github.com/ip7z/7zip/releases/download/26.03/7z2603-x64.exe' -OutFile .tools/downloads/7z2603-x64.exe

$expected7zip = '0859c524b8a63551848f0c246abddcb1d0b7b656b0fbfe879f8d85e61a9e6edd'
if ((Get-FileHash .tools/downloads/7z2603-x64.exe -Algorithm SHA256).Hash -ne $expected7zip) { throw '7-Zip digest mismatch' }
$expectedQemu = ((Get-Content .tools/downloads/qemu.sha512 -Raw).Trim() -split '\s+')[0]
if ($expectedQemu -notmatch '^[0-9a-fA-F]{128}$') { throw 'Invalid QEMU digest format' }
if ((Get-FileHash .tools/downloads/qemu-w64-setup-20260811.exe -Algorithm SHA512).Hash -ne $expectedQemu) { throw 'QEMU digest mismatch' }

tar -xf .tools/downloads/7z2603-x64.exe -C .tools/7zip 7z.exe 7z.dll License.txt
if ($LASTEXITCODE -ne 0) { throw '7-Zip archive extraction failed' }
$listing = .tools/7zip/7z.exe l -slt .tools/downloads/qemu-w64-setup-20260811.exe
if ($LASTEXITCODE -ne 0) { throw 'QEMU archive listing failed' }
$entries = $listing | Where-Object { $_ -like 'Path = *' } | Select-Object -Skip 1 | ForEach-Object { $_.Substring(7) }
foreach ($entry in $entries) {
    if ([IO.Path]::IsPathRooted($entry) -or ($entry -split '[/\\]') -contains '..') { throw 'Unsafe archive path' }
}
$selected = $entries | Where-Object {
    $_ -eq 'qemu-system-x86_64.exe' -or $_ -match '^[^\\/]+\.dll$' -or
    $_ -like 'COPYING*' -or ($_ -like 'share\*' -and $_ -notlike 'share\doc\*')
}
$selected | Set-Content .tools/downloads/qemu-extract.txt -Encoding utf8
.tools/7zip/7z.exe x .tools/downloads/qemu-w64-setup-20260811.exe '-o.tools/qemu' '-y' '@.tools/downloads/qemu-extract.txt'
if ($LASTEXITCODE -ne 0) { throw 'QEMU extraction failed' }
```

上記は一覧の相対パスを検査し、コンソール版 QEMU、同梱 DLL、firmware を含む share と
ライセンスを `.tools/qemu/` へ展開する。setup / uninstall ファイルは起動しない。
QEMU 本体は `qemu-system-x86_64.exe`、ファームウェアは `share/edk2-x86_64-code.fd` と
`share/edk2-i386-vars.fd`。後者が 64-bit 用変数ストアでもあることは
同梱 `share/firmware/60-edk2-x86_64.json` で確認できる。

r-efi 6.0.0 の SHA-256 は Cargo.lock 内で
`f8dcc9c7d52a811697d2151c701e0d08956f92b0e24136cf4cf27b57a6a0d9bf` に固定する。
Cargo は `--locked` で取得内容を検査する。Rust と既存ホスト用リンカーを用意してから
[試験手順](README.md#ビルドと試験) を実行する。新規マシン全体のセットアップは未実証。
