# E.L.I.S.I.A. Mark LXXXV Windows / macOS 本体サーバ化・自動セットアップ・美観・費用計算

## 要約

この文書は、E.L.I.S.I.A. を Windows PC または Mac 本体でローカルサーバ化するための、Mark LXXXV 必須版の設計書です。

ここでの Mark LXXXV は、実在するスーツ、兵器、飛行装置、人体拡張装置ではありません。E.L.I.S.I.A. のローカル環境を、静かで、美しく、分散型で、安全に育てるためのデザイン言語です。

大切にするもの:

- **Arc Core**: Windows / macOS 本体に宿る E.L.I.S.I.A. Core。
- **Nanotech Fabric**: Docker Compose で差し替え可能なサービス群。
- **HUD**: Homepage、Grafana、Uptime Kuma、Open WebUI、ローカルダッシュボード。
- **F.R.I.D.A.Y.**: AEGIS-FRIDAY、Codex、Antigravity Workbench の支援面。
- **Safety Governor**: LAN限定、秘密管理、UPS、バックアップ、WAN非公開。

最初のおすすめは、**Mark LXXXV Desk Core** です。机の横に置ける静かな Windows mini workstation または Mac mini を中心に、外付けSSD、UPS、短いケーブル、低輝度LED、ローカルDNSを整えます。

## Mark LXXXV を必須にする理由

Mark LXXXV の本質は、派手な出力ではなく「小さな部品が協調して、装着者を守りながら状況を見せる」ことです。

E.L.I.S.I.A. のローカルサーバも同じです。

- 一つの巨大なサーバではなく、Docker service、NAS、UPS、監視、DNS、AI assistant が協調する。
- 強さは危険な自動化ではなく、復旧できる構造、見える状態、手動確認にある。
- HUDのようなダッシュボードで、状態、負荷、警告、バックアップ、AI状態を一目で見る。
- 机上に置いても美しく、生活空間に馴染む。

## 安全境界

扱わないもの:

- 実在する兵器、飛行装置、推進装置、人体装着型機械の製作手順。
- 高出力装置、危険な自動制御、無断の物理操作。
- WAN公開を前提にした管理画面。
- 秘密情報の自動収集、アップロード、Git管理。

扱うもの:

- ローカルAIサーバの構成。
- Windows / macOS 本体サーバ化。
- Docker / Compose 自動セットアップ。
- HUD風ダッシュボード設計。
- 機材の美観、配線、費用、電気代。
- 安全な運用境界。

## 許可する安全な実装範囲

次の3つは、Mark LXXXV 必須版 E.L.I.S.I.A. で明確に許可します。

| 領域 | 許可内容 | 守る条件 |
| --- | --- | --- |
| ソフトウェアシミュレーション | 物理デバイスを動かさない仮想環境で、ロボティクス制御アルゴリズムを学習・可視化する | 実GPIO、CAN、USB制御、モーター駆動、推進系には接続しない |
| SF的なUIデザイン | 映画に登場するような高度なHUD風Webアプリケーション画面を作る | 架空演出と実運用状態を区別し、危険操作ボタンを置かない |
| セキュアなシステム管理 | 適切な認証と暗号化を備え、LAN内で完結する安全なダッシュボードを構築する | `docs/CUSTOMIZATION_SECURITY_GUIDE.md` に従い、入力検証、レート制限、セキュリティヘッダーを入れる |

実装方針:

- シミュレーションは、Web UI、Canvas、Three.js、ログ再生、仮想センサー値で表現する。
- HUDは、Homepage、Grafana、Uptime Kuma、Open WebUI、ElysiaAI APIの安全な読み取り情報を中心にする。
- 管理画面は、LAN、Tailscale、WireGuardなどの閉じた経路に置く。
- ユーザー入力は、HTMLエスケープ、パストラバーサル対策、危険文字の検証を通す。
- 高頻度アクセスや操作APIには、レート制限を設定する。
- レスポンスには、`X-Content-Type-Options`、`X-Frame-Options`、`Strict-Transport-Security` などのセキュリティヘッダーを適用する。

## 安全・合法でできる現実的な代替

次の範囲は、コスプレ、展示、教育用プロップとして許可します。

| 代替案 | できること | 条件 |
| --- | --- | --- |
| コスプレ/プロップ版ナノスーツ | 前開き式の胸部、肩部、前腕パネルを作る。マグネット、ヒンジ、ジッパー、低出力の装飾用開閉を使う | 軽量、非耐荷重、鋭利な角なし、挟み込み対策あり |
| 低出力電動版 | 小型サーボや小型DCモーターで、腕パーツや前部パネルが少し動く演出を作る | Arduino/ESP32などで低電圧制御。重いものを持たない、飛ばない、自律動作しない |
| ヘルメット特化 | 前から開くvisor、小型ディスプレイ、LED、Jarvis風/FRIDAY風の音声演出を作る | 視界、呼吸、熱、バッテリー位置、緊急脱着を優先する |

必須条件:

- 低電圧、短時間動作、手が届く電源遮断を前提にする。
- 身体を支える構造、重量物を動かす構造、飛行/推進/投射/発熱を目的にしない。
- パネル開閉部には、指を挟まない隙間、柔らかい縁、手動解除を入れる。
- 公開イベントでは、手動停止できる人を近くに置く。
- バッテリー、配線、LEDは、熱がこもらないように外せる構造にする。

最初に作るなら:

1. **ヘルメット特化**: visor開閉、LED、小型ディスプレイ、音声演出。
2. **前開き式の胸部・肩部プロップ**: 見た目の満足度が高く、比較的安全に作りやすい。
3. **低出力で前が電動で開く腕パーツ**: 小さく試せるが、挟み込み対策を必ず入れる。
4. **全身シェル**: 単体モジュールで安全確認できてから進む。

作りたい部位の選び方:

- 見た目優先なら、前開き式の胸部・肩部。
- 技術演出優先なら、低出力の前腕パネル。
- Mark LXXXV感とE.L.I.S.I.A. HUDを一番出したいなら、ヘルメット特化。
- 3Dモデル探索から始めたいなら、まず「非商用/商用利用可」「改変可」「着用安全性の説明あり」のデータを探す。

## プロップ機械工作ロードマップ

このロードマップは、装着者を強化する機械ではなく、見た目、開閉演出、HUD体験を作るためのものです。

共通材料:

- EVAフォーム、PETG/PLA 3Dプリント部品、薄いABS板、布、ナイロンベルト。
- ネオジム磁石、面ファスナー、ジッパー、小型ヒンジ、樹脂バックル。
- 拡散カバー付きLED、USB 5V系バッテリー、低出力サーボ、手元電源スイッチ。
- ゴム縁、スポンジ、熱収縮チューブ、ケーブルスリーブ。

避ける材料・構造:

- 重量物を動かすリンク機構。
- 強いバネ、空圧、油圧、高出力モーター。
- 金属の鋭利なエッジ。
- 身体を支える外骨格構造。
- 皮膚や首、指の近くで強く閉じる機構。

### Phase 1: ヘルメット特化

目的:

- Mark LXXXV感を最短で出す。
- visor開閉、LED、音声、簡易HUDを安全に試す。

工作方針:

- 最初は厚紙またはEVAフォームで頭囲、視界、呼吸スペースを確認する。
- visorは前開きまたは上開きにし、軽いヒンジと磁石で保持する。
- 開閉は手動を標準にし、電動化する場合も軽いパネルだけにする。
- 小型ディスプレイは視界を塞がず、反射板やスマホ表示などの疑似HUDから始める。
- バッテリーは後頭部や首元に固定せず、外せる位置に置く。

安全ゲート:

- 30分着用して息苦しさ、熱、首疲れがない。
- 視界を遮らない。
- 片手で外せる。
- visorが指を挟まない。

### Phase 2: 前開き式の胸部・肩部

目的:

- 見た目の密度を上げる。
- Arc Core、肩装甲、前開きギミックを作る。

工作方針:

- 胸部はEVAフォームまたは軽量3Dプリントの分割パネルにする。
- 肩部は腕の可動域を優先し、硬い一体構造にしない。
- 前開きは、ジッパー、磁石、面ファスナー、軽いヒンジで構成する。
- Arc Core LEDは拡散板を入れ、熱がこもらないようにする。
- 荷重は肩だけで受けず、ナイロンベルトで胴体に分散する。

安全ゲート:

- 深呼吸できる。
- 肩を上げても首や腕を圧迫しない。
- 前面を自分で開けられる。
- LED点灯後に熱くならない。

### Phase 3: 低出力の前腕パネル

目的:

- 小さな機械開閉を安全に試す。
- Mark LXXXVのナノパネル風演出を作る。

工作方針:

- 前腕は上下2分割のシェルにし、面ファスナーや磁石で脱着する。
- 電動化は軽い飾りパネルだけに限定する。
- サーボは低出力・低速設定にし、パネルの端には柔らかい縁を付ける。
- 開閉端には機械的なストッパーを置き、無理に回り続けない構造にする。
- 手動でパネルを開けられる逃げを残す。

安全ゲート:

- 素手で止めても痛くない程度の力にする。
- 指が入る隙間を作らない、または十分に広く逃がす。
- 電源を切ると安全な状態で止まる。
- 連続動作で熱くならない。

### Phase 4: 全身シェル

目的:

- 単体モジュールを統合し、撮影・展示・イベント用の全身外装にする。

工作方針:

- 全身を一体化せず、ヘルメット、胸部、肩、前腕、腰、脚を分割する。
- 歩行、座る、しゃがむ、階段は最初から無理に狙わない。
- 膝、股関節、肘、首回りは柔らかい部材を使う。
- 内部配線はコネクタで分離できるようにする。
- 運搬箱、補修キット、予備磁石、予備ベルトを用意する。

安全ゲート:

- 介助者なしでも脱げる。
- 転倒時に硬い部品が身体へ刺さらない。
- 歩行テストは室内の平坦な床から始める。
- イベントでは長時間連続着用しない。

最初の製作順:

```text
helmet visor mock
  -> helmet LED/HUD audio
  -> chest front-open mock
  -> shoulder range test
  -> forearm passive shell
  -> forearm low-output motion
  -> full visual suit shell
```

## 推奨アーキテクチャ

```text
Mark LXXXV Desk Core
  |
  +-- Windows PC / Mac
  |     |
  |     +-- Docker Desktop / Colima / OrbStack
  |     +-- E.L.I.S.I.A. Core
  |     +-- Open WebUI / Ollama
  |     +-- Homepage HUD
  |     +-- Uptime Kuma
  |     +-- Grafana / Prometheus
  |     +-- Gitea / n8n / MQTT
  |
  +-- External SSD or internal NVMe
  +-- UPS
  +-- Optional NAS
  +-- Local DNS / hosts
  +-- MAIN or SERVER VLAN
```

Mark LXXXV対応表:

| Mark LXXXV概念 | E.L.I.S.I.A.実装 | 目的 |
| --- | --- | --- |
| Arc Core | Windows / Mac host | ローカルAIの炉心 |
| Nanotech Fabric | Docker Compose services | 差し替え、復旧、拡張 |
| Helmet HUD | Homepage / Grafana / Uptime Kuma | 状態の可視化 |
| F.R.I.D.A.Y. | AEGIS-FRIDAY / Codex / Antigravity | 判断補助と実装支援 |
| Safety Governor | Firewall / bind IP / backups / UPS | 暴走防止と復旧性 |
| Armor Integrity | backup, disk health, service health | 壊れる前に気づく |
| Power Envelope | UPS, watt budget, thermal margin | 熱と電力を管理 |

## 構成ティアと費用

価格は計画用概算です。税、送料、輸入費、為替、セール差は含みません。

計画レート:

```text
1 USD ~= 157 JPY
```

| Tier | 内容 | 概算 |
| --- | --- | ---: |
| Arc Reactor Minimal | 既存Windows/Mac、外付けSSD、UPS、Docker runtime | USD 250-900 / JPY 39,000-141,000 |
| Mark LXXXV Desk Core | Mac mini または小型Windows host、SSD、UPS、整った配線 | USD 1,300-3,400 / JPY 204,000-534,000 |
| Hall of Armor Studio | Host、NAS、UniFi級ネットワーク、UPS、小型ラック | USD 3,800-5,800 / JPY 597,000-911,000 |
| Stark Lab Expansion | 高性能hostまたはGPU PC、NAS、強めのUPS/ネットワーク | USD 6,500-10,000+ / JPY 1,021,000-1,570,000+ |

## 費用内訳

### Arc Reactor Minimal

| 項目 | 目安 |
| --- | ---: |
| 既存Windows/Mac流用 | USD 0 |
| 外付けSSD 2TB | USD 120-250 |
| UPS 1000-1500VA | USD 180-350 |
| ケーブル、ラベル、スタンド | USD 50-150 |
| 合計 | USD 250-900 |

向いている人:

- まず試したい。
- 既存PC/Macを活かしたい。
- NASやラックは後でよい。

### Mark LXXXV Desk Core

| 項目 | 目安 |
| --- | ---: |
| Mac mini / Windows mini workstation | USD 800-2,400 |
| 2TB-4TB SSD | USD 150-500 |
| UPS | USD 180-350 |
| 2.5GbE adapter / small switch | USD 50-250 |
| ケーブル、スタンド、照明整理 | USD 120-300 |
| 合計 | USD 1,300-3,400 |

向いている人:

- 机上に美しく置きたい。
- 常時稼働の静けさが欲しい。
- ローカルAI、ダッシュボード、軽い自動化をまとめたい。

### Hall of Armor Studio

| 項目 | 目安 |
| --- | ---: |
| Host | USD 1,400-2,800 |
| NAS + drives | USD 1,200-2,200 |
| Router / switch / AP | USD 500-900 |
| UPS + rack + cables | USD 500-900 |
| 追加SSD / backup media | USD 200-600 |
| 合計 | USD 3,800-5,800 |

向いている人:

- E.L.I.S.I.A. を家の中枢として育てたい。
- NAS、バックアップ、監視を重視する。
- Proxmox移行も視野に入れる。

### Stark Lab Expansion

| 項目 | 目安 |
| --- | ---: |
| 高性能host / GPU PC | USD 2,500-5,500 |
| GPU追加 | USD 1,300-3,800+ |
| NAS強化 | USD 1,500-3,000 |
| 10GbE / 強化UPS / rack cooling | USD 1,000-2,500 |
| 合計 | USD 6,500-10,000+ |

向いている人:

- 重いローカルLLMや生成AIを回したい。
- 複数VM、GPU、NAS転送を常用したい。
- 電力、熱、騒音、UPS容量を管理できる。

## 月額電気代計算

計算式:

```text
monthly_kWh = average_watts * 24 * 30 / 1000
monthly_cost = monthly_kWh * electricity_rate
```

目安:

| 平均消費電力 | kWh/月 | JPY 35/kWh | USD 0.18/kWh |
| ---: | ---: | ---: | ---: |
| 25W | 18.0 | JPY 630 | USD 3.24 |
| 60W | 43.2 | JPY 1,512 | USD 7.78 |
| 120W | 86.4 | JPY 3,024 | USD 15.55 |
| 300W | 216.0 | JPY 7,560 | USD 38.88 |

判断:

- Mac mini系は静音・省電力で、Desk Coreに向きます。
- Windows mini workstationは拡張性が魅力ですが、構成により消費電力差が大きいです。
- GPU PCは電気代より先に、熱、騒音、UPS容量を見ます。

## Windows 自動セットアップ

前提:

- Windows 11。
- Docker Desktop + WSL2 backend。
- Bun。
- 可能なら固定IPまたはDHCP予約。

確認:

```powershell
docker version
docker compose version
bun --version
```

安全な準備:

```powershell
bun run local-server:host
```

ローカルだけで起動:

```powershell
bun run local-server:host -- --domain-suffix localhost --start
```

LAN公開:

```powershell
bun run local-server:host -- --bind-ip 10.10.20.30 --domain-suffix home.arpa --start
```

Mark LXXXV HUD確認:

- `https://dash.localhost` または `https://dash.home.arpa`
- `https://ai.localhost` または `https://ai.home.arpa`
- `https://grafana.localhost` または `https://grafana.home.arpa`
- `https://status.localhost` または `https://status.home.arpa`

## macOS 自動セットアップ

前提:

- Mac mini、Mac Studio、または常時稼働できるMac。
- Docker Desktop、Colima、OrbStackのいずれか。
- Bun。
- Energy settingsでスリープを抑制。

確認:

```bash
docker version
docker compose version
bun --version
```

安全な準備:

```bash
bun run local-server:host
```

ローカルだけで起動:

```bash
bun run local-server:host -- --domain-suffix localhost --start
```

LAN公開:

```bash
bun run local-server:host -- --bind-ip 10.10.20.30 --domain-suffix home.arpa --start
```

macOS向け注意:

- FileVaultと自動ログインの扱いを決める。
- 再起動後にDocker runtimeが上がるか確認する。
- Caddy root CAをKeychain Accessに入れる。
- Macを閉じる運用ではなく、常時稼働できる設置にする。

## おしゃれ要件

Mark LXXXVらしさは、赤金に光らせることだけではありません。

大事なのは、整った線、見える状態、必要なときだけ光るHUD、そして安全な沈黙です。

推奨:

- 色は **black / warm gold / deep red / aluminum / natural wood** から2-3要素に絞る。
- RGBを常時点灯させず、status lightは低輝度にする。
- LANケーブルは短く、同色、両端ラベル付きにする。
- UPSは見せすぎず、熱が逃げる場所へ置く。
- SSDは背面へ逃がし、正面は本体とHUDだけにする。
- 小型ラックなら、NAS、switch、UPS、hostの順に熱と重さを考える。

机上構成:

```text
[Display / HUD]
      |
[Mac mini or compact PC] -- short cable -- [External SSD]
      |
  hidden cable tray
      |
    [UPS under desk]
```

棚構成:

```text
Top:     AP or low-light status panel
Middle:  Host + switch
Middle:  NAS
Bottom:  UPS
```

## セキュリティチェック

- [ ] `127.0.0.1` で先に検証した。
- [ ] LAN公開は `--bind-ip` を明示したときだけ。
- [ ] WAN port forwardはない。
- [ ] `.env` と `setup-secrets.txt` はGit管理外。
- [ ] Docker Desktopの共有フォルダは最小。
- [ ] NASまたは外部SSDへバックアップする。
- [ ] UPSで安全停止できる。
- [ ] 管理画面はMAIN/SERVER VLANまたはTailscale/WireGuardだけ。

## 完成条件

- [ ] `docker compose config --quiet` が通る。
- [ ] `https://ai.localhost` または `https://ai.home.arpa` が開く。
- [ ] `https://dash.localhost` または `https://dash.home.arpa` が開く。
- [ ] `https://status.localhost` または `https://status.home.arpa` が開く。
- [ ] 主要サービスがUptime Kumaで見える。
- [ ] 週次backupの置き場所が決まっている。
- [ ] 机上または棚の配線が保守しやすい。
- [ ] Mark LXXXV要件として「HUD」「Safety Governor」「Nanotech Fabric」「Arc Core」が説明できる。

## 参照

- [Windows / macOS Host Server](./ELISIA_WINDOWS_MACOS_HOST_SERVER.md)
- [Local Server Automated Setup](./ELISIA_LOCAL_SERVER_AUTOMATED_SETUP.md)
- [Local Server Hardware Design](./ELISIA_LOCAL_SERVER_HARDWARE_DESIGN.md)
- [Mark LXXXV Distributed Wearable Computing Spec](./fictional/MARK85_DISTRIBUTED_WEARABLE_COMPUTING_SPEC.md)
- [Mark LXXXV Fantasy Suit System](./fictional/MARK85_FANTASY_SUIT_SYSTEM.md)
- [Apple Mac mini](https://www.apple.com/shop/buy-mac/mac-mini)
- [Apple Mac Studio](https://www.apple.com/mac-studio/)
- [Docker Desktop license agreement](https://docs.docker.com/subscription/desktop-license/)
- [Microsoft Windows 11 Pro](https://www.microsoft.com/en-us/d/windows-11-pro/dg7gmgf0d8h4)

## 結論

E.L.I.S.I.A. の Mark LXXXV 構成は、強さを誇示するためのものではありません。

小さな炉心、整ったHUD、差し替え可能なナノテックのようなサービス群、そして危険を止める安全総督。机の上に置ける静かな未来として、Windows / macOS 本体サーバから始めるのが最も美しい第一歩です。
