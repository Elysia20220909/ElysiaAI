/**
 * WebSocket Manager
 * リアルタイム通信（チャット、通知、ダッシュボード更新）
 */

import { WebSocketServer, WebSocket, type WebSocket as WSType } from "ws";
import type { Server } from "node:http";
import { logger } from "./logger";

interface WSClient {
	ws: WebSocket;
	userId?: string;
	rooms: Set<string>;
	lastActivity: Date;
}

type MessageType =
	| "chat"
	| "notification"
	| "dashboard_update"
	| "typing"
	| "presence";

interface WSMessage {
	type: MessageType;
	payload: Record<string, unknown>;
	room?: string;
}

class WebSocketManager {
	private wss: WebSocketServer | null = null;
	private clients: Map<string, WSClient> = new Map();
	private rooms: Map<string, Set<string>> = new Map();

	/**
	 * WebSocketサーバーを初期化
	 */
	initialize(server: Server) {
		this.wss = new WebSocketServer({ server, path: "/ws" });

		this.wss.on("connection", (ws: WebSocket) => {
			const clientId = this.generateClientId();
			const client: WSClient = {
				ws,
				rooms: new Set(["global"]),
				lastActivity: new Date(),
			};

			this.clients.set(clientId, client);
			this.joinRoom(clientId, "global");

			logger.info("WebSocket client connected", { clientId });

			// メッセージ受信
			ws.on("message", (data: Buffer) => {
				this.handleMessage(clientId, data);
			});

			// 切断
			ws.on("close", () => {
				this.handleDisconnect(clientId);
			});

			// エラー
			ws.on("error", (error) => {
				logger.error("WebSocket error", error);
			});

			// 接続通知
			this.sendToClient(clientId, {
				type: "notification",
				payload: {
					message: "接続しました",
					clientId,
				},
			});
		});

		// ハートビート（30秒ごと）
		setInterval(() => {
			this.heartbeat();
		}, 30000);

		logger.info("WebSocket server initialized", { path: "/ws" });
	}

	/**
	 * クライアントID生成
	 */
	private generateClientId(): string {
		return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * メッセージ処理
	 */
	private handleMessage(clientId: string, data: Buffer) {
		try {
			const message: WSMessage = JSON.parse(data.toString());
			const client = this.clients.get(clientId);

			if (!client) return;

			client.lastActivity = new Date();

			switch (message.type) {
				case "chat":
					this.handleChatMessage(clientId, message);
					break;

				case "typing":
					this.handleTyping(clientId, message);
					break;

				case "presence":
					this.handlePresence(clientId, message);
					break;

				default:
					logger.warn("Unknown message type", { type: message.type });
			}
		} catch (error) {
			logger.error("Failed to parse WebSocket message", error as Error);
		}
	}

	/**
	 * チャットメッセージ処理
	 */
	private handleChatMessage(clientId: string, message: WSMessage) {
		const room = message.room || "global";

		// 同じルームの全クライアントに送信
		this.broadcastToRoom(room, {
			type: "chat",
			payload: {
				...message.payload,
				clientId,
				timestamp: new Date(),
			},
		});

		logger.debug("Chat message broadcasted", { clientId, room });
	}

	/**
	 * タイピング通知処理
	 */
	private handleTyping(clientId: string, message: WSMessage) {
		const room = message.room || "global";
		const client = this.clients.get(clientId);

		this.broadcastToRoom(
			room,
			{
				type: "typing",
				payload: {
					clientId,
					userId: client?.userId,
					isTyping: message.payload.isTyping,
				},
			},
			clientId,
		); // 送信者以外に送信
	}

	/**
	 * プレゼンス（在席状態）処理
	 */
	private handlePresence(clientId: string, message: WSMessage) {
		const client = this.clients.get(clientId);
		if (!client) return;

		client.userId = message.payload.userId as string;

		// ルームの全員に通知
		for (const room of client.rooms) {
			this.broadcastToRoom(room, {
				type: "presence",
				payload: {
					clientId,
					userId: client.userId,
					status: message.payload.status,
				},
			});
		}
	}

	/**
	 * 切断処理
	 */
	private handleDisconnect(clientId: string) {
		const client = this.clients.get(clientId);
		if (!client) return;

		// ルームから削除
		for (const room of client.rooms) {
			this.leaveRoom(clientId, room);
		}

		this.clients.delete(clientId);

		logger.info("WebSocket client disconnected", { clientId });
	}

	/**
	 * ルームに参加
	 */
	joinRoom(clientId: string, room: string) {
		const client = this.clients.get(clientId);
		if (!client) return;

		client.rooms.add(room);

		if (!this.rooms.has(room)) {
			this.rooms.set(room, new Set());
		}
		this.rooms.get(room)?.add(clientId);

		logger.debug("Client joined room", { clientId, room });
	}

	/**
	 * ルームから退出
	 */
	leaveRoom(clientId: string, room: string) {
		const client = this.clients.get(clientId);
		if (!client) return;

		client.rooms.delete(room);
		this.rooms.get(room)?.delete(clientId);

		if (this.rooms.get(room)?.size === 0) {
			this.rooms.delete(room);
		}

		logger.debug("Client left room", { clientId, room });
	}

	/**
	 * 特定クライアントに送信
	 */
	sendToClient(clientId: string, message: WSMessage) {
		const client = this.clients.get(clientId);
		if (!client || client.ws.readyState !== WebSocket.OPEN) return;

		client.ws.send(JSON.stringify(message));
	}

	/**
	 * ルーム内の全クライアントに送信
	 */
	broadcastToRoom(room: string, message: WSMessage, excludeClientId?: string) {
		const clientIds = this.rooms.get(room);
		if (!clientIds) return;

		for (const clientId of clientIds) {
			if (excludeClientId && clientId === excludeClientId) continue;
			this.sendToClient(clientId, message);
		}
	}

	/**
	 * 全クライアントに送信
	 */
	broadcast(message: WSMessage) {
		for (const clientId of this.clients.keys()) {
			this.sendToClient(clientId, message);
		}
	}

	/**
	 * ダッシュボード更新を送信
	 */
	sendDashboardUpdate(data: Record<string, unknown>) {
		this.broadcastToRoom("dashboard", {
			type: "dashboard_update",
			payload: data,
		});
	}

	/**
	 * 通知を送信
	 */
	sendNotification(userId: string, message: string) {
		// ユーザーIDに紐づく全クライアントに送信
		for (const [clientId, client] of this.clients.entries()) {
			if (client.userId === userId) {
				this.sendToClient(clientId, {
					type: "notification",
					payload: {
						message,
						timestamp: new Date(),
					},
				});
			}
		}
	}

	/**
	 * ハートビート（切断されたクライアントの検出）
	 */
	private heartbeat() {
		const now = new Date();
		const timeout = 60 * 1000; // 60秒

		for (const [clientId, client] of this.clients.entries()) {
			const elapsed = now.getTime() - client.lastActivity.getTime();

			if (elapsed > timeout) {
				logger.info("Client timeout", { clientId });
				client.ws.close();
				this.handleDisconnect(clientId);
			} else {
				// Ping送信
				if (client.ws.readyState === WebSocket.OPEN) {
					client.ws.ping();
				}
			}
		}
	}

	/**
	 * 統計情報を取得
	 */
	getStats() {
		return {
			totalClients: this.clients.size,
			totalRooms: this.rooms.size,
			clientsByRoom: Object.fromEntries(
				Array.from(this.rooms.entries()).map(([room, clients]) => [
					room,
					clients.size,
				]),
			),
		};
	}

	/**
	 * クリーンアップ
	 */
	close() {
		if (this.wss) {
			this.wss.close();
			logger.info("WebSocket server closed");
		}
	}
}

export const wsManager = new WebSocketManager();
