interface UserSession {
    sessionId: string;
    userId: string;
    deviceInfo: {
        userAgent: string;
        ip: string;
        deviceType: "mobile" | "tablet" | "desktop" | "unknown";
    };
    createdAt: Date;
    lastActivity: Date;
    expiresAt: Date;
    active: boolean;
    activityLog: Activity[];
}
interface Activity {
    type: "login" | "chat" | "feedback" | "logout" | "api_call";
    timestamp: Date;
    details?: Record<string, unknown>;
}
declare class SessionManager {
    private sessions;
    private userSessions;
    private readonly SESSION_TIMEOUT;
    private readonly MAX_SESSIONS_PER_USER;
    constructor();
    createSession(userId: string, userAgent: string, ip: string): UserSession | null;
    private generateSessionId;
    private detectDeviceType;
    validateSession(sessionId: string): UserSession | null;
    recordActivity(sessionId: string, type: Activity["type"], details?: Record<string, unknown>): void;
    terminateSession(sessionId: string): void;
    getUserSessions(userId: string): {
        sessionId: string;
        deviceType: "unknown" | "mobile" | "tablet" | "desktop";
        ip: string;
        createdAt: Date;
        lastActivity: Date;
        active: boolean;
        activityCount: number;
    }[];
    getSessionDetails(sessionId: string): {
        sessionId: string;
        userId: string;
        deviceInfo: {
            userAgent: string;
            ip: string;
            deviceType: "mobile" | "tablet" | "desktop" | "unknown";
        };
        createdAt: Date;
        lastActivity: Date;
        expiresAt: Date;
        active: boolean;
        activityLog: Activity[];
    } | null;
    private getOldestSession;
    private cleanupExpiredSessions;
    getStats(): {
        totalSessions: number;
        activeSessions: number;
        uniqueUsers: number;
        deviceBreakdown: {
            mobile: number;
            tablet: number;
            desktop: number;
        };
    };
}
export declare const sessionManager: SessionManager;
export {};
//# sourceMappingURL=session-manager.d.ts.map