/**
 * Job Queue System (BullMQ)
 * 非同期バックグラウンドタスク処理
 */

import { type Job, Queue, Worker } from 'bullmq';
import { emailNotifier } from './email-notifier';
import { logger } from './logger';
import { webhookManager } from './webhook-events';

interface JobData {
	type: string;
	payload: Record<string, unknown>;
}

interface EmailJob {
	to: string;
	subject: string;
	html: string;
}

interface ReportJob {
	reportType: 'daily' | 'weekly' | 'monthly';
	startDate: Date;
	endDate: Date;
}

class JobQueueManager {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private readonly REDIS_URL: string;

  constructor() {
    this.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  }

  /**
	 * キューを初期化
	 */
  async initialize() {
    try {
      // Redis接続設定（TLS対応）
      const redisHost =
				process.env.REDIS_HOST || new URL(this.REDIS_URL).hostname;
      const redisPort =
				Number(process.env.REDIS_PORT) ||
				Number(new URL(this.REDIS_URL).port) ||
				6379;
      const redisPassword =
				process.env.REDIS_PASSWORD || new URL(this.REDIS_URL).password;
      const redisUsername =
				process.env.REDIS_USERNAME ||
				new URL(this.REDIS_URL).username ||
				'default';
      const useTLS = process.env.REDIS_TLS === 'true';

      const connection: Record<string, unknown> = {
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        username: redisUsername,
        maxRetriesPerRequest: Number(process.env.REDIS_MAX_RETRIES) || 5,
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
        retryStrategy: (times: number) => {
          const delay = Math.min(
            times * Number(process.env.REDIS_RETRY_DELAY_MS || 2000),
            10000,
          );
          logger.warn(`Redis reconnect attempt ${times}, retry in ${delay}ms`);
          return delay;
        },
      };

      // TLS有効化（redis.cloudで必須）
      if (useTLS) {
        connection.tls = {
          rejectUnauthorized: false,
        };
      }

      // キュー作成
      this.queue = new Queue('elysia-jobs', { connection });

      // ワーカー作成（ジョブ処理）
      this.worker = new Worker(
        'elysia-jobs',
        async (job: Job<JobData>) => {
          return await this.processJob(job);
        },
        { connection },
      );

      // ワーカーイベント
      this.worker.on('completed', (job) => {
        logger.info('Job completed', { jobId: job.id, type: job.data.type });
      });

      this.worker.on('failed', (job, err) => {
        logger.error('Job failed', err as Error);
      });

      logger.info('Job queue initialized', {
        host: redisHost,
        port: redisPort,
        tls: useTLS,
      });
    } catch (error) {
      logger.warn('Job queue unavailable, using in-memory fallback', {
        error: (error as Error).message,
      });
    }
  }

  /**
	 * ジョブを処理
	 */
  private async processJob(job: Job<JobData>): Promise<unknown> {
    const { type, payload } = job.data;

    switch (type) {
    case 'send-email':
      return await this.handleEmailJob(payload as unknown as EmailJob);

    case 'generate-report':
      return await this.handleReportJob(payload as unknown as ReportJob);

    case 'cleanup-old-data':
      return await this.handleCleanupJob();

    case 'send-webhook':
      return await this.handleWebhookJob(payload);

    default:
      throw new Error(`Unknown job type: ${type}`);
    }
  }

  /**
	 * メール送信ジョブ
	 */
  private async handleEmailJob(data: EmailJob) {
    await emailNotifier.send({
      to: data.to,
      subject: data.subject,
      html: data.html,
    });
    return { success: true, sentAt: new Date() };
  }

  /**
	 * レポート生成ジョブ
	 */
  private async handleReportJob(data: ReportJob) {
    logger.info('Generating report', { type: data.reportType });

    const { feedbackService, knowledgeService } = await import('./database');

    // データ取得
    const feedbacks = await feedbackService.getRecent(100);
    const knowledge = await knowledgeService.getAll();

    // レポート作成
    const report = {
      type: data.reportType,
      period: { start: data.startDate, end: data.endDate },
      statistics: {
        totalFeedbacks: feedbacks.length,
        positiveFeedbacks: feedbacks.filter((f) => f.rating === 'up').length,
        negativeFeedbacks: feedbacks.filter((f) => f.rating === 'down').length,
        totalKnowledge: knowledge.length,
        verifiedKnowledge: knowledge.filter((k) => k.verified).length,
      },
      generatedAt: new Date(),
    };

    // メール送信
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await emailNotifier.send({
        to: adminEmail,
        subject: `[エリシアAI] ${data.reportType}レポート`,
        html: `
					<h2>📊 ${data.reportType}レポート</h2>
					<ul>
						<li>総フィードバック: ${report.statistics.totalFeedbacks}</li>
						<li>ポジティブ: ${report.statistics.positiveFeedbacks}</li>
						<li>ネガティブ: ${report.statistics.negativeFeedbacks}</li>
						<li>総ナレッジ: ${report.statistics.totalKnowledge}</li>
						<li>検証済み: ${report.statistics.verifiedKnowledge}</li>
					</ul>
					<p><small>生成日時: ${report.generatedAt.toLocaleString('ja-JP')}</small></p>
				`,
      });
    }

    return report;
  }

  /**
	 * データクリーンアップジョブ
	 */
  private async handleCleanupJob() {
    logger.info('Running data cleanup job');

    const { logCleanupManager } = await import('./log-cleanup');
    await logCleanupManager.triggerManualCleanup();

    return { success: true, cleanedAt: new Date() };
  }

  /**
	 * Webhook送信ジョブ
	 */
  private async handleWebhookJob(payload: Record<string, unknown>) {
    const { event, data } = payload as {
			event: string;
			data: Record<string, unknown>;
		};
    await webhookManager.emit(event as never, data);
    return { success: true, sentAt: new Date() };
  }

  /**
	 * ジョブをキューに追加
	 */
  async addJob(type: string, payload: Record<string, unknown>, options = {}) {
    if (!this.queue) {
      logger.warn('Queue not available, executing job immediately');
      return await this.processJob({
        data: { type, payload },
      } as Job<JobData>);
    }

    const job = await this.queue.add(type, { type, payload }, options);
    logger.debug('Job added to queue', { jobId: job.id, type });
    return job;
  }

  /**
	 * メール送信ジョブを追加
	 */
  async sendEmail(to: string, subject: string, html: string) {
    return await this.addJob('send-email', { to, subject, html });
  }

  /**
	 * レポート生成ジョブを追加
	 */
  async generateReport(
    reportType: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date,
  ) {
    return await this.addJob('generate-report', {
      reportType,
      startDate,
      endDate,
    });
  }

  /**
	 * クリーンアップジョブを追加
	 */
  async scheduleCleanup() {
    return await this.addJob('cleanup-old-data', {});
  }

  /**
	 * キューの統計を取得
	 */
  async getStats() {
    if (!this.queue) {
      return { available: false };
    }

    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      available: true,
      waiting,
      active,
      completed,
      failed,
    };
  }

  /**
	 * クリーンアップ
	 */
  async close() {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    logger.info('Job queue closed');
  }
}

export const jobQueue = new JobQueueManager();
