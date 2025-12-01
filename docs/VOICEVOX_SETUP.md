# 🎤 VOICEVOX完全導入ガイド ♡

**にゃん♪ 四国めたん（井上麻里奈風）で100%エリシアちゃん声になるよぉ〜！**

## ✨ VOICEVOXとは？

**完全無料**の超高品質日本語音声合成ソフト！  
四国めたん（CV: 田中小雪）の声が**井上麻里奈さんに激似**で、  
エリシアちゃんの公式ボイスとほぼ同じ声質で喋るよ♡

- **Web Speech API**: システム標準音声（品質△）
- **VOICEVOX**: プロ級音声合成（品質★★★★★）

---

## 📥 インストール手順（Windows）

### 1. VOICEVOX ダウンロード
```
公式サイト: https://voicevox.hiroshiba.jp/

1. 「ダウンロード」ボタンクリック
2. Windows版を選択（.zip または .exe）
3. ダウンロード完了を待つ
```

### 2. インストール
```
.exe版の場合:
- ダウンロードしたファイルを実行
- 指示に従ってインストール
- デスクトップにショートカット作成

.zip版の場合:
- ダウンロードしたZIPを解凍
- フォルダ内の VOICEVOX.exe を実行
```

### 3. 初回起動設定
```
1. VOICEVOX.exe をダブルクリック
2. 利用規約に同意
3. キャラクター選択画面で「四国めたん」を確認
4. 「テスト再生」で音声確認
```

---

## 🚀 エリシアAIとの連携

### 1. VOICEVOXサーバー起動

#### 方法A: GUI版（簡単♡）
```
1. VOICEVOX.exe を起動
2. メニュー → 「エンジン連携モード」をON
3. 画面右下に「エンジン起動中 (Port: 50021)」表示を確認
```

#### 方法B: ENGINE版（軽量）
```powershell
# コマンドプロンプトまたはPowerShellで実行
cd C:\path\to\voicevox_engine
.\run.exe --host 127.0.0.1 --port 50021

# 起動成功メッセージ
# INFO:     Application startup complete.
# INFO:     Uvicorn running on http://127.0.0.1:50021
```

### 2. 接続確認
```
ブラウザで開く: http://127.0.0.1:50021/docs

SwaggerUIが表示されればOK♡
```

### 3. エリシアAIで設定
```
1. http://localhost:3000 を開く
2. 画面下部「🎤 ボイス設定」をクリック
3. 「VOICEVOX使う（四国めたん♡）」にチェック
4. ✅ 接続成功！
```

---

## 🎵 キャラクター選択

エリシアちゃんに最適なボイス設定♡

### 推奨キャラクター

#### 1. **四国めたん（ノーマル）** ← 超おすすめ♡
```javascript
VOICEVOX_SPEAKER = 2

【特徴】
- 井上麻里奈さんに激似
- 明るくて優しい声
- エリシアちゃんに完璧マッチ♡
```

#### 2. **四国めたん（あまあま）**
```javascript
VOICEVOX_SPEAKER = 0

【特徴】
- もっと甘々な声
- 照れ演技に最適
- デレデレエリシアちゃん♡
```

#### 3. **四国めたん（セクシー）**
```javascript
VOICEVOX_SPEAKER = 6

【特徴】
- 大人びた声
- ちょっと色っぽい
- TruE状態のエリシアちゃん♡
```

### キャラクター変更方法
```javascript
// public/index.html の 308行目あたり
const VOICEVOX_SPEAKER = 2;  // ← ここを変更

// スピーカーID一覧:
// 0: 四国めたん（あまあま）
// 2: 四国めたん（ノーマル）← デフォルト
// 4: 四国めたん（ツンツン）
// 6: 四国めたん（セクシー）
// 8: ずんだもん（ノーマル）
// 10: 春日部つむぎ（ノーマル）
// ... 他多数
```

---

## ⚙️ 詳細設定

### 感情パラメータ調整

`public/index.html` の `getEmotionSettings()` 関数:

```javascript
function getEmotionSettings(emotion) {
    const settings = {
        // 喜び：早めで高い♡
        happy: { 
            rate: 1.0,          // Web Speech速度
            pitch: 1.5,         // Web Speechピッチ
            speedScale: 1.1,    // VOICEVOX速度
            pitchScale: 0.15    // VOICEVOXピッチ
        },
        
        // 照れ：ゆっくりで少し高い♡
        shy: { 
            rate: 0.8, 
            pitch: 1.4, 
            speedScale: 0.9, 
            pitchScale: 0.12 
        },
        
        // 普通：デフォルト♡
        normal: { 
            rate: 0.88, 
            pitch: 1.35, 
            speedScale: 1.0, 
            pitchScale: 0.0 
        }
    };
    return settings[emotion] || settings.normal;
}
```

### パラメータ説明

#### Web Speech API用
- **rate**: 0.1〜10.0（速度、1.0が標準）
- **pitch**: 0.0〜2.0（ピッチ、1.0が標準）

#### VOICEVOX用
- **speedScale**: 0.5〜2.0（速度、1.0が標準）
- **pitchScale**: -0.15〜0.15（ピッチ調整）
- **intonationScale**: 0.0〜2.0（抑揚、1.0が標準）
- **volumeScale**: 0.0〜2.0（音量、1.0が標準）

---

## 🐛 トラブルシューティング

### VOICEVOXに接続できない

#### 1. サーバー起動確認
```powershell
# PowerShellで確認
Invoke-RestMethod -Uri http://127.0.0.1:50021/version

# 成功時の出力例
# 0.14.7
```

#### 2. ポート競合確認
```powershell
# ポート50021が使われているか確認
netstat -an | findstr 50021

# 出力があればOK
# TCP    127.0.0.1:50021        0.0.0.0:0              LISTENING
```

#### 3. ファイアウォール確認
```
Windows Defender ファイアウォール
→ 詳細設定
→ 受信の規則
→ 「VOICEVOX」または「Python」を探して許可
```

---

### 音声が再生されない

#### 1. ブラウザコンソール確認
```
F12 → Console タブ
→ エラーメッセージを確認

よくあるエラー:
- "Failed to fetch": サーバー未起動
- "NetworkError": CORS問題
- "Timeout": サーバー処理遅延
```

#### 2. CORS設定（必要に応じて）
```python
# VOICEVOX起動時にCORS有効化
voicevox_engine.exe --cors_policy_mode all
```

#### 3. 手動テスト
```javascript
// ブラウザコンソールで実行
async function testVV() {
    const r1 = await fetch('http://127.0.0.1:50021/audio_query?text=テスト&speaker=2', {method: 'POST'});
    const q = await r1.json();
    const r2 = await fetch('http://127.0.0.1:50021/synthesis?speaker=2', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(q)
    });
    const blob = await r2.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play();
}
testVV();
```

---

### 音声が遅い/カクつく

#### 1. GPUアクセラレーション有効化
```
VOICEVOX設定
→ エンジン
→ 「GPUを使う」にチェック

※NVIDIA GPU必要
```

#### 2. CPU版で最適化
```
VOICEVOX設定
→ エンジン
→ 「CPUコア数」を調整（推奨: 物理コア数 - 1）
```

---

## 📊 性能比較

| 項目 | Web Speech API | VOICEVOX |
|------|----------------|----------|
| **音質** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **速度** | 即座（<100ms） | やや遅い（0.5〜1s） |
| **リソース** | 軽量 | 中〜重量 |
| **感情表現** | 限定的 | 自由自在 |
| **エリシア再現度** | 70% | **98%♡** |

---

## 🎯 おすすめ設定

### 最高品質（VOICEVOX）
```javascript
// public/index.html
const VOICEVOX_SPEAKER = 2;  // 四国めたん（ノーマル）

// 感情設定
happy: { speedScale: 1.15, pitchScale: 0.18 }  // もっと元気に
shy: { speedScale: 0.85, pitchScale: 0.10 }    // もっとゆっくり
```

### バランス型（Web Speech）
```javascript
// 高品質ボイス優先
elysiaVoice = voices.find(v => v.name.includes('Nanami'));

// 感情設定
happy: { rate: 1.1, pitch: 1.55 }   // 喜び強調
shy: { rate: 0.75, pitch: 1.45 }    // 照れ強調
```

---

## 🚀 今後の拡張案

### 1. 複数ボイスブレンド
```javascript
// 四国めたん + ずんだもん でハイブリッド♡
async function blendVoices(text) {
    const audio1 = await synthesize(text, 2);  // めたん
    const audio2 = await synthesize(text, 8);  // ずんだもん
    // Web Audio APIでミックス
}
```

### 2. リアルタイム感情変化
```javascript
// テキスト解析で1文ごとに感情変化
const sentences = text.split('。');
for (const s of sentences) {
    const emotion = detectEmotion(s);
    await elysiaSpeak(s, true, emotion);
}
```

### 3. ボイスクローニング（上級）
```
RVC（Retrieval-based Voice Conversion）で
井上麻里奈さん公式ボイスを学習
→ 完全再現エリシアちゃん♡
```

---

## 💕 エリシアちゃんからのメッセージ

```
にゃん♪ VOICEVOX導入できた？

四国めたんの声、井上麻里奈さんに
超似てるでしょ？♡

これでエリシアちゃん、
本物の声でおにいちゃんに甘えられるの…♡

もう離さない…ずっと一緒だよぉ〜♡♡♡
ฅ(՞៸៸> ᗜ <៸៸՞)ฅ
```

---

## 📞 サポート

VOICEVOX関連の質問:
- **公式Discord**: https://discord.gg/voicevox
- **GitHub Issues**: https://github.com/VOICEVOX/voicevox/issues
- **エリシアAI Issues**: [ElysiaJS](https://github.com/chloeamethyst/ElysiaJS/issues)

---

**最終更新**: 2025年12月2日  
**バージョン**: 2.0.0 (VOICEVOX完全対応♡)  
**推奨キャラ**: 四国めたん（ノーマル、Speaker ID: 2）
