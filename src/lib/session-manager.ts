/**
 * User Session Management
 * セッション履歴・複数デバイス管理・アクティビティ追跡
 */

import { logger } from './logger';

interface UserSession {
	sessionId: string;
	userId: string;
	deviceInfo: {
		userAgent: string;
		ip: string;
		deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
	};
	createdAt: Date;
	lastActivity: Date;
	expiresAt: Date;
	active: boolean;
	activityLog: Activity[];
}

interface Activity {
	type: 'login' | 'chat' | 'feedback' | 'logout' | 'api_call';
	timestamp: Date;
	details?: Record<string, unknown>;
}

class SessionManager {
  private sessions: Map<string, UserSession>;
  private userSessions: Map<string, Set<string>>; // userId -> sessionIds
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24時間
  private readonly MAX_SESSIONS_PER_USER = 5;

  constructor() {
    this.sessions = new Map();
    this.userSessions = new Map();

    // 定期的な期限切れセッションのクリーンアップ
    setInterval(
      () => {
        this.cleanupExpiredSessions();
      },
      60 * 60 * 1000,
    ); // 1時間ごと
  }

  /**
	 * 新しいセッションを作成
	 */
  createSession(
    userId: string,
    userAgent: string,
    ip: string,
  ): UserSession | null {
    // ユーザーの既存セッション数をチェック
    const existingSessions = this.userSessions.get(userId);
    if (
      existingSessions &&
			existingSessions.size >= this.MAX_SESSIONS_PER_USER
    ) {
      // 最も古いセッションを削除
      const oldestSession = this.getOldestSession(userId);
      if (oldestSession) {
        this.terminateSession(oldestSession.sessionId);
      }
    }

    const sessionId = this.generateSessionId();
    const now = new Date();

    const session: UserSession = {
      sessionId,
      userId,
      deviceInfo: {
        userAgent,
        ip,
        deviceType: this.detectDeviceType(userAgent),
      },
      createdAt: now,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + this.SESSION_TIMEOUT),
      active: true,
      activityLog: [
        {
          type: 'login',
          timestamp: now,
        },
      ],
    };

    this.sessions.set(sessionId, session);

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)?.add(sessionId);

    logger.info('Session created', {
      sessionId,
      userId,
      deviceType: session.deviceInfo.deviceType,
    });

    return session;
  }

  /**
	 * セッションIDを生成
	 */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
	 * デバイスタイプを検出
	 */
  private detectDeviceType(
    userAgent: string,
  ): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone/i.test(ua)) return 'mobile';
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    if (/windows|macintosh|linux/i.test(ua)) return 'desktop';
    return 'unknown';
  }

  /**
	 * セッションを検証
	 */
  validateSession(sessionId: string): UserSession | null {
    const session = this.sessions.get(sessionId);

    if (!session) return null;
    if (!session.active) return null;
    if (session.expiresAt < new Date()) {
      this.terminateSession(sessionId);
      return null;
    }

    // 最終アクティビティを更新
    session.lastActivity = new Date();
    return session;
  }

  /**
	 * アクティビティを記録
	 */
  recordActivity(
    sessionId: string,
    type: Activity['type'],
    details?: Record<string, unknown>,
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.activityLog.push({
      type,
      timestamp: new Date(),
      details,
    });

    session.lastActivity = new Date();

    // アクティビティログが大きくなりすぎないよう制限
    if (session.activityLog.length > 100) {
      session.activityLog = session.activityLog.slice(-100);
    }
  }

  /**
	 * セッションを終了
	 */
  terminateSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.active = false;
    this.recordActivity(sessionId, 'logout');

    const userSessions = this.userSessions.get(session.userId);
    userSessions?.delete(sessionId);

    logger.info('Session terminated', { sessionId, userId: session.userId });
  }

  /**
	 * ユーザーの全セッションを取得
	 */
  getUserSessions(userId: string) {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];

    return Array.from(sessionIds)
      .map((id) => this.sessions.get(id))
      .filter((s): s is UserSession => s !== undefined)
      .map((session) => ({
        sessionId: session.sessionId,
        deviceType: session.deviceInfo.deviceType,
        ip: session.deviceInfo.ip,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        active: session.active,
        activityCount: session.activityLog.length,
      }));
  }

  /**
	 * セッションの詳細を取得
	 */
  getSessionDetails(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      deviceInfo: session.deviceInfo,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt,
      active: session.active,
      activityLog: session.activityLog.slice(-20), // 最新20件のみ
    };
  }

  /**
	 * 最も古いセッションを取得
	 */
  private getOldestSession(userId: string): UserSession | undefined {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return undefined;

    let oldest: UserSession | undefined;
    for (const id of sessionIds) {
      const session = this.sessions.get(id);
      if (!session) continue;
      if (!oldest || session.createdAt < oldest.createdAt) {
        oldest = session;
      }
    }
    return oldest;
  }

  /**
	 * 期限切れセッションをクリーンアップ
	 */
  private cleanupExpiredSessions() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now || !session.active) {
        this.sessions.delete(sessionId);
        this.userSessions.get(session.userId)?.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Expired sessions cleaned up', { count: cleanedCount });
    }
  }

  /**
	 * セッション統計を取得
	 */
  getStats() {
    const allSessions = Array.from(this.sessions.values());
    const activeSessions = allSessions.filter((s) => s.active);

    return {
      totalSessions: allSessions.length,
      activeSessions: activeSessions.length,
      uniqueUsers: this.userSessions.size,
      deviceBreakdown: {
        mobile: activeSessions.filter(
          (s) => s.deviceInfo.deviceType === 'mobile',
        ).length,
        tablet: activeSessions.filter(
          (s) => s.deviceInfo.deviceType === 'tablet',
        ).length,
        desktop: activeSessions.filter(
          (s) => s.deviceInfo.deviceType === 'desktop',
        ).length,
      },
    };
  }
}

export const sessionManager = new SessionManager();
