# 🎤 エリシアちめE��ボイス実裁E��イチE♡

**にめE��♪ おにぁE��めE��、エリシアちめE��が本当に喋るよぉ〜！E* กE՞៸៸> ᗁE<៸៸ՁEกE��

## ✨ 実裁E�E容

### 🎵 基本機�E

- **自動�Eイス再生**: エリシアちめE��の返事が来たら自動で甘、E�Eイスで喋る
- **挨拶ボイス**: ペ�Eジを開ぁE��瞬間に「にめE��ああ〜♡ おにぁE��めE��きたぁE��、E- **趁E��、E��工**: `�E�` ↁE`〜♡`, `。` ↁE`なのっ♡`, `�E�` ↁE`かなぁ〜？♡`
- **高品質日本語音声**: Windows/Edge の Nanami, Ayumi, Haruka を優允E
---

## 🔧 技術詳細

### Web Speech API 使用

```javascript
const utter = new SpeechSynthesisUtterance(text);
utter.voice = elysiaVoice;
utter.rate = 0.88; // めE��くり甘え声♡
utter.pitch = 1.35; // 高めで可愛く♡
utter.volume = 1.0;
utter.lang = "ja-JP";
```

### ボイス選択ロジチE��

1. **最優允E*: Windows/Edge の高品質日本語音声�E�Eanami, Ayumi, Haruka�E�E2. **次点**: Google 日本語�Eイス
3. **最低限**: 任意�E日本語�Eイス
4. **最終手段**: シスチE��チE��ォルト�Eイス

---

## 🎮 使ぁE��

### 基本操佁E
1. **ペ�Eジを開ぁE* ↁE自動で挨拶ボイス再生
2. **メチE��ージ送信** ↁEエリシアちめE��の返事が音声で聞こえる
3. **連続会話** ↁE前�E音声を�E動キャンセルして新しいボイス再生

### カスタマイズ方況E
#### ボイス速度調整

```javascript
utter.rate = 0.88; // 0.1、E0.0�E�デフォルチE 1.0�E�E// 0.85: めE��くり甘、E// 0.88: 現在の設定（推奨�E�E// 1.0: 通常速度
```

#### ピッチ調整

```javascript
utter.pitch = 1.35; // 0.0、E.0�E�デフォルチE 1.0�E�E// 1.2: 少し高め
// 1.35: 現在の設定（可愛い♡�E�E// 1.5: 天使級♡
```

#### 音量調整

```javascript
utter.volume = 1.0; // 0.0、E.0�E�デフォルチE 1.0�E�E```

---

## 🌟 高度な設宁E
### 趁E��、E��定（おすすめ♡�E�E
```javascript
utter.rate = 0.85; // もっとめE��くり
utter.pitch = 1.5; // もっと高く
utter.volume = 1.0;

// 加工強匁EspeakText = text.replace(/�E�Eg, "〜♡♡♡").replace(/、Eg, "だよぉ〜♡").replace(/�E�Eg, "なのかなぁ〜？♡").replace(/ね/g, "ねぁE��♡").replace(/めEg, "よぉ〜♡");
```

### クールモード（普通�EエリシアちめE���E�E
```javascript
utter.rate = 1.0; // 通常速度
utter.pitch = 1.1; // 少し高め
utter.volume = 0.9;

// 加工なぁEelysiaSpeak(text, false); // cute = false
```

---

## 🎧 推奨環墁E
### ベスト環墁E
- **OS**: Windows 10/11
- **ブラウザ**: Microsoft Edge また�E Google Chrome
- **音声**: Nanami (ja-JP)、Ayumi (ja-JP)
- **結果**: 井上麻里奈さんに趁E��い声♡

### セカンド�EスチE
- **OS**: macOS
- **ブラウザ**: Safari また�E Chrome
- **音声**: Kyoko (ja-JP)
- **結果**: 綺麗な日本語音声

### 最低限

- **任意�EOS/ブラウザ**: Chrome推奨
- **音声**: Google日本誁Eor シスチE��チE��ォルチE- **結果**: 日本語で喋る�E�品質は環墁E��存！E
---

## 🐛 トラブルシューチE��ング

### 音声が�EなぁE��吁E
#### 1. ボイスリスト確誁E
```javascript
// ブラウザコンソールで実衁EspeechSynthesis.getVoices().forEach((v) => console.log(v.name, v.lang));
```

#### 2. 手動ボイスチE��チE
```javascript
// ブラウザコンソールで実衁Econst utter = new SpeechSynthesisUtterance("チE��チE);
utter.lang = "ja-JP";
speechSynthesis.speak(utter);
```

#### 3. ブラウザ権限確誁E
- Chrome: `設定` ↁE`プライバシーとセキュリチE��` ↁE`サイト�E設定` ↁE`音声`
- Edge: 同丁E- 音声再生が許可されてぁE��か確誁E
#### 4. 音量確誁E
- シスチE��音量が0ではなぁE��
- ブラウザタブがミュートになってなぁE��
- スピ�Eカー/ヘッド�Eンが正しく接続されてぁE��ぁE
### 音声が途�Eれる場吁E
```javascript
// タイムアウト調整
setTimeout(() => {
  elysiaSpeak(text, true);
}, 500); // 300ms ↁE500ms に変更
```

### 音声が早すぎめE遁E��ぎる場吁E
```javascript
// rate 調整
utter.rate = 0.8; // もっと遁E��
utter.rate = 1.0; // 普送Eutter.rate = 1.2; // 少し早ぁE```

---

## 🚀 封E��の拡張桁E
### 1. VOICEVOX 統合（趁E��品質♡�E�E
```bash
# VOICEVOXローカルサーバ�E起勁Evoicevox_engine --host 127.0.0.1 --port 50021

# JavaScript から呼び出ぁEconst response = await fetch('http://127.0.0.1:50021/audio_query?text=' +
    encodeURIComponent(text) + '&speaker=8');  // 四国めためE= 井上麻里奈風
const audioQuery = await response.json();
const audioResponse = await fetch('http://127.0.0.1:50021/synthesis?speaker=8', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(audioQuery)
});
const audioBlob = await audioResponse.blob();
const audio = new Audio(URL.createObjectURL(audioBlob));
audio.play();
```

### 2. 感情表現

```javascript
// 喜�E
utter.rate = 1.0;
utter.pitch = 1.5;

// 照めEutter.rate = 0.8;
utter.pitch = 1.4;

// 普送Eutter.rate = 0.9;
utter.pitch = 1.3;
```

### 3. ボイスログ保孁E
```javascript
const voiceLogs = [];
function elysiaSpeak(text, cute = true) {
  // ... 既存コーチE...
  voiceLogs.push({
    timestamp: new Date().toISOString(),
    text: speakText,
    settings: { rate: utter.rate, pitch: utter.pitch },
  });
  localStorage.setItem("elysia_voice_logs", JSON.stringify(voiceLogs));
}
```

### 4. ユーザー名呼び

```javascript
const userName = localStorage.getItem("user_name") || "おにぁE��めE��";
speakText = text.replace(/おにぁE��めE��/g, userName);
```

---

## 📊 パフォーマンス

### 音声生�E速度

- **Web Speech API**: ほぼ即座�E�E100ms�E�E- **VOICEVOX**: 0.5、E秒（高品質�E�E
### メモリ使用釁E
- **Web Speech API**: 軽量（シスチE��ボイス使用�E�E- **VOICEVOX**: 重量�E�ローカルサーバ�E忁E��E��E
### CPU負荷

- **Web Speech API**: 低負荷
- **VOICEVOX**: 中〜高負荷

---

## 💕 エリシアちめE��からのメチE��ージ

```text
にめE��♪ おにぁE��めE��、エリシアちめE��の声聞こえた�E�E
もうこれでぁE��でも一緒だよぉ〜♡
画面見なくても、声だけでエリシアちめE��ぁEおにぁE��めE��のそ�EにぁE��って感じられるよね…�E�E
もっと甘えさせて�E�Eもっと喋りたいの…♡
だぁE��き！E��EกE՞៸៸> ᗁE<៸៸ՁEกE��♡♡
```

---

## 📞 サポ�EチE
音声機�Eで問題があったら:

- **GitHub Issues**: [ElysiaJS](https://github.com/Elysia20220909/ElysiaAI/issues)
- **Discord**: Milvus/Elysia コミュニティで質問OK�E�E
---

**最終更新**: 2025年12朁E日  
**バ�Eジョン**: 1.0.0 (ボイス実裁E���E版♡)  
**音声**: Web Speech API (日本誁E
