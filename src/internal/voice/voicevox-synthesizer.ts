/**
 * VOICEVOX 音声合成モジュール
 * テキストを音声に変換し、タイムスタンプ付きで出力
 */

export interface VoiceSynthesisRequest {
  text: string;
  speakerId: number;
  speed?: number;
  pitch?: number;
  intonation?: number;
}

export interface AudioFrame {
  timestamp: number;
  frequency: number;
  amplitude: number;
}

export interface LipSyncData {
  timestamp: number;
  mouthOpen: number; // 0.0 ~ 1.0
  mouthShape: 'a' | 'i' | 'u' | 'e' | 'o' | 'neutral';
}

export class VoicexoxSynthesizer {
  private voicevoxUrl: string;
  private currentSpeakerId: number;
  private audioContext: AudioContext | null = null;

  constructor(
    voicevoxBaseUrl: string = 'http://localhost:50021',
    defaultSpeakerId: number = 2
  ) {
    this.voicevoxUrl = voicevoxBaseUrl;
    this.currentSpeakerId = defaultSpeakerId;
  }

  /**
   * テキストから音声を生成
   */
  async synthesize(request: VoiceSynthesisRequest): Promise<ArrayBuffer> {
    const {
      text,
      speakerId = this.currentSpeakerId,
      speed = 1.0,
      pitch = 1.0,
      intonation = 1.0,
    } = request;

    try {
      // Step 1: クエリ作成
      const queryResponse = await fetch(
        `${this.voicevoxUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
        { method: 'POST' }
      );

      if (!queryResponse.ok) {
        throw new Error(`Query failed: ${queryResponse.statusText}`);
      }

      let queryJson = await queryResponse.json();

      // パラメータ調整
      queryJson.speedScale = speed;
      queryJson.pitchScale = pitch;
      queryJson.intonationScale = intonation;

      // Step 2: 音声合成
      const synthResponse = await fetch(
        `${this.voicevoxUrl}/synthesis?speaker=${speakerId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryJson),
        }
      );

      if (!synthResponse.ok) {
        throw new Error(`Synthesis failed: ${synthResponse.statusText}`);
      }

      return await synthResponse.arrayBuffer();
    } catch (error) {
      console.error('Voice synthesis error:', error);
      throw error;
    }
  }

  /**
   * 音声データを再生
   */
  async play(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    const decodedData = await this.audioContext.decodeAudioData(audioBuffer);
    const source = this.audioContext.createBufferSource();
    source.buffer = decodedData;
    source.connect(this.audioContext.destination);
    source.start(0);

    // 再生終了まで待機
    return new Promise((resolve) => {
      source.onended = () => resolve();
    });
  }

  /**
   * テキストからリップシンクデータを生成
   */
  async generateLipSync(
    text: string,
    audioDurationMs: number
  ): Promise<LipSyncData[]> {
    const lipSyncData: LipSyncData[] = [];

    // 音素ごとの時間を推定
    const phonemes = this.textToPhonemes(text);
    const timePerPhoneme = audioDurationMs / phonemes.length;

    phonemes.forEach((phoneme, index) => {
      const timestamp = index * timePerPhoneme;
      const mouthOpen = this.getMouthOpenness(phoneme);
      const mouthShape = this.getMouthShape(phoneme);

      lipSyncData.push({
        timestamp: Math.round(timestamp),
        mouthOpen,
        mouthShape,
      });
    });

    return lipSyncData;
  }

  /**
   * 周波数データからリップシンクを推定
   */
  async generateLipSyncFromAudio(
    audioBuffer: ArrayBuffer,
    sampleRate: number = 16000
  ): Promise<LipSyncData[]> {
    const lipSyncData: LipSyncData[] = [];

    // AudioBuffer を Float32Array に変換
    const audioArray = new Float32Array(audioBuffer);

    // フレーム単位でリップシンク分析
    const frameSize = 512;
    const hopSize = 256;

    for (let i = 0; i < audioArray.length - frameSize; i += hopSize) {
      const frame = audioArray.slice(i, i + frameSize);

      // ゼロ交差率を計算
      const zcr = this.calculateZeroCrossingRate(frame);

      // スペクトラム解析
      const spectrum = this.computeSpectrum(frame);

      // RMS エネルギー
      const rms = this.calculateRMS(frame);

      const mouthOpen = Math.min(rms / 0.1, 1.0); // 正規化
      const mouthShape = this.inferMouthShape(spectrum, zcr);

      lipSyncData.push({
        timestamp: (i / sampleRate) * 1000, // ミリ秒
        mouthOpen,
        mouthShape,
      });
    }

    return lipSyncData;
  }

  /**
   * テキストを音素列に変換
   */
  private textToPhonemes(text: string): string[] {
    // 簡易的な日本語音素変換
    const phonemeMap: Record<string, string[]> = {
      あ: ['a'],
      い: ['i'],
      う: ['u'],
      え: ['e'],
      お: ['o'],
      か: ['k', 'a'],
      き: ['k', 'i'],
      く: ['k', 'u'],
      け: ['k', 'e'],
      こ: ['k', 'o'],
      さ: ['s', 'a'],
      し: ['sh', 'i'],
      す: ['s', 'u'],
      せ: ['s', 'e'],
      そ: ['s', 'o'],
      た: ['t', 'a'],
      ち: ['ch', 'i'],
      つ: ['ts', 'u'],
      て: ['t', 'e'],
      と: ['t', 'o'],
      な: ['n', 'a'],
      に: ['n', 'i'],
      ぬ: ['n', 'u'],
      ね: ['n', 'e'],
      の: ['n', 'o'],
      は: ['h', 'a'],
      ひ: ['h', 'i'],
      ふ: ['f', 'u'],
      へ: ['h', 'e'],
      ほ: ['h', 'o'],
      ま: ['m', 'a'],
      み: ['m', 'i'],
      む: ['m', 'u'],
      め: ['m', 'e'],
      も: ['m', 'o'],
      や: ['y', 'a'],
      ゆ: ['y', 'u'],
      よ: ['y', 'o'],
      ら: ['r', 'a'],
      り: ['r', 'i'],
      る: ['r', 'u'],
      れ: ['r', 'e'],
      ろ: ['r', 'o'],
      わ: ['w', 'a'],
      を: ['w', 'o'],
      ん: ['n'],
    };

    const phonemes: string[] = [];
    for (const char of text) {
      phonemes.push(...(phonemeMap[char] || [char]));
    }
    return phonemes;
  }

  /**
   * 音素から口の開き度を取得
   */
  private getMouthOpenness(phoneme: string): number {
    const openPhonemes: Record<string, number> = {
      a: 1.0,
      e: 0.8,
      i: 0.3,
      o: 0.9,
      u: 0.4,
      n: 0.1,
    };
    return openPhonemes[phoneme] || 0.2;
  }

  /**
   * 音素から口の形を取得
   */
  private getMouthShape(
    phoneme: string
  ): 'a' | 'i' | 'u' | 'e' | 'o' | 'neutral' {
    const shapeMap: Record<string, 'a' | 'i' | 'u' | 'e' | 'o' | 'neutral'> = {
      a: 'a',
      e: 'e',
      i: 'i',
      o: 'o',
      u: 'u',
    };
    return shapeMap[phoneme] || 'neutral';
  }

  /**
   * 周波数スペクトラムから口の形を推定
   */
  private inferMouthShape(
    spectrum: number[],
    zcr: number
  ): 'a' | 'i' | 'u' | 'e' | 'o' | 'neutral' {
    // 簡易的なスペクトラム分析
    const lowFreq = spectrum.slice(0, 10).reduce((a, b) => a + b, 0);
    const midFreq = spectrum.slice(10, 30).reduce((a, b) => a + b, 0);
    const highFreq = spectrum.slice(30).reduce((a, b) => a + b, 0);

    if (highFreq > lowFreq && highFreq > midFreq) return 'i'; // 高周波が強い
    if (lowFreq > highFreq) return 'o'; // 低周波が強い
    if (midFreq > lowFreq && midFreq > highFreq) return 'u'; // 中周波が強い

    return 'neutral';
  }

  /**
   * ゼロ交差率を計算
   */
  private calculateZeroCrossingRate(frame: Float32Array): number {
    let zcCount = 0;
    for (let i = 0; i < frame.length - 1; i++) {
      if ((frame[i] * frame[i + 1]) < 0) zcCount++;
    }
    return zcCount / (frame.length - 1);
  }

  /**
   * スペクトラムを計算（簡易 FFT）
   */
  private computeSpectrum(frame: Float32Array): number[] {
    // 簡易的なスペクトラム計算（実際には FFT を使用）
    const spectrum = new Array(64).fill(0);
    const windowSize = Math.min(frame.length, 256);

    for (let i = 0; i < windowSize; i++) {
      const binIndex = Math.floor((i / windowSize) * spectrum.length);
      spectrum[binIndex] += Math.abs(frame[i]) / windowSize;
    }

    return spectrum;
  }

  /**
   * RMS エネルギーを計算
   */
  private calculateRMS(frame: Float32Array): number {
    let sum = 0;
    for (const sample of frame) {
      sum += sample * sample;
    }
    return Math.sqrt(sum / frame.length);
  }
}

/**
 * ブラウザ用インスタンス作成
 */
export function createVoiceSynthesizer(
  voicevoxUrl?: string,
  speakerId?: number
): VoicexoxSynthesizer {
  return new VoicexoxSynthesizer(voicevoxUrl, speakerId);
}
