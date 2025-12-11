/**
 * Automatic Backup Scheduler
 * 定期的なDB自動バックアップと世代管理
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from './logger';
import { webhookManager } from './webhook-events';

interface BackupConfig {
	enabled: boolean;
	interval: number; // 分単位
	maxBackups: number; // 保持する世代数
	backupDir: string;
}

class BackupScheduler {
  private config: BackupConfig;
  private intervalId?: Timer;
  private isRunning = false;

  constructor() {
    this.config = {
      enabled: process.env.AUTO_BACKUP_ENABLED === 'true',
      interval: Number(process.env.BACKUP_INTERVAL_MINUTES) || 60, // デフォルト1時間
      maxBackups: Number(process.env.MAX_BACKUP_GENERATIONS) || 7, // デフォルト7世代
      backupDir: process.env.BACKUP_DIR || './backups',
    };

    // バックアップディレクトリの作成
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
  }

  /**
	 * バックアップスケジューラーを開始
	 */
  start() {
    if (!this.config.enabled) {
      logger.info('Backup scheduler is disabled');
      return;
    }

    if (this.isRunning) {
      logger.warn('Backup scheduler is already running');
      return;
    }

    this.isRunning = true;

    // 初回実行
    this.performBackup();

    // 定期実行
    this.intervalId = setInterval(
      () => {
        this.performBackup();
      },
      this.config.interval * 60 * 1000,
    );

    logger.info('Backup scheduler started', {
      interval: `${this.config.interval} minutes`,
      maxBackups: this.config.maxBackups,
    });
  }

  /**
	 * バックアップスケジューラーを停止
	 */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      this.isRunning = false;
      logger.info('Backup scheduler stopped');
    }
  }

  /**
	 * バックアップを実行
	 */
  private async performBackup() {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `elysia-backup-${timestamp}.db`;
    const backupPath = path.join(this.config.backupDir, backupFileName);

    try {
      logger.info('Starting automatic backup', { file: backupFileName });

      // SQLiteデータベースのコピー
      const dbPath =
				process.env.DATABASE_URL?.replace('file:', '') || './data/elysia.db';

      if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found: ${dbPath}`);
      }

      // ファイルコピー
      fs.copyFileSync(dbPath, backupPath);

      const fileSize = fs.statSync(backupPath).size;
      const duration = Date.now() - startTime;

      logger.info('Backup completed', {
        file: backupFileName,
        size: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
        duration: `${duration}ms`,
      });

      // Webhook通知
      await webhookManager.emit('backup.completed', {
        file: backupFileName,
        size: fileSize,
        duration,
      });

      // 古いバックアップを削除
      await this.cleanupOldBackups();
    } catch (error) {
      logger.error('Backup failed', error as Error);
      await webhookManager.emit('error.critical', {
        message: 'Automatic backup failed',
        error: (error as Error).message,
      });
    }
  }

  /**
	 * 古いバックアップを削除（世代管理）
	 */
  private async cleanupOldBackups() {
    try {
      const files = fs
        .readdirSync(this.config.backupDir)
        .filter((f) => f.startsWith('elysia-backup-') && f.endsWith('.db'))
        .map((f) => ({
          name: f,
          path: path.join(this.config.backupDir, f),
          mtime: fs.statSync(path.join(this.config.backupDir, f)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // 古いものから削除
      if (files.length > this.config.maxBackups) {
        const toDelete = files.slice(this.config.maxBackups);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
          logger.info('Old backup deleted', { file: file.name });
        }
      }
    } catch (error) {
      logger.error('Cleanup failed', error as Error);
    }
  }

  /**
	 * バックアップ履歴を取得
	 */
  getBackupHistory() {
    try {
      const files = fs
        .readdirSync(this.config.backupDir)
        .filter((f) => f.startsWith('elysia-backup-') && f.endsWith('.db'))
        .map((f) => {
          const fullPath = path.join(this.config.backupDir, f);
          const stats = fs.statSync(fullPath);
          return {
            name: f,
            size: stats.size,
            createdAt: stats.mtime,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return files;
    } catch {
      return [];
    }
  }

  /**
	 * 手動バックアップを実行
	 */
  async triggerManualBackup() {
    await this.performBackup();
  }

  /**
	 * スケジューラーのステータスを取得
	 */
  getStatus() {
    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      interval: this.config.interval,
      maxBackups: this.config.maxBackups,
      backupDir: this.config.backupDir,
      backupCount: this.getBackupHistory().length,
    };
  }
}

export const backupScheduler = new BackupScheduler();
