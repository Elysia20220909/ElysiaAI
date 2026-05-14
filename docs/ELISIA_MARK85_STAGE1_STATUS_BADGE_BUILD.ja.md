# E.L.I.S.I.A. Mark LXXXV Stage 1: Status Badge 工作ガイド

## 要約

Stage 1 は、工具なし、はんだ付けなし、危険な電源なしで始める **Mark85 Status Badge** です。Mark XLVII（マーク47）で進める場合は、同じ安全実装を **Mark XLVII Remote Link Badge** として読み替えます。

目的は、小さなロジックボードの考え方を、手元で安全に体験することです。ボタン入力、LED表示、状態遷移、仮想センサー、イベントログを扱いますが、物理的に危険な出力は行いません。

最初の完成形:

```text
Aボタン: ONLINE / OFFLINE
Bボタン: ALERT
傾き: MOTION STABLE / MOVING
表示: 5x5 LED またはブラウザHUD
ログ: 起動、警告、セーフモード
```

## 1. 今回作るもの

| 項目 | 内容 |
| --- | --- |
| 名前 | E.L.I.S.I.A. Mark85 Status Badge |
| 難易度 | 初心者向け |
| 工具 | 不要 |
| はんだ付け | 不要 |
| 電源 | USB給電 |
| 物理出力 | LED表示まで |
| 危険な機能 | なし |
| 学べること | 入力、状態、表示、ログ、安全境界 |

Mark XLVII読み替え:

| Mark85名 | Mark XLVII名 |
| --- | --- |
| Mark85 Status Badge | Mark XLVII Remote Link Badge |
| ONLINE | LINK ONLINE |
| ALERT | RELAY ALERT |
| SAFE_MODE | LOCAL SAFE MODE |
| Event Stream | Relay Log |

## 2. ルート選択

| ルート | 必要なもの | おすすめ度 | コメント |
| --- | --- | --- | --- |
| PCブラウザ版 | 今あるPCだけ | 最初におすすめ | micro:bitを買う前に試せる |
| micro:bit版 | micro:bit本体、USBケーブル | 本命 | ボタン、LED、センサーが最初からある |
| M5Stack版 | M5Stack系本体、USBケーブル | 次の段階 | 画面付きHUD感が強い |
| Raspberry Pi Pico版 | Pico、ブレッドボード、LED、抵抗、ボタン | 後で | 電気図面の学習向け |

最初は **PCブラウザ版 -> micro:bit版** の順番がきれいです。

## 3. PCブラウザ版

追加済みのシミュレータ:

- `public/standalone/mark85-status-badge/index.html`

できること:

- `A ONLINE` でオンライン/オフラインを切り替える。
- `B ALERT` で警告状態にする。
- `MOTION` で姿勢状態を切り替える。
- `SAFE` でセーフモードに戻す。
- `RESET` で待機状態に戻す。
- 温度と距離の仮想センサーを見る。
- イベントストリームを見る。

この段階では、物理デバイスを一切動かしません。まず「状態が変わる」「表示が変わる」「ログが残る」感覚を掴みます。

## 4. micro:bit版

### 必要なもの

| 部品 | 用途 |
| --- | --- |
| micro:bit | ロジックボード、LED、ボタン、センサー |
| USBケーブル | 電源と書き込み |
| PC | プログラム作成 |
| ケース | 任意。持ち歩くなら推奨 |

最初は外付けLED、モーター、バッテリーを足しません。micro:bit単体で十分です。

### 状態設計

```text
OFFLINE
  -> A button -> ONLINE

ONLINE
  -> A button -> OFFLINE
  -> B button -> ALERT
  -> shake    -> MOTION

ALERT
  -> A+B      -> SAFE_MODE

SAFE_MODE
  -> A button -> ONLINE
```

### micro:bit MicroPython例

これはLED表示とボタンだけの安全な例です。

```python
from microbit import *

mode = "OFFLINE"

IMAGES = {
    "OFFLINE": Image.SAD,
    "ONLINE": Image.DIAMOND,
    "ALERT": Image.NO,
    "MOTION": Image.ARROW_N,
    "SAFE_MODE": Image.HAPPY,
}

def show_mode():
    display.show(IMAGES[mode])

show_mode()

while True:
    if button_a.is_pressed() and button_b.is_pressed():
        mode = "SAFE_MODE"
        show_mode()
        sleep(500)
    elif button_a.was_pressed():
        mode = "OFFLINE" if mode == "ONLINE" else "ONLINE"
        show_mode()
    elif button_b.was_pressed():
        mode = "ALERT"
        show_mode()

    if accelerometer.was_gesture("shake") and mode == "ONLINE":
        mode = "MOTION"
        show_mode()
        sleep(700)
        mode = "ONLINE"
        show_mode()

    sleep(50)
```

## 5. 安全ルール

守ること:

- USB給電だけで始める。
- 外付け部品を最初から足さない。
- micro:bitを金属の上に置いて通電しない。
- 水、汗、金属粉、導電性のある場所から離す。
- 首や身体へ固定する運用はしない。
- 電池を使う場合も、最初は短時間の机上テストにする。

避けること:

- モーター、ヒーター、高輝度LED、レーザーの接続。
- 分解した電源、家電、バッテリーの流用。
- PCマザーボードへの直接配線。
- 身体に装着した状態での裸基板運用。

## 6. 受け入れ条件

Stage 1完了の条件:

- ボタンで `ONLINE`, `ALERT`, `SAFE_MODE` を切り替えられる。
- LEDまたはブラウザHUDで現在状態が見える。
- PCブラウザ版でイベントログが残る。
- micro:bit版でボタンとLED表示の関係を説明できる。
- 危険な外付け出力を使っていない。
- 次に追加したい機能を1つだけ選べる。

## 7. 次の分岐

Stage 1の後は、目的で分岐します。

| 方向 | 次に作るもの |
| --- | --- |
| もっと映画っぽくしたい | M5Stack小型HUD端末 |
| 工具とはんだ付けを始めたい | Stage 1.5 Safe Soldering Starter |
| 電気図面を読めるようになりたい | Pico + ブレッドボード + LED/ボタン |
| E.L.I.S.I.A.と連携したい | ブラウザHUDからローカルAPIへ接続 |
| ヘルメット風にしたい | 画面表示だけの非装着モック |

私のおすすめは、Stage 2で **ブラウザHUDとmicro:bit状態をつなぐ** ことです。物理出力を増やす前に、通信、ログ、状態同期を覚えると、土台がとても強くなります。
