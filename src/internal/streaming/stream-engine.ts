/**
 * ElisiaStreamEngine
 * ブラウザ側で Canvas もしくは画面共有ストリームを MediaRecorder で分割し、
 * WHIP (/stream/whip) エンドポイントに送信する軽量ユーティリティ。
 * サーバー側への依存は fetch のみ。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// DOM/MediaRecorder 型がバックエンドビルドで解決しない場合に備えた宣言
declare const window: any;
declare const navigator: any;
declare const MediaRecorder: any;
declare const document: any;

export interface StreamConfig {
  canvas?: any; // HTMLCanvasElement を想定（任意）
  rtmpUrl: string;
  streamKey: string;
  bitrate?: number; // kbps
  fps?: number;
  width?: number;
  height?: number;
}

export interface StreamStatus {
  isStreaming: boolean;
  bitrate: number;
  frameCount: number;
  bytesSent: number;
  startedAt?: number;
}

export class ElisiaStreamEngine {
  private canvas?: any;
  private stream: any;
  private mediaRecorder: any;
  private config: StreamConfig;
  private status: StreamStatus;
  private onStatus?: (status: StreamStatus) => void;

  constructor(config: StreamConfig) {
    this.config = {
      bitrate: 2500,
      fps: 30,
      width: 1280,
      height: 720,
      ...config,
    };

    this.canvas = config.canvas;
    this.status = {
      isStreaming: false,
      bitrate: this.config.bitrate ?? 2500,
      frameCount: 0,
      bytesSent: 0,
    };
  }

  setCanvas(canvas: any) {
    this.canvas = canvas;
  }

  setStatusCallback(callback: (status: StreamStatus) => void) {
    this.onStatus = callback;
  }

  getStatus(): StreamStatus {
    return { ...this.status };
  }

  private emitStatus() {
    if (this.onStatus) {
      this.onStatus(this.getStatus());
    }
  }

  private updateStatus(partial: Partial<StreamStatus>) {
    this.status = { ...this.status, ...partial };
    this.emitStatus();
  }

  private getMimeType(): string {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
    ];

    for (const type of candidates) {
      // MediaRecorder が存在しない場合は fallback
      if (typeof MediaRecorder === 'undefined') break;
      if (MediaRecorder.isTypeSupported?.(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  private async getSourceStream(): Promise<any> {
    if (typeof window === 'undefined') {
      throw new Error('StreamEngine is browser-only');
    }

    // 1) Canvas から captureStream
    if (this.canvas?.captureStream) {
      const videoStream = this.canvas.captureStream(this.config.fps);
      const audioStream = await this.tryGetMicStream();
      if (audioStream) {
        audioStream.getTracks().forEach((t: any) => videoStream.addTrack(t));
      }
      return videoStream;
    }

    // 2) 画面共有（fallback）
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: this.config.fps,
        width: this.config.width,
        height: this.config.height,
      },
      audio: true,
    });

    return displayStream;
  }

  private async tryGetMicStream(): Promise<any | null> {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.warn('Microphone unavailable, streaming video only');
      return null;
    }
  }

  async start(): Promise<void> {
    if (this.status.isStreaming) return;

    const sourceStream = await this.getSourceStream();
    this.stream = sourceStream;

    const mimeType = this.getMimeType();
    this.mediaRecorder = new MediaRecorder(sourceStream, {
      mimeType,
      videoBitsPerSecond: (this.config.bitrate ?? 2500) * 1000,
    });

    this.mediaRecorder.ondataavailable = async (event: any) => {
      if (!event.data || event.data.size === 0 || !this.status.isStreaming) return;
      await this.pushChunk(event.data);
    };

    this.mediaRecorder.onstop = () => {
      this.updateStatus({ isStreaming: false });
    };

    this.status.startedAt = Date.now();
    this.updateStatus({ isStreaming: true, frameCount: 0, bytesSent: 0 });
    // 1 秒ごとのチャンク
    this.mediaRecorder.start(1000);
  }

  async stop(): Promise<void> {
    if (!this.status.isStreaming) return;

    try {
      this.mediaRecorder?.stop();
      this.stream?.getTracks?.().forEach((t: any) => t.stop());
    } finally {
      this.updateStatus({ isStreaming: false });
    }
  }

  private async pushChunk(data: any) {
    try {
      const response = await fetch('/stream/whip', {
        method: 'POST',
        headers: {
          'X-Stream-Key': this.config.streamKey,
        },
        body: data,
      });

      if (!response.ok) {
        throw new Error(`WHIP upload failed: ${response.status}`);
      }

      const result = await response.json();
      this.updateStatus({
        frameCount: result.frameCount ?? this.status.frameCount + 1,
        bytesSent: this.status.bytesSent + data.size,
        bitrate: this.config.bitrate ?? 2500,
      });
    } catch (error) {
      console.error('Stream upload error:', error);
      await this.stop();
    }
  }
}
