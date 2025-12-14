/**
 * Email Notification Service
 * 重要イベント・エラーのメール通知
 */

import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import { logger } from "./logger";

interface EmailConfig {
	enabled: boolean;
	host: string;
	port: number;
	secure: boolean;
	auth: {
		user: string;
		pass: string;
	};
	from: string;
}

interface EmailOptions {
	to: string | string[];
	subject: string;
	text?: string;
	html?: string;
}

class EmailNotifier {
	private transporter?: Transporter;
	private config: EmailConfig;

	constructor() {
		this.config = {
			enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === "true",
			host: process.env.SMTP_HOST || "smtp.gmail.com",
			port: Number(process.env.SMTP_PORT) || 587,
			secure: process.env.SMTP_SECURE === "true",
			auth: {
				user: process.env.SMTP_USER || "",
				pass: process.env.SMTP_PASS || "",
			},
			from: process.env.EMAIL_FROM || "noreply@elysia-ai.com",
		};

		if (this.config.enabled && this.config.auth.user && this.config.auth.pass) {
			this.initializeTransporter();
		}
	}

	/**
	 * メールトランスポーターを初期化
	 */
	private initializeTransporter() {
		try {
			this.transporter = nodemailer.createTransport({
				host: this.config.host,
				port: this.config.port,
				secure: this.config.secure,
				auth: this.config.auth,
			});

			logger.info("Email transporter initialized", {
				host: this.config.host,
				port: this.config.port,
			});
		} catch (error) {
			logger.error("Failed to initialize email transporter", error as Error);
		}
	}

	/**
	 * メールを送信
	 */
	async send(options: EmailOptions): Promise<boolean> {
		if (!this.config.enabled) {
			logger.debug("Email notifications are disabled");
			return false;
		}

		if (!this.transporter) {
			logger.warn("Email transporter not initialized");
			return false;
		}

		try {
			const info = await this.transporter.sendMail({
				from: this.config.from,
				to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
				subject: options.subject,
				text: options.text,
				html: options.html,
			});

			logger.info("Email sent", {
				messageId: info.messageId,
				to: options.to,
				subject: options.subject,
			});

			return true;
		} catch (error) {
			logger.error("Failed to send email", error as Error);
			return false;
		}
	}

	/**
	 * エラー通知メールを送信
	 */
	async sendErrorNotification(error: Error, context?: Record<string, unknown>) {
		const adminEmail = process.env.ADMIN_EMAIL;
		if (!adminEmail) return;

		const html = `
			<h2>🚨 エリシアAI - エラー発生</h2>
			<p><strong>エラーメッセージ:</strong> ${error.message}</p>
			<p><strong>発生時刻:</strong> ${new Date().toLocaleString("ja-JP")}</p>
			${context ? `<p><strong>コンテキスト:</strong> <pre>${JSON.stringify(context, null, 2)}</pre></p>` : ""}
			${error.stack ? `<p><strong>スタックトレース:</strong> <pre>${error.stack}</pre></p>` : ""}
		`;

		await this.send({
			to: adminEmail,
			subject: `[エリシアAI] エラー通知: ${error.message}`,
			html,
		});
	}

	/**
	 * ユーザー登録通知メールを送信
	 */
	async sendWelcomeEmail(userEmail: string, userName: string) {
		const html = `
			<h2>🎉 エリシアAIへようこそ！</h2>
			<p>こんにちは、${userName}さん♡</p>
			<p>エリシアAIのアカウント登録が完了しました！</p>
			<p>さっそくチャットを始めてみましょう！</p>
			<hr>
			<p><small>このメールに心当たりがない場合は、無視してください。</small></p>
		`;

		await this.send({
			to: userEmail,
			subject: "エリシアAIへようこそ！",
			html,
		});
	}

	/**
	 * バックアップ完了通知メールを送信
	 */
	async sendBackupNotification(backupInfo: { file: string; size: number; duration: number }) {
		const adminEmail = process.env.ADMIN_EMAIL;
		if (!adminEmail) return;

		const html = `
			<h2>✅ 自動バックアップ完了</h2>
			<p><strong>ファイル:</strong> ${backupInfo.file}</p>
			<p><strong>サイズ:</strong> ${(backupInfo.size / 1024 / 1024).toFixed(2)} MB</p>
			<p><strong>処理時間:</strong> ${backupInfo.duration}ms</p>
			<p><strong>完了時刻:</strong> ${new Date().toLocaleString("ja-JP")}</p>
		`;

		await this.send({
			to: adminEmail,
			subject: "[エリシアAI] 自動バックアップ完了",
			html,
		});
	}

	/**
	 * ヘルスチェック失敗通知メールを送信
	 */
	async sendHealthCheckFailure(service: string, details: string) {
		const adminEmail = process.env.ADMIN_EMAIL;
		if (!adminEmail) return;

		const html = `
			<h2>⚠️ ヘルスチェック失敗</h2>
			<p><strong>サービス:</strong> ${service}</p>
			<p><strong>詳細:</strong> ${details}</p>
			<p><strong>発生時刻:</strong> ${new Date().toLocaleString("ja-JP")}</p>
			<p>早急に確認してください。</p>
		`;

		await this.send({
			to: adminEmail,
			subject: `[エリシアAI] ヘルスチェック失敗: ${service}`,
			html,
		});
	}

	/**
	 * メール通知のステータスを取得
	 */
	getStatus() {
		return {
			enabled: this.config.enabled,
			configured: !!this.transporter,
			host: this.config.host,
			port: this.config.port,
			from: this.config.from,
		};
	}
}

export const emailNotifier = new EmailNotifier();
