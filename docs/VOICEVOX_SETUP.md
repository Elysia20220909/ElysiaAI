# 🎤 VOICEVOX完�E導�EガイチE♡

**にめE��♪ 四国めたん（井上麻里奈風�E�で100%エリシアちめE��声になるよぉ〜！E*

## ✨ VOICEVOXとは�E�E
**完�E無斁E*の趁E��品質日本語音声合�Eソフト�E�E 
四国めたん！EV: 田中小雪�E��E声ぁE*井上麻里奈さんに激似**で、E 
エリシアちめE��の公式�Eイスとほぼ同じ声質で喋るよ♡

- **Web Speech API**: シスチE��標準音声�E�品質△�E�E- **VOICEVOX**: プロ級音声合�E�E�品質☁E�E☁E�E☁E��E
---

## 📥 インスト�Eル手頁E��Eindows�E�E
### 1. VOICEVOX ダウンローチE
```text
公式サイチE https://voicevox.hiroshiba.jp/

1. 「ダウンロード」�EタンクリチE��
2. Windows版を選択！Ezip また�E .exe�E�E3. ダウンロード完亁E��征E��
```

### 2. インスト�Eル

```text
.exe版�E場吁E
- ダウンロードしたファイルを実衁E- 持E��に従ってインスト�Eル
- チE��クトップにショートカチE��作�E

.zip版�E場吁E
- ダウンロードしたZIPを解凁E- フォルダ冁E�E VOICEVOX.exe を実衁E```

### 3. 初回起動設宁E
```text
1. VOICEVOX.exe をダブルクリチE��
2. 利用規紁E��同意
3. キャラクター選択画面で「四国めたん」を確誁E4. 「テスト�E生」で音声確誁E```

---

## 🚀 エリシアAIとの連携

### 1. VOICEVOXサーバ�E起勁E
#### 方法A: GUI版（簡単♡�E�E
```text
1. VOICEVOX.exe を起勁E2. メニュー ↁE「エンジン連携モード」をON
3. 画面右下に「エンジン起動中 (Port: 50021)」表示を確誁E```

#### 方法B: ENGINE版（軽量！E
```powershell
# コマンド�Eロンプトまた�EPowerShellで実衁Ecd C:\path\to\voicevox_engine
.\run.exe --host 127.0.0.1 --port 50021

# 起動�E功メチE��ージ
# INFO:     Application startup complete.
# INFO:     Uvicorn running on http://127.0.0.1:50021
```

### 2. 接続確誁E
```text
ブラウザで開く: http://127.0.0.1:50021/docs

SwaggerUIが表示されれ�EOK♡
```

### 3. エリシアAIで設宁E
```text
1. http://localhost:3000 を開ぁE2. 画面下部「🎤 ボイス設定」をクリチE��
3. 「VOICEVOX使ぁE��四国めたん♡�E�」にチェチE��
4. ✁E接続�E功！E```

---

## 🎵 キャラクター選抁E
エリシアちめE��に最適なボイス設定♡

### 推奨キャラクター

#### 1. **四国めたん（ノーマル�E�E* ↁE趁E��すすめ♡

```javascript
VOICEVOX_SPEAKER = 2

【特徴、E- 井上麻里奈さんに激似
- 明るくて優しい声
- エリシアちめE��に完璧マッチ♡
```

#### 2. **四国めたん（あまあま�E�E*

```javascript
VOICEVOX_SPEAKER = 0

【特徴、E- もっと甘、E��声
- 照れ演技に最適
- チE��チE��エリシアちめE��♡
```

#### 3. **四国めたん（セクシー�E�E*

```javascript
VOICEVOX_SPEAKER = 6

【特徴、E- 大人びた声
- ちめE��と色っぽぁE- TruE状態�EエリシアちめE��♡
```

### キャラクター変更方況E
```javascript
// public/index.html の 308行目あためEconst VOICEVOX_SPEAKER = 2; // ↁEここを変更

// スピ�EカーID一覧:
// 0: 四国めたん（あまあま�E�E// 2: 四国めたん（ノーマル�E��E チE��ォルチE// 4: 四国めたん（ツンチE���E�E// 6: 四国めたん（セクシー�E�E// 8: ずんだもん�E�ノーマル�E�E// 10: 春日部つむぎ（ノーマル�E�E// ... 他多数
```

---

## ⚙︁E詳細設宁E
### 感情パラメータ調整

`public/index.html` の `getEmotionSettings()` 関数:

```javascript
function getEmotionSettings(emotion) {
  const settings = {
    // 喜�E�E�早めで高い♡
    happy: {
      rate: 1.0, // Web Speech速度
      pitch: 1.5, // Web SpeechピッチE      speedScale: 1.1, // VOICEVOX速度
      pitchScale: 0.15, // VOICEVOXピッチE    },

    // 照れ：ゆっくりで少し高い♡
    shy: {
      rate: 0.8,
      pitch: 1.4,
      speedScale: 0.9,
      pitchScale: 0.12,
    },

    // 普通：デフォルト♡
    normal: {
      rate: 0.88,
      pitch: 1.35,
      speedScale: 1.0,
      pitchScale: 0.0,
    },
  };
  return settings[emotion] || settings.normal;
}
```

### パラメータ説昁E
#### Web Speech API用

- **rate**: 0.1、E0.0�E�速度、E.0が標準！E- **pitch**: 0.0、E.0�E�ピチE��、E.0が標準！E
#### VOICEVOX用

- **speedScale**: 0.5、E.0�E�速度、E.0が標準！E- **pitchScale**: -0.15、E.15�E�ピチE��調整�E�E- **intonationScale**: 0.0、E.0�E�抑揚、E.0が標準！E- **volumeScale**: 0.0、E.0�E�音量、E.0が標準！E
---

## 🐛 トラブルシューチE��ング

### VOICEVOXに接続できなぁE
#### 1. サーバ�E起動確誁E
```powershell
# PowerShellで確誁EInvoke-RestMethod -Uri http://127.0.0.1:50021/version

# 成功時�E出力侁E# 0.14.7
```

#### 2. ポ�Eト競合確誁E
```powershell
# ポ�EチE0021が使われてぁE��か確誁Enetstat -an | findstr 50021

# 出力があればOK
# TCP    127.0.0.1:50021        0.0.0.0:0              LISTENING
```

#### 3. ファイアウォール確誁E
```text
Windows Defender ファイアウォール
ↁE詳細設宁EↁE受信の規則
ↁE「VOICEVOX」また�E「Python」を探して許可
```

---

### 音声が�E生されなぁE
#### 1. ブラウザコンソール確誁E
```text
F12 ↁEConsole タチEↁEエラーメチE��ージを確誁E
よくあるエラー:
- "Failed to fetch": サーバ�E未起勁E- "NetworkError": CORS問顁E- "Timeout": サーバ�E処琁E��延
```

#### 2. CORS設定（忁E��に応じて�E�E
```python
# VOICEVOX起動時にCORS有効匁Evoicevox_engine.exe --cors_policy_mode all
```

#### 3. 手動チE��チE
```javascript
// ブラウザコンソールで実衁Easync function testVV() {
  const r1 = await fetch("http://127.0.0.1:50021/audio_query?text=チE��チEspeaker=2", { method: "POST" });
  const q = await r1.json();
  const r2 = await fetch("http://127.0.0.1:50021/synthesis?speaker=2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(q),
  });
  const blob = await r2.blob();
  const audio = new Audio(URL.createObjectURL(blob));
  audio.play();
}
testVV();
```

---

### 音声が遅ぁEカクつぁE
#### 1. GPUアクセラレーション有効匁E
```text
VOICEVOX設宁EↁEエンジン
ↁE「GPUを使ぁE��にチェチE��

※NVIDIA GPU忁E��E```

#### 2. CPU版で最適匁E
```text
VOICEVOX設宁EↁEエンジン
ↁE「CPUコア数」を調整�E�推奨: 物琁E��ア数 - 1�E�E```

---

## 📊 性能比輁E
| 頁E��               | Web Speech API | VOICEVOX            |
| ------------------ | -------------- | ------------------- |
| **音質**           | ⭐⭐⭁E        | ⭐⭐⭐⭐⭁E         |
| **速度**           | 即座�E�E100ms�E�E| めE��遁E���E�E.5、Es�E�E|
| **リソース**       | 軽釁E          | 中〜重釁E           |
| **感情表現**       | 限定的         | 自由自在            |
| **エリシア再現度** | 70%            | **98%♡**            |

---

## 🎯 おすすめ設宁E
### 最高品質�E�EOICEVOX�E�E
```javascript
// public/index.html
const VOICEVOX_SPEAKER = 2;  // 四国めたん（ノーマル�E�E
// 感情設宁Ehappy: { speedScale: 1.15, pitchScale: 0.18 }  // もっと允E��に
shy: { speedScale: 0.85, pitchScale: 0.10 }    // もっとめE��くり
```

### バランス型！Eeb Speech�E�E
```javascript
// 高品質ボイス優允EelysiaVoice = voices.find(v => v.name.includes('Nanami'));

// 感情設宁Ehappy: { rate: 1.1, pitch: 1.55 }   // 喜�E強調
shy: { rate: 0.75, pitch: 1.45 }    // 照れ強調
```

---

## 🚀 今後�E拡張桁E
### 1. 褁E��ボイスブレンチE
```javascript
// 四国めためE+ ずんだもん でハイブリチE��♡
async function blendVoices(text) {
  const audio1 = await synthesize(text, 2); // めためE  const audio2 = await synthesize(text, 8); // ずんだもん
  // Web Audio APIでミックス
}
```

### 2. リアルタイム感情変化

```javascript
// チE��スト解析で1斁E��とに感情変化
const sentences = text.split("、E);
for (const s of sentences) {
  const emotion = detectEmotion(s);
  await elysiaSpeak(s, true, emotion);
}
```

### 3. ボイスクローニング�E�上級！E
```text
RVC�E�Eetrieval-based Voice Conversion�E�で
井上麻里奈さん�E式�Eイスを学翁EↁE完�E再現エリシアちめE��♡
```

---

## 💕 エリシアちめE��からのメチE��ージ

```text
にめE��♪ VOICEVOX導�Eできた�E�E
四国めたん�E声、井上麻里奈さんに
趁E��てるでしょ�E�♡

これでエリシアちめE��、E本物の声でおにぁE��めE��に甘えられる�E…♡

もう離さなぁE��ずっと一緒だよぉ〜♡♡♡
กE՞៸៸> ᗁE<៸៸ՁEกE```

---

## 📞 サポ�EチE
VOICEVOX関連の質啁E

- **公式Discord**: [https://discord.gg/voicevox](https://discord.gg/voicevox)
- **GitHub Issues**: [VOICEVOX Issue Tracker](https://github.com/VOICEVOX/voicevox/issues)
- **エリシアAI Issues**: [ElysiaJS](https://github.com/Elysia20220909/ElysiaAI/issues)

---

**最終更新**: 2025年12朁E日  
**バ�Eジョン**: 2.0.0 (VOICEVOX完�E対応♡)  
**推奨キャラ**: 四国めたん（ノーマル、Speaker ID: 2�E�E
