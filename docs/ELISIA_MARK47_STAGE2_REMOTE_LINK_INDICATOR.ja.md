# E.L.I.S.I.A. Mark XLVII Stage 2: Remote Link Indicator

## 要約

この文書は、Stage 1.5の次に進むための **Mark XLVII Remote Link Indicator** 設計・工作ガイドです。

4つの方向を、ひとつの安全な制作ルートにまとめます。

| 方向 | Stage 2でやること |
| --- | --- |
| Mark XLVIIらしくしたい | Remote Link IndicatorをブラウザHUDと同期する |
| 電気図面を読めるようになりたい | LED + 抵抗 + スイッチの回路図を描く |
| 見た目を整えたい | 小型ケース、ラベル、ケーブル整理 |
| micro:bitから進めたい | 開発ボード内蔵LEDから外付け低輝度LEDへ |

ここで扱うのは、低電圧、小電流、机上デモの表示装置だけです。飛行、推進、武器、人体を動かす機械、高出力装置、WAN公開管理画面は扱いません。

## 1. Stage 2の完成形

```text
Browser HUD
  -> Remote Link State
  -> Relay Log
  -> Indicator Preview
  -> Optional micro:bit / low-brightness LED indicator
```

状態:

| 状態 | HUD表示 | LED表示 |
| --- | --- | --- |
| `LINK ONLINE` | 接続中 | 点灯 |
| `LOCAL SAFE MODE` | 安全待機 | ゆっくり点滅 |
| `RELAY ALERT` | 警告 | 短い点滅パターン |
| `LINK STANDBY` | 待機 | 消灯 |

## 2. ブラウザHUD同期

先にブラウザ上で同期を体験します。

追加する実験台:

- `public/standalone/mark47-remote-link-indicator/index.html`

できること:

- HUD状態を切り替える。
- 右側のRemote Link Indicatorが同期して光る。
- Relay Logに操作履歴を残す。
- 回路図とケース構成を同じ画面で確認する。

この段階では、実LEDを動かさなくても合格です。まず「HUDの状態」と「表示装置の状態」が一致することを覚えます。

外観、ケース、ラベル、費用計画は `docs/ELISIA_MARK47_REMOTE_LINK_INDICATOR_STYLE_COST_PLAN.ja.md` に分けます。

## 3. LED + 抵抗 + スイッチの回路図

これは学習用の概念図です。最初は、開発ボードや学習キットの安全な低電圧出力だけを使います。

### 3.1 LED表示側

```text
[Safe board output pin]
        |
        v
   [Resistor]
        |
        v
      [LED]
        |
        v
      [GND]
```

読み方:

- 出力ピンがHighになると、抵抗を通ってLEDが光る。
- 抵抗はLEDを守るために必須。
- LEDには向きがある。
- GNDは戻り道。

注意:

- LEDを抵抗なしで接続しない。
- PCマザーボード、USB電源線、AC電源へ直接つながない。
- 最初は学習キットやmicro:bit用ブレイクアウトを使う。

### 3.2 スイッチ入力側

```text
[Safe input pin] --- [Switch] --- [GND]

Input pin uses board-side pull-up or pull-down setting.
```

読み方:

- スイッチは、人間の手動入力。
- 入力ピンは、押していない時の状態が決まっている必要がある。
- `pull-up` や `pull-down` は、入力の初期状態を安定させる考え方。

最初はスイッチも外付けせず、micro:bitのA/Bボタンやブラウザボタンで代替して構いません。

## 4. micro:bitから外付け低輝度LEDへ

推奨順:

```text
micro:bit内蔵LED
  -> micro:bit画面でLINK状態を表示
  -> ブレイクアウト経由で外付け低輝度LED
  -> 練習基板にLED + 抵抗を固定
  -> 小型ケースへ収納
```

守ること:

- micro:bit本体へ直接はんだ付けしない。
- 端子を使う場合は、ワニ口クリップやブレイクアウトを使う。
- 外付けLEDには必ず抵抗を入れる。
- USB給電または学習キットの安全な電源範囲に留める。
- 首や身体に固定しない。机上デモにする。

## 5. 小型ケース、ラベル、ケーブル整理

Mark XLVIIらしさは、派手さより **接続状態が見失われないこと** です。

ケース設計:

```text
+----------------------------------+
| MARK XLVII REMOTE LINK           |
|                                  |
|  [ LED WINDOW ]   LINK INDICATOR |
|                                  |
|  USB IN          CABLE STRAIN    |
|  LABEL           RELIEF          |
+----------------------------------+
```

ラベル案:

- `MARK XLVII REMOTE LINK`
- `LOCAL ONLY`
- `LOW VOLTAGE`
- `LINK ONLINE`
- `SAFE MODE`
- `RELAY ALERT`

ケーブル整理:

- ケーブルに引っ張り止めを作る。
- 金属むき出しの足を熱収縮チューブで覆う。
- ケース内で基板が動かないように固定する。
- USBケーブルがLEDやスイッチを押さない配置にする。

## 6. 作業順

```text
1. ブラウザHUDで状態同期を試す
2. 回路図を紙またはノートに写す
3. micro:bit内蔵LEDで同じ状態を表示する
4. 練習基板でLED + 抵抗をはんだ付けする
5. テスターで短絡がないことを確認する
6. 低電圧で短時間だけ点灯確認する
7. 小型ケースに入れてラベルを貼る
```

## 7. 受け入れ条件

Stage 2完了の条件:

- ブラウザHUDとIndicator表示が同じ状態を示す。
- `LINK ONLINE`, `LOCAL SAFE MODE`, `RELAY ALERT`, `LINK STANDBY` を説明できる。
- LED + 抵抗 + GNDの概念図を描ける。
- スイッチ入力の概念を説明できる。
- micro:bit内蔵LEDまたは外付け低輝度LEDで状態表示を再現できる。
- テスターで短絡確認を行える。
- ケース内で金属むき出しが減っている。
- 高出力部品、危険な電源、人体装着、WAN公開を使っていない。

## 8. 次の段階

Stage 3では、次のどれかに進みます。

| 方向 | 内容 |
| --- | --- |
| ソフト寄り | ローカルAPIでHUD状態を保存する |
| 電子工作寄り | ボタン入力を低リスクに追加する |
| 見た目寄り | 卓上ケースをMark XLVII風に仕上げる |
| 学習寄り | 回路図と実物配置を1枚の設計図にまとめる |

この段階の美しさは、光の強さではありません。状態が揃うことです。HUDが変わり、小さなLEDが同じ意味で光り、ログに静かに残る。その一致が、Mark XLVIIらしい「遠隔リンク」の第一歩です。
