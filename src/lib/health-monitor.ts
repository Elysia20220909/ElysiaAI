/**
 * Automatic Health Monitoring
 * サービス稼働監視と自動アラート
 */

import { emailNotifier } from './email-notifier';
import { logger } from './logger';
import { webhookManager } from './webhook-events';

interface HealthCheck {
	name: string;
	check: () => Promise<boolean>;
	interval: number; // ミリ秒
	timeout: number; // ミリ秒
	failureThreshold: number; // 連続失敗回数でアラート
}

interface HealthStatus {
	name: string;
	status: 'healthy' | 'unhealthy' | 'unknown';
	lastCheck: Date;
	consecutiveFailures: number;
	lastError?: string;
}

class HealthMonitor {
  private checks: Map<string, HealthCheck>;
  private statuses: Map<string, HealthStatus>;
  private intervals: Map<string, Timer>;
  private enabled: boolean;

  constructor() {
    this.checks = new Map();
    this.statuses = new Map();
    this.intervals = new Map();
    this.enabled = process.env.HEALTH_MONITORING_ENABLED !== 'false';

    this.initializeDefaultChecks();
  }

  /**
	 * デフォルトのヘルスチェックを初期化
	 */
  private initializeDefaultChecks() {
    // データベース接続チェック
    this.addCheck({
      name: 'database',
      check: async () => {
        try {
          const { PrismaClient } = await import('@prisma/client');
          const prisma = new PrismaClient({
            datasourceUrl: process.env.DATABASE_URL || 'file:./dev.db',
          });
          await prisma.$queryRaw`SELECT 1`;
          await prisma.$disconnect();
          return true;
        } catch (error) {
          // データベースエラーをログに出力
          logger.debug(
            `Database health check error: ${error instanceof Error ? error.message : String(error)}`,
          );
          return false;
        }
      },
      interval: 60000, // 1分
      timeout: 5000,
      failureThreshold: 3,
    });

    // Ollama接続チェック
    this.addCheck({
      name: 'ollama',
      check: async () => {
        try {
          const ollamaUrl =
						process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
          // Use the correct endpoint for Ollama health check
          const response = await fetch(`${ollamaUrl}/api/version`, {
            signal: AbortSignal.timeout(5000),
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      interval: 120000, // 2分
      timeout: 5000,
      failureThreshold: 3,
    });

    // Redis接続チェック（オプション）
    if (process.env.REDIS_ENABLED === 'true') {
      this.addCheck({
        name: 'redis',
        check: async () => {
          try {
            const Redis = (await import('ioredis')).default;
            const redis = new Redis(
              process.env.REDIS_URL || 'redis://localhost:6379',
            );
            await redis.ping();
            redis.disconnect();
            return true;
          } catch {
            return false;
          }
        },
        interval: 60000,
        timeout: 5000,
        failureThreshold: 3,
      });
    }

    // ディスク容量チェック
    this.addCheck({
      name: 'disk_space',
      check: async () => {
        try {
          // Windows対応: PowerShell経由でディスク容量を確認
          if (process.platform === 'win32') {
            const { execSync } = await import('node:child_process');
            const output = execSync(
              'powershell -Command "Get-PSDrive C | Select-Object -ExpandProperty Free"',
              { encoding: 'utf-8' },
            );
            const freeSpaceBytes = Number.parseInt(output.trim(), 10);
            const freeSpaceGB = freeSpaceBytes / 1024 ** 3;
            return freeSpaceGB > 1; // 1GB以上の空き容量が必要
          }
          // Linux/Mac対応
          const fs = await import('node:fs');
          const path = await import('node:path');
          const stats = fs.statfsSync(path.resolve('./'));
          const freeSpaceGB = (stats.bavail * stats.bsize) / 1024 ** 3;
          return freeSpaceGB > 1; // 1GB以上の空き容量が必要
        } catch (error) {
          // ディスクチェックエラーをログに出力
          logger.debug(
            `Disk space health check error: ${error instanceof Error ? error.message : String(error)}`,
          );
          return false;
        }
      },
      interval: 300000, // 5分
      timeout: 5000,
      failureThreshold: 2,
    });
  }

  /**
	 * ヘルスチェックを追加
	 */
  addCheck(check: HealthCheck) {
    this.checks.set(check.name, check);
    this.statuses.set(check.name, {
      name: check.name,
      status: 'unknown',
      lastCheck: new Date(),
      consecutiveFailures: 0,
    });

    logger.info(`Health check added: ${check.name}`, {
      interval: `${check.interval}ms`,
    });
  }

  /**
	 * 監視を開始
	 */
  start() {
    if (!this.enabled) {
      logger.info('Health monitoring is disabled');
      return;
    }

    for (const [name, check] of this.checks.entries()) {
      // 初回実行
      this.performCheck(name, check);

      // 定期実行
      const intervalId = setInterval(() => {
        this.performCheck(name, check);
      }, check.interval);

      this.intervals.set(name, intervalId);
    }

    logger.info('Health monitoring started', {
      checks: this.checks.size,
    });
  }

  /**
	 * 監視を停止
	 */
  stop() {
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId);
    }
    this.intervals.clear();
    logger.info('Health monitoring stopped');
  }

  /**
	 * ヘルスチェックを実行
	 */
  private async performCheck(name: string, check: HealthCheck) {
    const status = this.statuses.get(name);
    if (!status) return;

    try {
      const result = await Promise.race([
        check.check(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), check.timeout),
        ),
      ]);

      status.lastCheck = new Date();

      if (result) {
        // チェック成功
        if (status.status === 'unhealthy') {
          logger.info(`Health check recovered: ${name}`);
          await this.notifyRecovery(name);
        }

        status.status = 'healthy';
        status.consecutiveFailures = 0;
        status.lastError = undefined;
      } else {
        // チェック失敗
        this.handleCheckFailure(status, check, 'Check returned false');
      }
    } catch (error) {
      // エラー発生
      this.handleCheckFailure(
        status,
        check,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
	 * チェック失敗を処理
	 */
  private async handleCheckFailure(
    status: HealthStatus,
    check: HealthCheck,
    errorMessage: string,
  ) {
    status.consecutiveFailures++;
    status.lastError = errorMessage;

    logger.warn(`Health check failed: ${status.name}`, {
      failures: status.consecutiveFailures,
      error: errorMessage,
    });

    // 閾値を超えたらアラート
    if (status.consecutiveFailures >= check.failureThreshold) {
      status.status = 'unhealthy';
      await this.notifyFailure(status.name, errorMessage);
    }
  }

  /**
	 * 失敗通知を送信
	 */
  private async notifyFailure(name: string, error: string) {
    logger.error(`Health check CRITICAL: ${name}`, new Error(error));

    // Webhook通知
    await webhookManager.emit('system.health_check_failed', {
      service: name,
      error,
    });

    // メール通知
    await emailNotifier.sendHealthCheckFailure(name, error);
  }

  /**
	 * 復旧通知を送信
	 */
  private async notifyRecovery(name: string) {
    await webhookManager.emit('system.health_check_failed', {
      service: name,
      recovered: true,
    });
  }

  /**
	 * 全ヘルスチェックのステータスを取得
	 */
  getStatus() {
    const statuses = Array.from(this.statuses.values());

    return {
      overall: statuses.every((s) => s.status === 'healthy')
        ? 'healthy'
        : statuses.some((s) => s.status === 'unhealthy')
          ? 'unhealthy'
          : 'degraded',
      checks: statuses.map((s) => ({
        name: s.name,
        status: s.status,
        lastCheck: s.lastCheck,
        consecutiveFailures: s.consecutiveFailures,
        lastError: s.lastError,
      })),
    };
  }

  /**
	 * 特定のヘルスチェックを手動実行
	 */
  async runCheck(name: string): Promise<boolean> {
    const check = this.checks.get(name);
    if (!check) return false;

    await this.performCheck(name, check);
    const status = this.statuses.get(name);
    return status?.status === 'healthy' || false;
  }
}

export const healthMonitor = new HealthMonitor();
