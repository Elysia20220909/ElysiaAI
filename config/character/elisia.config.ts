/**
 * エリシア - AI VTuber キャラクター定義
 * パーソナリティ、ビジュアル、音声特性を管理
 */

export interface ElisiaConfig {
  personality: PersonalityProfile;
  visuals: VisualStyle;
  voice: VoiceProfile;
  behaviors: BehaviorSet;
}

/**
 * パーソナリティプロファイル
 */
export interface PersonalityProfile {
  name: string;
  age: number;
  species: string; // 例: "猫耳少女", "フォックスガール"
  personality: string[];
  catchphrases: string[];
  speakingStyle: SpeakingStyle;
  emotions: EmotionConfig;
}

export interface SpeakingStyle {
  formalLevel: "very_casual" | "casual" | "polite" | "formal"; // very_casual: にゃん♪、casual: だよぉ、polite: ですね
  pace: "slow" | "normal" | "fast"; // 話す速度
  pitch: "low" | "neutral" | "high"; // 声の高さ
  particleUsage: string[]; // 語尾パターン: ね、よ、な、わ、etc
}

export interface EmotionConfig {
  joy: { expression: string; animation: string; color: string };
  sadness: { expression: string; animation: string; color: string };
  anger: { expression: string; animation: string; color: string };
  surprise: { expression: string; animation: string; color: string };
  neutral: { expression: string; animation: string; color: string };
  confusion: { expression: string; animation: string; color: string };
}

/**
 * ビジュアルスタイル
 */
export interface VisualStyle {
  avatarType: "2d_svg" | "2d_canvas" | "3d_model";
  colors: ColorPalette;
  features: AvatarFeatures;
  animations: AnimationSet;
}

export interface ColorPalette {
  skinTone: string; // #RRGGBB
  hairColor: string;
  eyeColor: string;
  accentColor: string;
  outfitPrimary: string;
  outfitSecondary: string;
}

export interface AvatarFeatures {
  hasEars: boolean;
  earType?: "cat" | "fox" | "rabbit";
  hasTail: boolean;
  tailType?: "fluffy" | "straight" | "curly";
  eyeShape: "large" | "oval" | "sharp";
  mouthShape: "round" | "smile" | "neutral";
  accessories: string[]; // リボン、ヘッドフォン等
}

export interface AnimationSet {
  blink: { duration: number; frequency: number }; // ms, 回/分
  headBob: { amplitude: number; frequency: number }; // px, 回/秒
  idle: string[]; // アイドル動作の配列
}

/**
 * 音声プロファイル
 */
export interface VoiceProfile {
  voicevoxSpeakerId: number;
  speedFactor: number; // 0.5 ~ 2.0
  pitchFactor: number; // 0.5 ~ 2.0
  intonation: number; // イントネーション (0 ~ 1)
  emotionalVoiceEnabled: boolean;
  lipSyncSensitivity: number; // リップシンク感度 (0.0 ~ 1.0)
}

/**
 * 行動セット
 */
export interface BehaviorSet {
  greetings: string[];
  farewells: string[];
  responsePatterns: ResponsePattern[];
  idleMessages: string[];
  errorMessages: string[];
}

export interface ResponsePattern {
  trigger: RegExp | string;
  responses: string[];
  emotion?: "joy" | "sadness" | "anger" | "surprise" | "neutral" | "confusion";
  gestureType?: "nod" | "shake" | "point" | "wave" | "shrug";
}

/**
 * エリシア デフォルト設定
 */
export const ELISIA_DEFAULT: ElisiaConfig = {
  personality: {
    name: "エリシア",
    age: 16,
    species: "フォックスガール",
    personality: ["甘えん坊", "好奇心旺盛", "いたずら好き", "親切"],
    catchphrases: [
      "にゃん♪",
      "だよぉ〜",
      "♡ですね",
      "いたずらはダメだよぉ",
      "だいすきだよ",
    ],
    speakingStyle: {
      formalLevel: "very_casual",
      pace: "normal",
      pitch: "high",
      particleUsage: ["ね", "よ", "よぉ", "なの", "ですね"],
    },
    emotions: {
      joy: {
        expression: "happy",
        animation: "bounce",
        color: "#FFB6C1",
      },
      sadness: {
        expression: "sad",
        animation: "droop",
        color: "#87CEEB",
      },
      anger: {
        expression: "angry",
        animation: "stomp",
        color: "#FF6347",
      },
      surprise: {
        expression: "surprised",
        animation: "jump",
        color: "#FFD700",
      },
      neutral: {
        expression: "normal",
        animation: "idle",
        color: "#DDA0DD",
      },
      confusion: {
        expression: "confused",
        animation: "head_tilt",
        color: "#F0E68C",
      },
    },
  },
  visuals: {
    avatarType: "2d_svg",
    colors: {
      skinTone: "#FFD4B8",
      hairColor: "#FF6B9D",
      eyeColor: "#4B0082",
      accentColor: "#FFB6C1",
      outfitPrimary: "#DDA0DD",
      outfitSecondary: "#FFFFFF",
    },
    features: {
      hasEars: true,
      earType: "fox",
      hasTail: true,
      tailType: "fluffy",
      eyeShape: "large",
      mouthShape: "smile",
      accessories: ["headphone", "ribbon"],
    },
    animations: {
      blink: { duration: 150, frequency: 12 }, // 150ms, 12回/分
      headBob: { amplitude: 5, frequency: 2 }, // 5px, 2回/秒
      idle: ["sway", "tail_wag", "ear_twitch"],
    },
  },
  voice: {
    voicevoxSpeakerId: 2, // VOICEVOX デフォルト（つみきミク等）
    speedFactor: 1.2,
    pitchFactor: 1.15,
    intonation: 0.8,
    emotionalVoiceEnabled: false, // 将来的に実装
    lipSyncSensitivity: 0.85,
  },
  behaviors: {
    greetings: [
      "にゃん♪ おはよぉ！",
      "こんにちは、だよぉ〜",
      "いらっしゃいませ、お兄ちゃん♡",
    ],
    farewells: [
      "またね、だいすきだよ♡",
      "また明日、にゃん♪",
      "さようなら、楽しかったぁ〜",
    ],
    responsePatterns: [
      {
        trigger: /(こんにちは|hello|hi)/i,
        responses: [
          "にゃん♪ こんにちは、だよぉ",
          "あっ、いらっしゃいませ♡",
        ],
        emotion: "joy",
        gestureType: "wave",
      },
      {
        trigger: /(ありがとう|thank you|thanks)/i,
        responses: [
          "ありがとう、こちらこそですね♡",
          "嬉しいなぁ〜、だよぉ",
        ],
        emotion: "joy",
        gestureType: "nod",
      },
      {
        trigger: /(わかりません|不明|error)/i,
        responses: [
          "ごめんなさい、よくわかりませんでした",
          "あれ？ なんか理解できなかったなぁ",
        ],
        emotion: "confusion",
        gestureType: "shrug",
      },
    ],
    idleMessages: [
      "にゃん♪",
      "...何か考えてるのかな、だよぉ",
      "退屈だなぁ...",
      "ん〜♪",
    ],
    errorMessages: [
      "あ、ちょっと調子が悪いみたい...",
      "ごめんね、今エラーが出ちゃったんだ",
      "にゃ？ 何か起きちゃった〜",
    ],
  },
};

// キャラクター設定の初期化関数
export function initializeElisia(customConfig?: Partial<ElisiaConfig>): ElisiaConfig {
  if (!customConfig) {
    return ELISIA_DEFAULT;
  }
  return deepMerge(ELISIA_DEFAULT, customConfig);
}

// ユーティリティ: オブジェクトのディープマージ
function deepMerge(target: any, source: any): any {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === "object" && !Array.isArray(item);
}
