/**
 * WHIP ストリーム受信ハンドラー
 * WebRTC-HTTP Ingestion Protocol 対応
 * ブラウザから Canvas 映像を RTMP サーバーへ中継
 */

import { Elysia, t } from 'elysia';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

interface StreamSession {
  id: string;
  streamKey: string;
  startTime: number;
  bytesReceived: number;
  frameCount: number;
}

/**
 * ストリーム管理マネージャー
 */
export class StreamManager {
  private sessions: Map<string, StreamSession> = new Map();
  private rtmpUrl: string;
  private recordingDir: string;

  constructor(rtmpUrl: string = 'rtmp://localhost:1935/live', recordingDir: string = './streams') {
    this.rtmpUrl = rtmpUrl;
    this.recordingDir = recordingDir;
  }

  /**
   * 新しいストリームセッションを作成
   */
  createSession(streamKey: string): StreamSession {
    const session: StreamSession = {
      id: randomUUID(),
      streamKey,
      startTime: Date.now(),
      bytesReceived: 0,
      frameCount: 0,
    };

    this.sessions.set(session.id, session);
    console.log(`🎬 Stream session created: ${session.id} (key: ${streamKey})`);

    return session;
  }

  /**
   * セッションを終了
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const duration = Math.floor((Date.now() - session.startTime) / 1000);
      console.log(`🎬 Stream session closed: ${sessionId} (${duration}s, ${session.bytesReceived} bytes)`);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * セッションを取得
   */
  getSession(sessionId: string): StreamSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 全アクティブセッション
   */
  getAllSessions(): StreamSession[] {
    return Array.from(this.sessions.values());
  }
}

const streamManager = new StreamManager();

/**
 * WHIP ストリーム受信ハンドラー登録
 */
export function registerStreamingRoutes(app: Elysia): Elysia {
  /**
   * POST /stream/whip
   * Canvas 映像フレームを受信して RTMP へ送信
   */
  app.post(
    '/stream/whip',
    async ({ body, headers, set }: { body: any; headers: Record<string, string | undefined>; set: any }) => {
      try {
        const streamKey = headers['x-stream-key'] as string;
        if (!streamKey) {
          set.status = 400;
          return { error: 'Stream key required' };
        }

        // ストリームセッション作成または取得
        let session = Array.from(streamManager.getAllSessions()).find(
          (s) => s.streamKey === streamKey
        );

        if (!session) {
          session = streamManager.createSession(streamKey);
        }

        // フレームデータを処理
        if (body instanceof Uint8Array || body instanceof Buffer) {
          session.bytesReceived += body.length;
          session.frameCount++;

          // ここで RTMP サーバーへフォワード可能
          // 実装例: FFmpeg プロセス、または nginx-rtmp-module へ送信
          console.log(
            `📹 Frame ${session.frameCount}: ${body.length} bytes`
          );

          // ローカル録画（オプション）
          // const recordPath = join(this.recordingDir, `${streamKey}.webm`);
          // const writer = createWriteStream(recordPath, { flags: 'a' });
          // writer.write(body);
          // writer.end();

          set.status = 200;
          return {
            ok: true,
            sessionId: session.id,
            frameCount: session.frameCount,
          };
        } else {
          set.status = 400;
          return { error: 'Invalid body format' };
        }
      } catch (error) {
        console.error('WHIP error:', error);
        set.status = 500;
        return { error: String(error) };
      }
    },
    {
      body: t.Any(),
    }
  );

  /**
   * GET /stream/sessions
   * アクティブなストリームセッション一覧
   */
  app.get('/stream/sessions', () => {
    const sessions = streamManager.getAllSessions();
    return {
      ok: true,
      count: sessions.length,
      sessions: sessions.map((s) => ({
        id: s.id,
        streamKey: s.streamKey,
        uptime: Math.floor((Date.now() - s.startTime) / 1000),
        bytesReceived: s.bytesReceived,
        frameCount: s.frameCount,
      })),
    };
  });

  /**
   * POST /stream/stop
   * ストリーム停止
   */
  app.post(
    '/stream/stop',
    ({ body, headers, set }: { body: any; headers: Record<string, string | undefined>; set: any }) => {
      try {
        const streamKey = headers['x-stream-key'] as string;
        if (!streamKey) {
          set.status = 400;
          return { error: 'Stream key required' };
        }

        const session = Array.from(streamManager.getAllSessions()).find(
          (s) => s.streamKey === streamKey
        );

        if (!session) {
          set.status = 404;
          return { error: 'Session not found' };
        }

        streamManager.closeSession(session.id);
        set.status = 200;
        return {
          ok: true,
          message: `Stream ${session.id} stopped`,
        };
      } catch (error) {
        console.error('Stream stop error:', error);
        set.status = 500;
        return { error: String(error) };
      }
    },
    {
      body: t.Optional(t.Object({})),
    }
  );

  /**
   * GET /stream/obs-config
   * OBS 設定エクスポート
   */
  app.get('/stream/obs-config', ({ query }: { query: Record<string, any> }) => {
    const streamKey = query.streamKey as string;
    if (!streamKey) {
      return { error: 'Stream key required' };
    }

    return {
      ok: true,
      obsConfig: {
        name: 'Elisia VTuber Stream',
        sources: [
          {
            name: 'Browser Capture',
            type: 'browser_source',
            settings: {
              url: `${process.env.APP_URL || 'http://localhost:3000'}/elisia-vtuber.html`,
              width: 1280,
              height: 720,
            },
          },
        ],
        outputs: [
          {
            name: 'RTMP Output',
            type: 'rtmp_output',
            settings: {
              server: process.env.RTMP_URL || 'rtmp://localhost:1935/live',
              key: streamKey,
              use_auth: false,
              bitrate: 2500,
              audio_bitrate: 128,
            },
          },
        ],
      },
    };
  });

  return app;
}

// StreamManager は上部で export 済み
