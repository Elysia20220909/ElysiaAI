/**
 * Webhook Event System
 * イベント駆動型の外部サービス連携
 */

import { logger } from './logger';

export type WebhookEvent =
	| 'user.registered'
	| 'user.login'
	| 'chat.message'
	| 'feedback.created'
	| 'error.critical'
	| 'backup.completed'
	| 'rate_limit.exceeded'
	| 'system.health_check_failed';

interface WebhookPayload {
	event: WebhookEvent;
	timestamp: Date;
	data: Record<string, unknown>;
}

interface WebhookSubscription {
	url: string;
	events: WebhookEvent[];
	secret?: string;
	enabled: boolean;
}

class WebhookManager {
  private subscriptions: Map<string, WebhookSubscription>;

  constructor() {
    this.subscriptions = new Map();
    this.loadSubscriptionsFromEnv();
  }

  /**
	 * 環境変数からWebhook設定を読み込み
	 */
  private loadSubscriptionsFromEnv() {
    const discordUrl = process.env.DISCORD_WEBHOOK_URL;
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    const customUrl = process.env.CUSTOM_WEBHOOK_URL;

    if (discordUrl) {
      this.subscribe('discord', {
        url: discordUrl,
        events: [
          'error.critical',
          'system.health_check_failed',
          'rate_limit.exceeded',
        ],
        enabled: true,
      });
    }

    if (slackUrl) {
      this.subscribe('slack', {
        url: slackUrl,
        events: ['user.registered', 'backup.completed', 'error.critical'],
        enabled: true,
      });
    }

    if (customUrl) {
      this.subscribe('custom', {
        url: customUrl,
        events: ['chat.message', 'feedback.created'],
        secret: process.env.CUSTOM_WEBHOOK_SECRET,
        enabled: true,
      });
    }
  }

  /**
	 * Webhook購読を追加
	 */
  subscribe(name: string, subscription: WebhookSubscription) {
    this.subscriptions.set(name, subscription);
    logger.info(`Webhook subscribed: ${name}`, { events: subscription.events });
  }

  /**
	 * Webhook購読を削除
	 */
  unsubscribe(name: string) {
    this.subscriptions.delete(name);
    logger.info(`Webhook unsubscribed: ${name}`);
  }

  /**
	 * イベントを発火してWebhook通知
	 */
  async emit(event: WebhookEvent, data: Record<string, unknown>) {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date(),
      data,
    };

    const promises: Promise<void>[] = [];

    for (const [name, subscription] of this.subscriptions.entries()) {
      if (!subscription.enabled) continue;
      if (!subscription.events.includes(event)) continue;

      promises.push(this.sendWebhook(name, subscription, payload));
    }

    await Promise.allSettled(promises);
  }

  /**
	 * Webhookを送信
	 */
  private async sendWebhook(
    name: string,
    subscription: WebhookSubscription,
    payload: WebhookPayload,
  ) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // カスタムWebhookの場合はHMAC署名を追加
      if (subscription.secret) {
        const signature = await this.generateSignature(
          JSON.stringify(payload),
          subscription.secret,
        );
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(subscription.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.warn(`Webhook delivery failed: ${name}`, {
          status: response.status,
        });
      } else {
        logger.debug(`Webhook delivered: ${name}`, { event: payload.event });
      }
    } catch (error) {
      logger.error(`Webhook error: ${name}`, error as Error);
    }
  }

  /**
	 * HMAC-SHA256署名を生成
	 */
  private async generateSignature(
    payload: string,
    secret: string,
  ): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const data = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature = await crypto.subtle.sign('HMAC', key, data);
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
	 * 購読中のWebhook一覧を取得
	 */
  getSubscriptions() {
    return Array.from(this.subscriptions.entries()).map(([name, sub]) => ({
      name,
      events: sub.events,
      enabled: sub.enabled,
    }));
  }

  /**
	 * 特定のWebhookを有効化/無効化
	 */
  toggleSubscription(name: string, enabled: boolean) {
    const subscription = this.subscriptions.get(name);
    if (subscription) {
      subscription.enabled = enabled;
      logger.info(`Webhook ${enabled ? 'enabled' : 'disabled'}: ${name}`);
    }
  }
}

export const webhookManager = new WebhookManager();
