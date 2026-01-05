/**
 * エリシア WebSocket ハンドラー
 * リアルタイムマルチユーザーチャット実装
 */

import { Elysia } from 'elysia';
import { ELISIA_DEFAULT } from '../character/elisia.config';

interface ChatUser {
  id: string;
  username: string;
  joinedAt: number;
  lastSeen: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: number;
  emotion?: string;
}

/**
 * WebSocket ルームマネージャー
 */
export class ElisiaChatRoom {
  private users: Map<string, ChatUser> = new Map();
  private messageHistory: ChatMessage[] = [];
  private maxMessages: number = 100;
  public userConnections: Map<string, WebSocket> = new Map();

  /**
   * ユーザーを追加
   */
  addUser(userId: string, username: string, ws: WebSocket): ChatUser {
    const user: ChatUser = {
      id: userId,
      username,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    this.users.set(userId, user);
    this.userConnections.set(userId, ws);

    return user;
  }

  /**
   * ユーザーを削除
   */
  removeUser(userId: string): void {
    this.users.delete(userId);
    this.userConnections.delete(userId);
  }

  /**
   * メッセージを追加
   */
  addMessage(message: ChatMessage): void {
    // メッセージ履歴に追加
    this.messageHistory.push(message);

    // 最大メッセージ数を超えたら古いものを削除
    if (this.messageHistory.length > this.maxMessages) {
      this.messageHistory.shift();
    }
  }

  /**
   * 全ユーザーにメッセージをブロードキャスト
   */
  broadcastMessage(message: ChatMessage): void {
    const payload = JSON.stringify({
      type: 'message',
      data: message,
    });

    this.userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * ユーザーリストを全員に配信
   */
  broadcastUserList(): void {
    const userList = Array.from(this.users.values()).map((u) => ({
      id: u.id,
      username: u.username,
      joinedAt: u.joinedAt,
    }));

    const payload = JSON.stringify({
      type: 'user_list',
      data: {
        count: userList.length,
        users: userList,
      },
    });

    this.userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * ユーザー参加通知をブロードキャスト
   */
  broadcastUserJoined(user: ChatUser): void {
    const payload = JSON.stringify({
      type: 'user_joined',
      data: {
        userId: user.id,
        username: user.username,
        timestamp: user.joinedAt,
      },
    });

    this.userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * ユーザー退出通知をブロードキャスト
   */
  broadcastUserLeft(userId: string, username: string): void {
    const payload = JSON.stringify({
      type: 'user_left',
      data: {
        userId,
        username,
        timestamp: Date.now(),
      },
    });

    this.userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * メッセージ履歴を取得
   */
  getMessageHistory(limit: number = 50): ChatMessage[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * ユーザーを取得
   */
  getUser(userId: string): ChatUser | undefined {
    return this.users.get(userId);
  }

  /**
   * 全ユーザーを取得
   */
  getAllUsers(): ChatUser[] {
    return Array.from(this.users.values());
  }

  /**
   * ユーザー数を取得
   */
  getUserCount(): number {
    return this.users.size;
  }

  /**
   * エリシアからのメッセージを生成
   */
  generateElisiaMessage(userMessage: string): ChatMessage {
    const responses = [
      'にゃん♪ いいですね〜',
      'だよぉ〜 素敵だね',
      'えっ、ほんと？♡',
      'よかったー〜',
      'わかりました！',
      'ありがとうございます♡',
    ];

    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    return {
      id: `elisia-${Date.now()}`,
      userId: 'elisia-system',
      username: 'エリシア ♡',
      content: randomResponse,
      timestamp: Date.now(),
      emotion: 'joy',
    };
  }
}

// グローバルチャットルームインスタンス
let chatRoom = new ElisiaChatRoom();

/**
 * WebSocket ハンドラー登録
 */
export function registerElisiaWebSocketRoutes(app: Elysia): Elysia {
  /**
   * WebSocket エンドポイント
   */
  app.ws('/elisia-chat/ws', {
    open(ws: any) {
      // クエリから userId と username を取得
      const url = new URL(
        `http://localhost${ws.url || ''}`,
        'http://localhost'
      );
      const userId =
        url.searchParams.get('userId') || `user-${Date.now()}`;
      const username = url.searchParams.get('username') || 'ゲスト';

      // ユーザーを追加
      const user = chatRoom.addUser(userId, username, ws);

      // 参加通知
      chatRoom.broadcastUserJoined(user);
      chatRoom.broadcastUserList();

      // メッセージ履歴を新ユーザーに送信
      const history = chatRoom.getMessageHistory(50);
      ws.send(
        JSON.stringify({
          type: 'history',
          data: history,
        })
      );

      console.log(`✅ User joined: ${username} (${userId})`);
    },

    message(ws: any, message: any) {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'chat') {
          const userId = data.userId || `user-${Date.now()}`;
          const user = chatRoom.getUser(userId);

          if (!user) {
            ws.send(
              JSON.stringify({
                type: 'error',
                data: { message: 'User not found' },
              })
            );
            return;
          }

          // ユーザーメッセージを保存
          const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            userId,
            username: user.username,
            content: data.content,
            timestamp: Date.now(),
            emotion: data.emotion || 'neutral',
          };

          chatRoom.addMessage(userMsg);
          chatRoom.broadcastMessage(userMsg);

          // エリシアからの返信（1秒後）
          setTimeout(() => {
            const elisiaMsg = chatRoom.generateElisiaMessage(
              data.content
            );
            chatRoom.addMessage(elisiaMsg);
            chatRoom.broadcastMessage(elisiaMsg);
          }, 1000);
        } else if (data.type === 'typing') {
          // タイピング中通知
          const payload = JSON.stringify({
            type: 'typing',
            data: {
              userId: data.userId,
              username: data.username,
              isTyping: data.isTyping,
            },
          });

          chatRoom.userConnections.forEach((wsConn) => {
            if (wsConn.readyState === WebSocket.OPEN) {
              wsConn.send(payload);
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(
          JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' },
          })
        );
      }
    },

    close(ws: any) {
      // ユーザーを特定（簡易版）
      // 実際には接続管理テーブルから検索
      const allUsers = chatRoom.getAllUsers();
      const lastUser = allUsers[allUsers.length - 1];

      if (lastUser) {
        chatRoom.broadcastUserLeft(lastUser.id, lastUser.username);
        chatRoom.removeUser(lastUser.id);
        chatRoom.broadcastUserList();

        console.log(`❌ User left: ${lastUser.username}`);
      }
    },
  });

  /**
   * GET /elisia-chat/users
   * 接続ユーザーリスト取得
   */
  app.get('/elisia-chat/users', () => {
    const users = chatRoom.getAllUsers();
    return {
      ok: true,
      count: users.length,
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        joinedAt: u.joinedAt,
      })),
    };
  });

  /**
   * GET /elisia-chat/history
   * メッセージ履歴取得
   */
  app.get('/elisia-chat/history', ({ query }: { query: Record<string, any> }) => {
    const limit = parseInt(query.limit as string) || 50;
    const history = chatRoom.getMessageHistory(limit);
    return {
      ok: true,
      count: history.length,
      messages: history,
    };
  });

  /**
   * POST /elisia-chat/clear
   * チャット履歴をクリア（管理者用）
   */
  app.post('/elisia-chat/clear', ({ headers }: { headers: Record<string, string | undefined> }) => {
    // 簡易認証（実際には JWT を検証）
    const adminKey = headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return { error: 'Unauthorized', status: 401 };
    }

    chatRoom = new ElisiaChatRoom();
    return { ok: true, message: 'Chat history cleared' };
  });

  return app;
}

// クラスは上部で export 済み
