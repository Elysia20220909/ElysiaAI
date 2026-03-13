export type WebhookEvent =
	| "user.registered"
	| "user.login"
	| "chat.message"
	| "feedback.created"
	| "error.critical"
	| "backup.completed"
	| "rate_limit.exceeded"
	| "system.health_check_failed";
interface WebhookSubscription {
	url: string;
	events: WebhookEvent[];
	secret?: string;
	enabled: boolean;
}
declare class WebhookManager {
	private subscriptions;
	constructor();
	private loadSubscriptionsFromEnv;
	subscribe(name: string, subscription: WebhookSubscription): void;
	unsubscribe(name: string): void;
	emit(event: WebhookEvent, data: Record<string, unknown>): Promise<void>;
	private sendWebhook;
	private generateSignature;
	getSubscriptions(): {
		name: string;
		events: WebhookEvent[];
		enabled: boolean;
	}[];
	toggleSubscription(name: string, enabled: boolean): void;
}
export declare const webhookManager: WebhookManager;
export {};
//# sourceMappingURL=webhook-events.d.ts.map
