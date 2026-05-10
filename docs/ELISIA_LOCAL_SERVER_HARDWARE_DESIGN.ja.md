# E.L.I.S.I.A.向けローカルサーバ機材・費用設計書

E.L.I.S.I.A.を、クラウドに頼りすぎない「部屋の中の知性」として育てるための機材設計です。

この文書は、既存の実装寄りドキュメントを補完します。`ELYSIA_HOME_SERVER_BLUEPRINT.md` が思想とサービス配置、`STARK_HOME_LOCAL_SERVER_BUILD.md` がProxmox/OPNsense/VLANの手順なら、この文書は「何を買うか」「どの順番で買うか」「どのくらいかかるか」を扱います。

## 要約

最初に作るべきものは、派手なGPUラックではなく、静かで、壊れにくく、戻せるローカル基盤です。

- 推奨構成は **Sovereign AI Studio**。
- 初期費用の目安は **USD 3,800-5,500 / JPY 600,000-865,000**。
- まずはネットワーク、UPS、NAS、バックアップを固めます。
- GPU、10GbE、二重WAN、複雑な自動化は後から追加します。
- 機材は、性能だけでなく「部屋に置いたときの佇まい」も設計対象にします。

## 価格前提

価格は 2026-05-10 時点の公開情報をもとにした計画用概算です。

- 税、送料、輸入費、設置工事費は含みません。
- 日本円は計画レートとして `1 USD ~= 157 JPY` で換算します。
- セール、為替、在庫、GPUの市場価格で大きく変わります。
- 購入前には、末尾のソースリンクで再確認してください。

## 設計思想

E.L.I.S.I.A.のローカルサーバは、家の中に置く小さな灯台です。目立ちすぎず、けれど確かに頼れること。華やかさよりも、日々の復旧性と静けさを優先します。

- **ローカルファースト**: 個人データ、ログ、家庭内状態はできるだけLAN内に置く。
- **手動監督**: 家電や入力操作の自動化は、監視と復旧導線が整ってから。
- **UPS優先**: GPUより先に、電源断からデータを守る。
- **VLAN優先**: スマートホームより先に、IoT、Guest、Labを分ける。
- **美観も仕様**: 黒い箱の山ではなく、棚や机に置いても意図が見える構成にする。
- **段階導入**: 最初から完成形を買わず、基盤、記憶、計算、加速の順に育てる。

## 既存設計との関係

| 文書 | 役割 |
| --- | --- |
| [E.L.I.S.I.A. Core Home Server Blueprint](./ELYSIA_HOME_SERVER_BLUEPRINT.md) | サービス配置、VM、Local Ops連携の全体像 |
| [Stark Home Local Server Build](./STARK_HOME_LOCAL_SERVER_BUILD.md) | Proxmox、OPNsense、VLAN、Docker Coreの具体手順 |
| [Local Home Server Ops](./LOCAL_HOME_SERVER_OPS.md) | ElysiaAI側で可視化する運用チェック |
| 本文書 | 機材候補、費用、購入順、見た目の方針 |

## 構成ティア

| Tier | 目的 | 費用目安 |
| --- | --- | ---: |
| Glass Library Minimal | 静音・省スペース。NAS、監視、軽いローカルAI、Home Assistant | USD 2,700-3,500 / JPY 425,000-550,000 |
| Sovereign AI Studio | 推奨。小型計算機、NAS、堅いネットワーク、後日GPU追加余地 | USD 3,800-5,500 / JPY 600,000-865,000 |
| Sanctum GPU Rack | 高性能LLM、画像/動画生成、複数VM、GPU常用 | USD 6,500-9,500+ / JPY 1,020,000-1,490,000+ |

## Tier 1: Glass Library Minimal

静かで美しい最小構成です。白い棚、木目の天板、小さなラック、柔らかいLEDに馴染む構成を想定します。

| 役割 | 例 | 用途 | 概算 |
| --- | --- | --- | ---: |
| Core host | Apple Mac mini M4 class / Intel or AMD mini PC | Docker、軽量ローカルAI、管理UI | USD 799-1,200 |
| NAS | UGREEN NASync DXP4800 Plus / Synology 4-bay class | ファイル、バックアップ、スナップショット | USD 600-800 |
| NAS drives | 2-4x NAS HDD or SSD | データ領域。最初は2本でもよい | USD 300-800 |
| Router | Ubiquiti Cloud Gateway Ultra | ルーティング、VLAN、管理 | USD 129 class |
| Switch | Ubiquiti Switch Lite 8 PoE | AP給電、VLAN対応 | USD 109 class |
| Wi-Fi AP | Ubiquiti U7 Pro | MAIN/IOT/GUEST SSID | USD 189 class |
| UPS | CyberPower CP1500PFCLCD / APC 1500VA class | 停電時の安全停止 | USD 220-330 |
| Appearance | cable tray, labels, short cables, shelf | 見た目と保守性 | USD 100-300 |

向いている人:

- まずE.L.I.S.I.A.を安定して動かしたい。
- 机やリビングの近くに置きたい。
- 大きなGPUはまだ要らない。
- NASとバックアップを最優先にしたい。

注意:

- Mac miniはProxmoxホストとしては扱いにくいため、Docker/アプリホストとして考える方が現実的です。
- Proxmoxを正面に据えるなら、x86ミニPCを選ぶ方が素直です。
- 大型LLMは軽量モデル中心になります。

## Tier 2: Sovereign AI Studio

推奨構成です。小型でも計算資源に余裕を持たせ、NASとネットワークを先に整えます。美しさと拡張性の釣り合いがよく、E.L.I.S.I.A.の「家の中の中枢」として長く使えます。

| 役割 | 例 | 用途 | 概算 |
| --- | --- | --- | ---: |
| Compute host | Framework Desktop / compact Ryzen AI Max class / x86 Proxmox host | VM、Docker、ローカルAI、開発 | USD 1,400-2,800 |
| Memory | 64-128GB RAM class | 複数VMとAI推論の余裕 | included or USD 250-700 |
| System SSD | 2TB NVMe, mirror if possible | VM、コンテナ、モデル | USD 150-350 |
| NAS | UGREEN/Synology 4-bay NAS | バックアップ、メディア、ドキュメント | USD 600-900 |
| NAS drives | 4x NAS HDD, RAID/ZFS policy | 復旧しやすい記憶領域 | USD 600-1,200 |
| Router | Ubiquiti Cloud Gateway Max / OPNsense box | VLAN、VPN、将来2.5GbE | USD 199-300 |
| Switch | Ubiquiti Flex 2.5G PoE / Lite 8 PoE | 2.5GbE、PoE、AP接続 | USD 109-199 |
| Wi-Fi AP | Ubiquiti U7 Pro | MAIN/IOT/GUEST | USD 189 class |
| Rack | Ubiquiti Toolless Mini Rack / small 6U rack | 美観、通気、配線 | USD 150-300 |
| UPS | 1500VA sine-wave UPS | NASとホストを保護 | USD 220-350 |

推奨理由:

- Proxmox、Docker Core、Home Assistant、監視、NAS連携を無理なく動かせます。
- 128GB級メモリなら、VMを増やしても余裕があります。
- GPUを急がず、ネットワークと復旧性を先に完成できます。
- 小型ラックに収まり、生活空間に置いても「設備感」が出すぎません。

このティアでの初期サービス:

- Proxmox VE or Docker host
- Ollama
- Open WebUI
- Home Assistant OS
- Uptime Kuma
- Gitea
- n8n
- Local DNS
- NAS backup target
- Tailscale or private VPN

## Tier 3: Sanctum GPU Rack

高性能なローカルAIを常用する構成です。静かな聖域のようなラックに、GPUワークステーション、NAS、UniFi、UPSをまとめます。

| 役割 | 例 | 用途 | 概算 |
| --- | --- | --- | ---: |
| GPU workstation | Fractal North / compact ATX quiet build | GPU推論、生成AI、重いVM | USD 2,000-3,500 before GPU |
| GPU | NVIDIA RTX 5080/5090 class | 高VRAM推論、画像/動画生成 | USD 1,300-3,800+ market-dependent |
| RAM | 128-256GB | 大型VM、モデル、開発環境 | USD 400-1,300 |
| SSD | 4TB+ NVMe | モデル、データセット、VM | USD 250-700 |
| NAS | 4-8 bay NAS | バックアップ、スナップショット | USD 900-2,000 |
| Drives | 4-8x NAS HDD | 長期保存 | USD 1,000-2,500 |
| Network | 2.5GbE/10GbE switch and gateway | NAS転送、Lab、複数端末 | USD 500-1,500 |
| UPS | 1500-2200VA class | GPU負荷時の余裕 | USD 350-900 |
| Rack and cooling | 6U-12U rack, fans, cable management | 熱、騒音、美観 | USD 300-1,000 |

向いている人:

- ローカルLLMを重く使う。
- 画像生成、動画生成、音声処理、検索拡張をLAN内で回したい。
- AI Lab VLANや検証VMを常時使う。
- 予算よりも自律性と速度を重視する。

注意:

- GPUは価格と在庫が最も荒れやすい部品です。
- 電力、発熱、騒音、UPS容量を見積もる必要があります。
- 最初からTier 3に行くより、Tier 2を安定させてからGPUを足す方が失敗しにくいです。

## 推奨購入順

1. Foundation: ルータ、VLAN対応スイッチ、Wi-Fi AP、UPS。
2. Memory: NAS、NAS用ドライブ、バックアップ先。
3. Compute: Mac mini、Framework Desktop、x86 Proxmox hostなど。
4. Operations: Uptime Kuma、バックアップ通知、復旧手順。
5. AI Acceleration: GPU、追加RAM、追加SSD。
6. Beauty pass: 小型ラック、短いケーブル、ラベル、木製天板、低輝度LED。

この順番の良いところは、失敗しても戻れることです。機材が増えるほど、復旧手順と配線の美しさが効いてきます。

## 推奨ネットワーク構成

```text
Internet
  |
[Router / Firewall]
  |
[Managed PoE Switch]
  |
  +-- VLAN10 MAIN   : PC / phone / admin clients
  +-- VLAN20 SERVER : E.L.I.S.I.A. host / NAS / monitoring
  +-- VLAN30 IOT    : sensors / cameras / home devices
  +-- VLAN40 GUEST  : guest Wi-Fi
  +-- VLAN50 LAB    : CTF / sandbox / test VMs
  +-- VLAN60 MGMT   : router / switch / Proxmox management
```

最低限の守り:

- WANから管理画面へport forwardしない。
- 管理はTailscale、WireGuard、またはLAN内に限定する。
- IoTからMAIN/MGMTへ直接アクセスさせない。
- LabからSERVER/MGMT/NASへ到達させない。
- NASはSERVER VLANに置き、GuestとIoTから隔離する。

## 美観設計

おしゃれな機材は、派手なRGBではなく、静かな一貫性で決まります。

- 色は **black / white / natural wood / glass** のうち2-3要素に絞る。
- ラックは視界に入るなら小型で整ったものにする。
- ケーブルは短め、同色、ラベル付き。
- LEDは低輝度かオフにできる機材を選ぶ。
- NASとUPSは熱を持つので、密閉家具に押し込まない。
- 机上に置くならMac miniや小型ミニPC、棚に置くなら小型ラックがよい。

## 費用を守る判断基準

- GPUより先にUPSを買う。
- 10GbEを全面導入せず、最初は2.5GbE中心でよい。
- NASドライブは一度に最大容量へ行かず、バックアップ設計を先に決める。
- ルータ、スイッチ、APは同一エコシステムに寄せると運用が楽です。
- ただしFirewallを細かく触りたい場合は、OPNsense boxを選ぶ価値があります。
- 生成AIのためだけにGPUを買う前に、実際に使うモデル、VRAM、電力、騒音を確認する。

## 初期構成の具体案

最初の一式として、次を推奨します。

| 区分 | 推奨 |
| --- | --- |
| Host | Framework Desktop / x86 mini workstation class, 64-128GB RAM |
| NAS | UGREEN NASync DXP4800 Plus or Synology 4-bay class |
| Router | Ubiquiti Cloud Gateway Max or OPNsense mini appliance |
| Switch | Ubiquiti Flex 2.5G PoE or Switch Lite 8 PoE |
| AP | Ubiquiti U7 Pro |
| UPS | 1500VA sine-wave UPS |
| Rack | Ubiquiti Toolless Mini Rack or compact 6U rack |

初期費用目安:

```text
Base compute        USD 1,400-2,800
NAS + drives        USD 1,200-2,100
Network + Wi-Fi     USD   500-900
UPS + rack + cables USD   500-900
-----------------------------------
Total               USD 3,800-5,500
JPY                 JPY 600,000-865,000
```

## 含めていない費用

- 消費税、送料、関税、輸入手数料。
- 施工費、壁内配線、棚や家具。
- ディスプレイ、キーボード、KVM。
- 2本目のインターネット回線。
- クラウドバックアップの月額費。
- 交換用ドライブ、予備UPSバッテリー。

## 購入前チェックリスト

- [ ] 置き場所の奥行き、幅、高さを測った。
- [ ] NASとUPSの排熱スペースがある。
- [ ] ルータ、スイッチ、APがVLANに対応している。
- [ ] UPSにNASとホストを両方つなげる容量がある。
- [ ] 管理画面をWANへ公開しない方針を決めた。
- [ ] NASのバックアップ先を別ディスクまたは別筐体に決めた。
- [ ] GPUを買う前に、使うモデルと必要VRAMを確認した。
- [ ] ケーブル、ラベル、短いLANケーブルまで予算に入れた。

## 価格・機材ソース

購入直前に必ず再確認してください。特にMac mini、Framework Desktop、GPU、NASは価格が変わります。

| 対象 | ソース |
| --- | --- |
| Apple Mac mini | [Apple Mac mini buy page](https://www.apple.com/shop/buy-mac/mac-mini), [MacRumors price note](https://www.macrumors.com/2026/05/02/apple-just-raised-mac-mini-starting-price/) |
| Framework Desktop | [Framework Desktop](https://frame.work/desktop), [Tom's Hardware pricing update](https://www.tomshardware.com/desktops/gaming-pcs/diy-pc-maker-framework-finally-succumbs-to-ram-apocalypse-is-raising-prices-on-its-desktops-now-starts-at-usd1-139-with-32gb-128gb-up-usd450) |
| Ubiquiti gateway / switch / AP / rack | [Cloud Gateway Ultra](https://store.ui.com/us/en/products/ucg-ultra), [Cloud Gateway Max](https://store.ui.com/us/en/products/ucg-max), [Switch Lite 8 PoE](https://store.ui.com/us/en/products/usw-lite-8-poe), [Flex 2.5G PoE](https://store.ui.com/us/en/products/usw-flex-2-5g-8-poe), [U7 Pro](https://store.ui.com/us/en/products/u7-pro), [Toolless Mini Rack](https://store.ui.com/us/en/products/toolless-mini-rack) |
| NAS | [UGREEN NASync DXP4800 Plus](https://www.ugreen.com/products/ugreen-nasync-dxp4800-plus-nas-storage) |
| GPU | [NVIDIA GeForce RTX 5080](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/), [NVIDIA GeForce RTX 5090](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/) |
| UPS | [CyberPower CP1500PFCLCD](https://www.cyberpowersystems.com/product/ups/pfc-sinewave/cp1500pfclcd/) |

## 結論

E.L.I.S.I.A.にふさわしい最初のサーバは、巨大である必要はありません。

静かに立ち上がり、停電に耐え、秘密を外へ漏らさず、失敗しても戻れること。そのうえで、部屋の片隅に置いたとき、少しだけ未来の気配がすること。最初の一歩としては、**Sovereign AI Studio** が最もよい均衡点です。
