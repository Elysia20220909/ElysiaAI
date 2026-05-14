# E.L.I.S.I.A. Mark XLVII Remote Link Indicator 美観・費用・工作計画

## 要約

この文書は、**Mark XLVII Remote Link Indicator** を「安全に作る」だけでなく、机の上に置いて美しく見える小型リンク端末として仕上げるための設計・工作・費用ガイドです。

目標は、派手な装置ではありません。小さく、低電圧で、状態が読みやすく、ケーブルまで整った **ローカル専用の支援HUDアクセサリ** です。

ここでは、飛行、推進、武器、人体を動かす機械、高出力装置、WAN公開管理画面は扱いません。

## 1. コンセプト

Mark XLVIIらしさは、次の4つで作ります。

| 要素 | 表現 |
| --- | --- |
| Remote Link | 離れたHUD状態を小さなLEDで受ける |
| Relay Log | 状態変化をログとして残す |
| Standby Beauty | 待機中も静かに美しい |
| Local Only | LAN/localhost中心で、外へ開かない |

設計イメージ:

```text
Browser HUD
  -> LINK ONLINE / LOCAL SAFE / RELAY ALERT
  -> Remote Link Indicator
  -> low-brightness LED + clean enclosure
```

## 2. 外観デザイン

おすすめは、**小さな黒い通信ビーコン** です。

配色:

| 色 | 用途 |
| --- | --- |
| マットブラック | ケース本体 |
| ガンメタル | ラベル、ネジ、縁取り |
| シアン | LINK ONLINE |
| アンバー | LOCAL SAFE MODE |
| 赤 | RELAY ALERT |
| 白 | 小さな文字、ラベル |

避けること:

- 全体を赤金だけにしすぎる。
- LEDを眩しくしすぎる。
- ラベルを多く貼りすぎる。
- ケーブルをそのまま散らす。
- 裸基板を見せっぱなしにする。

## 3. ケース設計

卓上ケースとして、次の構成にします。

```text
+------------------------------------------------+
| MARK XLVII REMOTE LINK                         |
|                                                |
|        [ diffused LED window ]                 |
|                                                |
| LINK ONLINE / LOCAL SAFE / RELAY ALERT         |
|                                                |
| USB IN                         LOCAL ONLY      |
+------------------------------------------------+
```

推奨サイズ:

| 項目 | 目安 |
| --- | --- |
| 幅 | 70から110 mm |
| 奥行き | 45から75 mm |
| 高さ | 20から40 mm |
| LED窓 | 8から20 mm |
| ケーブル出口 | 背面または側面 |

見た目のポイント:

- LEDは直射ではなく、白色または乳白色の拡散板越しに見せる。
- ケースにはゴム足を貼って、机から少し浮かせる。
- ラベルは `MARK XLVII REMOTE LINK` だけ大きめにし、他は小さくする。
- USBケーブルは短め、黒またはグレーのものを選ぶ。
- 内部の配線は熱収縮チューブで色をまとめる。

## 4. 材料リスト

| 分類 | 品目 | 用途 |
| --- | --- | --- |
| コア | micro:bit / Pico / M5Stack | 状態表示の中核 |
| 表示 | 低輝度LED | LINK状態を光で示す |
| 保護 | 抵抗 | LED保護 |
| 入力 | タクトスイッチ | 任意。手動切替 |
| 基板 | 練習基板 / ユニバーサル基板 | LEDと抵抗の固定 |
| 絶縁 | 熱収縮チューブ | むき出し金属を減らす |
| 外装 | 小型ケース | 卓上端末化 |
| 見た目 | ラベル、ステッカー、拡散板 | Mark XLVII感 |
| 整線 | ケーブルタイ、ケーブルスリーブ | ケーブル整理 |
| 足元 | ゴム足 | 机上で安定させる |

## 5. 費用目安

価格は変動します。以下は2026-05-14時点で確認した公開価格と、周辺部品を含めた概算です。

| ルート | 内容 | 目安 |
| --- | --- | --- |
| PCだけ | ブラウザHUDのみ | 0円 |
| micro:bit最小 | micro:bit V2 + USBケーブル/簡易ケース | 約5,000から7,000円 |
| Pico低予算 | Raspberry Pi Pico W + LED/抵抗/スイッチ/基板 | 約2,500から5,000円 |
| はんだ練習 | スターター工具 + 練習部品 | 約7,000から12,000円 |
| こて重視 | 温調はんだごて + 周辺工具 | 約16,000から25,000円 |
| M5Stack小型HUD | M5Stack Core2系 + ケーブル/ケース | 約9,000から13,000円 |
| おしゃれ仕上げ | ケース、拡散板、ラベル、ケーブル整理込み | 上記に+1,500から5,000円 |

参考価格:

- micro:bit V2: RobotShopで `¥4,687` 表示。
- Raspberry Pi Pico W: スイッチサイエンスで `¥1,342` 表示。ただし確認時点では売り切れ表示。
- M5Stack Core2 v1.3: スイッチサイエンスで `¥8,030` 表示。
- DFRobot Soldering Starter Tool Set: RobotShopで `¥6,531` 表示。
- HAKKO FX600D系温調はんだごて: WAFUU JAPANで `¥15,680` 表示。

## 6. おすすめ構成

### A. いちばん安全で安い

```text
PCブラウザHUD
  + Mark XLVII Remote Link Indicator simulator
```

費用:

- 0円。

向いている人:

- まず見た目と状態遷移を作りたい。
- micro:bitや工具を買う前に雰囲気を確認したい。

### B. micro:bitで進める

```text
micro:bit
  + 内蔵LED
  + A/Bボタン
  + 簡易ケース
```

費用:

- 約5,000から7,000円。

良い点:

- はんだ付けなしで動く。
- LED、ボタン、センサーが内蔵されている。
- Stage 2の「リンク状態表示」に直結する。

### C. はんだ付け練習込み

```text
開発ボード
  + 練習基板
  + LED
  + 抵抗
  + スイッチ
  + 小型ケース
```

費用:

- 工具なしなら部品だけで約2,000から5,000円。
- 工具込みなら約8,000から20,000円以上。

良い点:

- 電気図面、導通確認、ケース固定まで学べる。
- Mark XLVIIの「実体のある小型リンク端末」になる。

### D. 見た目重視

```text
M5Stack Core2
  + 小型画面HUD
  + ケース加工なし
  + ブラウザHUD風UI
```

費用:

- 約9,000から13,000円。

良い点:

- 画面付きで一気にSF感が出る。
- ケース入りなので見た目が整いやすい。
- はんだ付け前の「おしゃれ端末」として強い。

## 7. 制作順

```text
1. ブラウザ版で配色と状態を決める
2. ケースのサイズとラベルを紙に描く
3. micro:bitまたはM5Stackで表示だけ試す
4. LED + 抵抗 + スイッチの回路図を描く
5. 練習基板にはんだ付けする
6. テスターで短絡確認する
7. ケースに入れてケーブルを固定する
8. 最後にラベルと拡散板を整える
```

## 8. ラベル文言

大きいラベル:

```text
MARK XLVII REMOTE LINK
```

小さいラベル:

```text
LOCAL ONLY
LOW VOLTAGE
LINK ONLINE
LOCAL SAFE MODE
RELAY ALERT
NO PHYSICAL ACTUATION
```

日本語併記するなら:

```text
ローカル専用
低電圧
安全待機
中継警告
物理駆動なし
```

## 9. 仕上げチェック

| 項目 | 合格条件 |
| --- | --- |
| LED | 眩しすぎず、状態が読める |
| ケース | 角が痛くなく、机上で安定する |
| ケーブル | 引っ張っても基板に直接力がかからない |
| ラベル | 近くで読めて、貼りすぎていない |
| 内部 | 金属むき出しが少ない |
| 電源 | USBまたは安全な開発ボード範囲 |
| 運用 | 身体に固定しない、机上デモ |

## 10. 出典と価格確認

価格は購入前に必ず販売ページで確認します。本文の価格は、2026-05-14に確認した参考値です。

- [RobotShop: Cytron BBC micro:bit メインボード V2](https://jp.robotshop.com/products/cytron-bbc-microbit-mainboard-v2)
- [スイッチサイエンス: Raspberry Pi Pico W](https://www.switch-science.com/products/8171)
- [スイッチサイエンス: M5Stack Core](https://www.switch-science.com/collections/lp-m5stack-core)
- [RobotShop: DFRobot Soldering Starter Tool Set](https://jp.robotshop.com/en/products/dfrobot-soldering-starter-tool-set)
- [WAFUU JAPAN: HAKKO FX600D-813](https://wafuu.com/products/hakko-digital-temperature-controlled-soldering-iron-fx600d-813-temperature-range-200-540-c-flat-plug-ac100v)

## 11. 結論

最初のおすすめは、**PCブラウザ版で外観を決めてから、micro:bitまたは低輝度LEDの小型ケースに進む** ルートです。

Mark XLVIIらしさは、大きさや出力ではなく、整ったリンク状態にあります。小さなケース、静かなLED、短いケーブル、読めるラベル。それだけで、机の上にちゃんと「遠隔リンク端末」の気配が生まれます。
