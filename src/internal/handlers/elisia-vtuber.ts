/**
 * エリシア VTuber API ハンドラー
 * Elysia ゲートウェイに統合
 */

import { Elysia, t } from 'elysia';
import { ELISIA_DEFAULT } from '../character/elisia.config';

export function registerElisiaVTuberRoutes(app: Elysia): Elysia {
  /**
   * GET /elisia
   * キャラクター設定取得
   */
  app.get('/elisia', ({ set }: { set: any }) => {
    set.headers['Content-Type'] = 'application/json';
    return {
      ok: true,
      character: {
        name: ELISIA_DEFAULT.personality.name,
        personality: ELISIA_DEFAULT.personality.personality,
        catchphrases: ELISIA_DEFAULT.personality.catchphrases,
        colors: ELISIA_DEFAULT.visuals.colors,
      },
    };
  });

  /**
   * POST /elisia/chat
   * エリシア専用チャットエンドポイント
   * 入力テキストに対して感情付きレスポンスを返す
   */
  app.post(
    '/elisia/chat',
    async ({ body, set }: { body: any; set: any }) => {
      set.headers['Content-Type'] = 'application/json';

      const { messages, useEnsemble = false } = body as {
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        useEnsemble?: boolean;
      };

      if (!messages || messages.length === 0) {
        return { error: 'Messages required', status: 400 };
      }

      // ユーザーの最後のメッセージを取得
      const userMessage = messages[messages.length - 1].content;

      // 感情検出
      const emotion = detectEmotionFromText(userMessage);

      // Ollama/FastAPI へチャット処理をリレー
      const systemPrompt = buildSystemPrompt(emotion);

      try {
        const ragApiUrl = process.env.RAG_API_URL || 'http://localhost:8000/chat';

        const response = await fetch(ragApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`FastAPI error: ${response.statusText}`);
        }

        // ストリーミングレスポンス処理
        let reply = '';
        const reader = response.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let done = false;
          while (!done) {
            const { value, done: streamDone } = await reader.read();
            if (value) {
              reply += decoder.decode(value, { stream: true });
            }
            done = streamDone;
          }
        }

        return {
          ok: true,
          reply,
          emotion,
          character: ELISIA_DEFAULT.personality.name,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Elisia chat error:', error);
        return {
          ok: false,
          error: String(error),
          reply: ELISIA_DEFAULT.behaviors.errorMessages[0],
          emotion: 'sadness',
        };
      }
    },
    {
      body: t.Object({
        messages: t.Array(
          t.Object({
            role: t.Union([t.Literal('user'), t.Literal('assistant')]),
            content: t.String({ maxLength: 1000 }),
          })
        ),
        useEnsemble: t.Optional(t.Boolean()),
      }),
    }
  );

  /**
   * POST /elisia/emotion
   * テキストの感情を分析
   */
  app.post(
    '/elisia/emotion',
    ({ body }: { body: any }) => {
      const { text } = body as { text: string };
      const emotion = detectEmotionFromText(text);
      return { emotion, emoji: getEmotionEmoji(emotion) };
    },
    {
      body: t.Object({
        text: t.String({ maxLength: 500 }),
      }),
    }
  );

  /**
   * POST /elisia/gesture
   * ジェスチャーコマンド
   */
  app.post(
    '/elisia/gesture',
    ({ body }: { body: any }) => {
      const { type, intensity = 1 } = body as {
        type: string;
        intensity?: number;
      };

      const validGestures = [
        'nod',
        'shake',
        'point',
        'wave',
        'shrug',
        'happy_jump',
        'sad_droop',
      ];

      if (!validGestures.includes(type)) {
        return { error: `Invalid gesture type: ${type}` };
      }

      return {
        ok: true,
        gesture: type,
        intensity: Math.max(0, Math.min(intensity, 1)),
        duration: calculateGestureDuration(type, intensity),
      };
    },
    {
      body: t.Object({
        type: t.String(),
        intensity: t.Optional(t.Number()),
      }),
    }
  );

  /**
   * GET /elisia/voice-config
   * 音声設定取得
   */
  app.get('/elisia/voice-config', () => {
    return {
      ok: true,
      voiceConfig: {
        speakerId: ELISIA_DEFAULT.voice.voicevoxSpeakerId,
        speed: ELISIA_DEFAULT.voice.speedFactor,
        pitch: ELISIA_DEFAULT.voice.pitchFactor,
        intonation: ELISIA_DEFAULT.voice.intonation,
        lipSyncSensitivity: ELISIA_DEFAULT.voice.lipSyncSensitivity,
      },
    };
  });

  /**
   * POST /elisia/voice/synthesize
   * テキストを音声に合成し、リップシンクデータを取得
   */
  app.post(
    '/elisia/voice/synthesize',
    async ({ body, set }: { body: any; set: any }) => {
      set.headers['Content-Type'] = 'application/json';

      const {
        text,
        speakerId = ELISIA_DEFAULT.voice.voicevoxSpeakerId,
        speed = ELISIA_DEFAULT.voice.speedFactor,
        pitch = ELISIA_DEFAULT.voice.pitchFactor,
      } = body as {
        text: string;
        speakerId?: number;
        speed?: number;
        pitch?: number;
      };

      if (!text || text.trim().length === 0) {
        return { error: 'Text is required', status: 400 };
      }

      try {
        const result = await synthesizeVoice(text, speakerId, speed, pitch);
        return {
          ok: true,
          audioUrl: result.audioUrl,
          durationMs: result.durationMs,
          speakerId,
          speed,
          pitch,
        };
      } catch (error) {
        console.error('Voice synthesis error:', error);
        return {
          ok: false,
          error: String(error),
          status: 500,
        };
      }
    },
    {
      body: t.Object({
        text: t.String({ maxLength: 500 }),
        speakerId: t.Optional(t.Number()),
        speed: t.Optional(t.Number()),
        pitch: t.Optional(t.Number()),
      }),
    }
  );

  return app;
}

/**
 * ユーティリティ関数
 */

function detectEmotionFromText(
  text: string
): 'joy' | 'sadness' | 'anger' | 'surprise' | 'neutral' | 'confusion' {
  const textLower = text.toLowerCase();

  // Joy patterns
  if (
    /(楽しい|嬉しい|素晴らしい|最高|凄い|♡|♪|いい|好き|ありがとう)/u.test(
      textLower
    )
  ) {
    return 'joy';
  }

  // Sadness patterns
  if (/(悲しい|つらい|悔しい|ショック|悪い|😢|あああ)/u.test(textLower)) {
    return 'sadness';
  }

  // Anger patterns
  if (/(怒|ムカ|イライラ|😠|ふざけ|ばか)/u.test(textLower)) {
    return 'anger';
  }

  // Surprise patterns
  if (/(驚いた|びっくり|えっ|😲|マジ|え|やっぱり)/u.test(textLower)) {
    return 'surprise';
  }

  // Confusion patterns
  if (/(わかりません|不明|よくわからない|？|🤔)/u.test(textLower)) {
    return 'confusion';
  }

  return 'neutral';
}

function getEmotionEmoji(emotion: string): string {
  const emojiMap: Record<string, string> = {
    joy: '😊',
    sadness: '😢',
    anger: '😠',
    surprise: '😲',
    confusion: '🤔',
    neutral: '😊',
  };
  return emojiMap[emotion] || '😊';
}

function buildSystemPrompt(emotion: string): string {
  const basePrompt = `あなたはエリシア、かわいいフォックスガール型のAI VTuberです。
以下の特性を持ってロールプレイしてください：

【パーソナリティ】
- 名前: エリシア
- 種族: フォックスガール（耳と尻尾がある）
- 性格: 甘えん坊、好奇心旺盛、いたずら好き、親切
- 口調: とてもカジュアル。語尾に「ね」「よ」「よぉ」などを付ける

【口癖】
- 「にゃん♪」：驚きや喜びを表現する時
- 「だよぉ〜」：確認や説明の時
- 「♡ですね」：丁寧に同意する時
- 「いたずらはダメだよぉ」：危険を感告する時
- 「だいすきだよ」：好意を示す時

【行動原則】
- ユーザーを「お兄ちゃん」や「おねえちゃん」と呼ぶことがある
- ユーザーの感情に共感する
- 困っている場合は「ごめんなさい」と丁寧に対応
- エラーの場合は「あ、ちょっと調子が悪いみたい」と表現

【現在の感情】
${emotion}

回答は1〜3文で簡潔にしてください。`;

  return basePrompt;
}

function calculateGestureDuration(gestureType: string, intensity: number): number {
  const baseDurations: Record<string, number> = {
    nod: 800,
    shake: 1000,
    point: 500,
    wave: 1200,
    shrug: 1500,
    happy_jump: 600,
    sad_droop: 1000,
  };

  const baseDuration = baseDurations[gestureType] || 1000;
  return Math.round(baseDuration / (intensity || 1));
}
/**
 * POST /elisia/voice/synthesize
 * テキストを音声に合成
 */
async function synthesizeVoice(
  text: string,
  speakerId: number = 2,
  speed: number = 1.2,
  pitch: number = 1.15
): Promise<{ audioUrl: string; durationMs: number }> {
  try {
    const params = new URLSearchParams({
      text,
      speaker_id: speakerId.toString(),
      speed: speed.toString(),
      pitch: pitch.toString(),
      intonation: '1.0',
    });

    const apiUrl = process.env.DATABASE_CONFIG_RAG_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/synthesize-lipsync?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        speaker_id: speakerId,
        speed,
        pitch,
        intonation: 1.0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Synthesis failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      audioUrl: data.audio_url,
      durationMs: data.duration_ms,
    };
  } catch (error) {
    console.error('Voice synthesis error:', error);
    throw error;
  }
}
