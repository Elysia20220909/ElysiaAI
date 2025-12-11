/**
 * Cron Scheduler
 * 定期タスクスケジューラー
 */

import { CronJob } from 'cron';
import { backupScheduler } from './backup-scheduler';
import { fileUploadManager } from './file-upload';
import { jobQueue } from './job-queue';
import { logCleanupManager } from './log-cleanup';
import { logger } from './logger';

interface ScheduledTask {
	name: string;
	cronTime: string;
	job: CronJob;
	enabled: boolean;
}

class CronScheduler {
  private tasks: Map<string, ScheduledTask>;

  constructor() {
    this.tasks = new Map();
  }

  /**
	 * デフォルトタスクを初期化
	 */
  initializeDefaultTasks() {
    // 日次レポート（毎日午前9時）
    this.addTask(
      'daily-report',
      '0 9 * * *',
      async () => {
        logger.info('Running daily report task');
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        await jobQueue.generateReport('daily', yesterday, today);
      },
      process.env.DAILY_REPORT_ENABLED === 'true',
    );

    // 週次レポート（毎週月曜日午前10時）
    this.addTask(
      'weekly-report',
      '0 10 * * 1',
      async () => {
        logger.info('Running weekly report task');
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        await jobQueue.generateReport('weekly', lastWeek, today);
      },
      process.env.WEEKLY_REPORT_ENABLED === 'true',
    );

    // 月次レポート（毎月1日午前10時）
    this.addTask(
      'monthly-report',
      '0 10 1 * *',
      async () => {
        logger.info('Running monthly report task');
        const today = new Date();
        const lastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );

        await jobQueue.generateReport('monthly', lastMonth, today);
      },
      process.env.MONTHLY_REPORT_ENABLED === 'true',
    );

    // データベースバックアップ（毎日午前3時）
    this.addTask(
      'db-backup',
      '0 3 * * *',
      async () => {
        logger.info('Running database backup task');
        await backupScheduler.triggerManualBackup();
      },
      true,
    );

    // ログクリーンアップ（毎日午前4時）
    this.addTask(
      'log-cleanup',
      '0 4 * * *',
      async () => {
        logger.info('Running log cleanup task');
        await logCleanupManager.triggerManualCleanup();
      },
      true,
    );

    // 古いファイルクリーンアップ（毎週日曜日午前5時）
    this.addTask(
      'file-cleanup',
      '0 5 * * 0',
      async () => {
        logger.info('Running file cleanup task');
        fileUploadManager.cleanupOldFiles(30);
      },
      true,
    );

    // ヘルスチェック（10分ごと）
    this.addTask(
      'health-check',
      '*/10 * * * *',
      async () => {
        const { healthMonitor } = await import('./health-monitor');
        await healthMonitor.runCheck('database');
        await healthMonitor.runCheck('ollama');
      },
      process.env.HEALTH_CHECK_CRON_ENABLED === 'true',
    );

    logger.info('Cron scheduler initialized', {
      tasks: this.tasks.size,
    });
  }

  /**
	 * タスクを追加
	 */
  addTask(
    name: string,
    cronTime: string,
    callback: () => Promise<void>,
    enabled = true,
  ) {
    try {
      const job = new CronJob(
        cronTime,
        async () => {
          try {
            await callback();
            logger.info('Cron task completed', { name });
          } catch (error) {
            logger.error(`Cron task failed: ${name}`, error as Error);
          }
        },
        null,
        enabled,
        'Asia/Tokyo',
      );

      this.tasks.set(name, {
        name,
        cronTime,
        job,
        enabled,
      });

      if (enabled) {
        job.start();
        logger.info('Cron task added', { name, cronTime });
      }
    } catch (error) {
      logger.error(`Failed to add cron task: ${name}`, error as Error);
    }
  }

  /**
	 * タスクを有効化
	 */
  enableTask(name: string) {
    const task = this.tasks.get(name);
    if (task && !task.enabled) {
      task.job.start();
      task.enabled = true;
      logger.info('Cron task enabled', { name });
    }
  }

  /**
	 * タスクを無効化
	 */
  disableTask(name: string) {
    const task = this.tasks.get(name);
    if (task?.enabled) {
      task.job.stop();
      task.enabled = false;
      logger.info('Cron task disabled', { name });
    }
  }

  /**
	 * タスクを削除
	 */
  removeTask(name: string) {
    const task = this.tasks.get(name);
    if (task) {
      task.job.stop();
      this.tasks.delete(name);
      logger.info('Cron task removed', { name });
    }
  }

  /**
	 * タスク一覧を取得
	 */
  listTasks() {
    return Array.from(this.tasks.values()).map((task) => ({
      name: task.name,
      cronTime: task.cronTime,
      enabled: task.enabled,
      nextRun: task.enabled ? task.job.nextDate().toJSDate() : null,
    }));
  }

  /**
	 * タスクを即座に実行
	 */
  async runTask(name: string) {
    const task = this.tasks.get(name);
    if (!task) {
      throw new Error(`Task not found: ${name}`);
    }

    logger.info('Running cron task manually', { name });
    task.job.fireOnTick();
  }

  /**
	 * 全タスクを停止
	 */
  stopAll() {
    for (const task of this.tasks.values()) {
      task.job.stop();
    }
    logger.info('All cron tasks stopped');
  }

  /**
	 * 統計情報を取得
	 */
  getStats() {
    const tasks = Array.from(this.tasks.values());
    return {
      totalTasks: tasks.length,
      enabledTasks: tasks.filter((t) => t.enabled).length,
      disabledTasks: tasks.filter((t) => !t.enabled).length,
      nextRuns: tasks
        .filter((t) => t.enabled)
        .map((t) => ({
          name: t.name,
          nextRun: t.job.nextDate().toJSDate(),
        })),
    };
  }
}

export const cronScheduler = new CronScheduler();
