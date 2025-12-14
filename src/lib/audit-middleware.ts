/**
 * Audit Middleware
 * 全APIリクエストを自動的に監査ログに記録
 */

import type { Context } from "elysia";
import { auditLogger } from "./audit-logger";

interface AuditMiddlewareOptions {
	excludePaths?: string[];
	excludeMethods?: string[];
	includeBody?: boolean;
}

interface AuditData {
	startTime: number;
	url: string;
	method: string;
}

// WeakMapで型安全にリクエストデータを保存
const auditDataMap = new WeakMap<Request, AuditData>();

export function createAuditMiddleware(options: AuditMiddlewareOptions = {}) {
	const {
		excludePaths = ["/health", "/metrics", "/swagger"],
		excludeMethods = ["OPTIONS"],
		includeBody = false,
	} = options;

	return {
		beforeHandle: async (context: Context & { request: Request }) => {
			const { request } = context;
			const url = new URL(request.url);

			// 除外パスチェック
			if (excludePaths.some((path) => url.pathname.startsWith(path))) {
				return;
			}

			// 除外メソッドチェック
			if (excludeMethods.includes(request.method)) {
				return;
			}

			// リクエスト情報を一時保存（型安全なWeakMap使用）
			auditDataMap.set(request, {
				startTime: Date.now(),
				url: url.pathname,
				method: request.method,
			});
		},

		afterHandle: async (
			context: Context & { request: Request; set: { status?: number } },
			response?: Response,
		) => {
			const { request, set } = context;

			// 監査対象外の場合はスキップ
			const auditData = auditDataMap.get(request);
			if (!auditData) {
				return;
			}

			const url = new URL(request.url);
			const statusCode = set.status || 200;

			// ユーザー情報を取得（JWT認証があれば）
			const auth = request.headers.get("authorization") || "";
			let userId: string | undefined;
			if (auth.startsWith("Bearer ")) {
				try {
					const jwt = await import("jsonwebtoken");
					const decoded = jwt.verify(auth.substring(7), process.env.JWT_SECRET || "dev-secret") as {
						username?: string;
					};
					userId = decoded.username;
				} catch {
					// JWT検証失敗時は無視
				}
			}

			// アクション判定
			const action = determineAction(request.method, url.pathname);
			const resource = determineResource(url.pathname);
			const resourceId = extractResourceId(url.pathname);

			// 監査ログに記録
			auditLogger.log({
				userId,
				action,
				resource,
				resourceId,
				method: request.method,
				path: url.pathname,
				ipAddress:
					request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
				userAgent: request.headers.get("user-agent") || "unknown",
				statusCode,
			});

			// 一時データをクリア（WeakMapから削除）
			auditDataMap.delete(request);
		},

		onError: async (context: Context & { request: Request }, error: Error) => {
			const { request } = context;

			// 監査対象外の場合はスキップ
			const auditData = auditDataMap.get(request);
			if (!auditData) {
				return;
			}

			const url = new URL(request.url);

			auditLogger.log({
				action: "ERROR",
				resource: determineResource(url.pathname),
				method: request.method,
				path: url.pathname,
				ipAddress:
					request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
				userAgent: request.headers.get("user-agent") || "unknown",
				statusCode: 500,
				error: error.message,
			});
		},
	};
}

/**
 * HTTPメソッドとパスからアクションを判定
 */
function determineAction(method: string, path: string): string {
	if (path.includes("/login") || path.includes("/auth")) return "AUTH";
	if (path.includes("/register")) return "REGISTER";
	if (path.includes("/logout")) return "LOGOUT";

	switch (method) {
		case "GET":
			return "READ";
		case "POST":
			return "CREATE";
		case "PUT":
		case "PATCH":
			return "UPDATE";
		case "DELETE":
			return "DELETE";
		default:
			return method;
	}
}

/**
 * パスからリソース種別を判定
 */
function determineResource(path: string): string {
	if (path.includes("/feedback")) return "feedback";
	if (path.includes("/knowledge")) return "knowledge";
	if (path.includes("/user")) return "user";
	if (path.includes("/chat")) return "chat";
	if (path.includes("/upload") || path.includes("/files")) return "file";
	if (path.includes("/jobs")) return "job";
	if (path.includes("/cron")) return "cron";
	if (path.includes("/audit")) return "audit";
	if (path.includes("/admin")) return "admin";
	if (path.includes("/session")) return "session";
	if (path.includes("/api-key")) return "api-key";

	return "unknown";
}

/**
 * パスからリソースIDを抽出
 */
function extractResourceId(path: string): string | undefined {
	// /resource/:id のパターンにマッチ
	const matches = path.match(/\/([^/]+)\/([a-zA-Z0-9-]+)$/);
	if (matches?.[2]) {
		return matches[2];
	}
	return undefined;
}
