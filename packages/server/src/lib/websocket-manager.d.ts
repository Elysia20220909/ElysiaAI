import type { Server } from "node:http";
type MessageType = "chat" | "notification" | "dashboard_update" | "typing" | "presence";
interface WSMessage {
	type: MessageType;
	payload: Record<string, unknown>;
	room?: string;
}
declare class WebSocketManager {
	private wss;
	private clients;
	private rooms;
	initialize(server: Server): void;
	private generateClientId;
	private handleMessage;
	private handleChatMessage;
	private handleTyping;
	private handlePresence;
	private handleDisconnect;
	joinRoom(clientId: string, room: string): void;
	leaveRoom(clientId: string, room: string): void;
	sendToClient(clientId: string, message: WSMessage): void;
	broadcastToRoom(room: string, message: WSMessage, excludeClientId?: string): void;
	broadcast(message: WSMessage): void;
	sendDashboardUpdate(data: Record<string, unknown>): void;
	sendNotification(userId: string, message: string): void;
	private heartbeat;
	getStats(): {
		totalClients: number;
		totalRooms: number;
		clientsByRoom: {
			[k: string]: number;
		};
	};
	close(): void;
}
export declare const wsManager: WebSocketManager;
export {};
//# sourceMappingURL=websocket-manager.d.ts.map
