import { PrismaClient } from '@prisma/client';
declare const prisma: PrismaClient<{
    log: ('error' | 'warn' | 'query')[];
}, 'error' | 'warn' | 'query', import('@prisma/client/runtime/client').DefaultArgs>;
export { prisma };
export declare const userService: {
    create(data: {
        username: string;
        passwordHash: string;
        role?: string;
    }): Promise<{
        id: string;
        username: string;
        role: string;
        createdAt: Date;
        passwordHash: string;
        updatedAt: Date;
    }>;
    findByUsername(username: string): Promise<{
        id: string;
        username: string;
        role: string;
        createdAt: Date;
        passwordHash: string;
        updatedAt: Date;
    } | null>;
    findById(id: string): Promise<{
        id: string;
        username: string;
        role: string;
        createdAt: Date;
        passwordHash: string;
        updatedAt: Date;
    } | null>;
    update(id: string, data: Partial<{
        passwordHash: string;
        role: string;
    }>): Promise<{
        id: string;
        username: string;
        role: string;
        createdAt: Date;
        passwordHash: string;
        updatedAt: Date;
    }>;
    delete(id: string): Promise<{
        id: string;
        username: string;
        role: string;
        createdAt: Date;
        passwordHash: string;
        updatedAt: Date;
    }>;
};
export declare const tokenService: {
    create(data: {
        token: string;
        userId: string;
        expiresAt: Date;
    }): Promise<{
        token: string;
        id: string;
        userId: string;
        createdAt: Date;
        expiresAt: Date;
        revoked: boolean;
    }>;
    findByToken(token: string): Promise<({
        user: {
            id: string;
            username: string;
            role: string;
            createdAt: Date;
            passwordHash: string;
            updatedAt: Date;
        };
    } & {
        token: string;
        id: string;
        userId: string;
        createdAt: Date;
        expiresAt: Date;
        revoked: boolean;
    }) | null>;
    revoke(token: string): Promise<{
        token: string;
        id: string;
        userId: string;
        createdAt: Date;
        expiresAt: Date;
        revoked: boolean;
    }>;
    revokeAllByUser(userId: string): Promise<import('@prisma/client').Prisma.BatchPayload>;
    deleteExpired(): Promise<import('@prisma/client').Prisma.BatchPayload>;
};
export declare const chatService: {
    createSession(data: {
        userId?: string;
        mode?: string;
    }): Promise<{
        id: string;
        userId: string | null;
        mode: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getSession(id: string): Promise<({
        messages: {
            id: string;
            role: string;
            content: string;
            createdAt: Date;
            sessionId: string;
        }[];
    } & {
        id: string;
        userId: string | null;
        mode: string;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    addMessage(data: {
        sessionId: string;
        role: string;
        content: string;
    }): Promise<{
        id: string;
        role: string;
        content: string;
        createdAt: Date;
        sessionId: string;
    }>;
    getMessages(sessionId: string, limit?: number): Promise<{
        id: string;
        role: string;
        content: string;
        createdAt: Date;
        sessionId: string;
    }[]>;
    deleteSession(id: string): Promise<{
        id: string;
        userId: string | null;
        mode: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
};
export declare const feedbackService: {
    create(data: {
        userId?: string;
        query: string;
        answer: string;
        rating: string;
        reason?: string;
    }): Promise<{
        query: string;
        id: string;
        answer: string;
        rating: string;
        reason: string | null;
        userId: string | null;
        createdAt: Date;
    }>;
    getRecent(limit?: number): Promise<({
        user: {
            username: string;
        } | null;
    } & {
        query: string;
        id: string;
        answer: string;
        rating: string;
        reason: string | null;
        userId: string | null;
        createdAt: Date;
    })[]>;
    getByRating(rating: 'up' | 'down', limit?: number): Promise<{
        query: string;
        id: string;
        answer: string;
        rating: string;
        reason: string | null;
        userId: string | null;
        createdAt: Date;
    }[]>;
    getStats(): Promise<{
        total: number;
        upCount: number;
        downCount: number;
        upRate: number;
    }>;
};
export declare const knowledgeService: {
    create(data: {
        userId?: string;
        question: string;
        answer: string;
        source?: string;
        verified?: boolean;
    }): Promise<{
        id: string;
        answer: string;
        userId: string | null;
        createdAt: Date;
        updatedAt: Date;
        question: string;
        source: string | null;
        verified: boolean;
    }>;
    search(query: string, limit?: number): Promise<{
        id: string;
        answer: string;
        userId: string | null;
        createdAt: Date;
        updatedAt: Date;
        question: string;
        source: string | null;
        verified: boolean;
    }[]>;
    getAll(verified?: boolean): Promise<{
        id: string;
        answer: string;
        userId: string | null;
        createdAt: Date;
        updatedAt: Date;
        question: string;
        source: string | null;
        verified: boolean;
    }[]>;
    verify(id: string): Promise<{
        id: string;
        answer: string;
        userId: string | null;
        createdAt: Date;
        updatedAt: Date;
        question: string;
        source: string | null;
        verified: boolean;
    }>;
    delete(id: string): Promise<{
        id: string;
        answer: string;
        userId: string | null;
        createdAt: Date;
        updatedAt: Date;
        question: string;
        source: string | null;
        verified: boolean;
    }>;
};
export declare const voiceService: {
    create(data: {
        username?: string;
        text: string;
        emotion: string;
        audioUrl?: string;
    }): Promise<{
        text: string;
        id: string;
        username: string | null;
        createdAt: Date;
        emotion: string;
        audioUrl: string | null;
    }>;
    getRecent(limit?: number): Promise<{
        text: string;
        id: string;
        username: string | null;
        createdAt: Date;
        emotion: string;
        audioUrl: string | null;
    }[]>;
    getByUser(username: string, limit?: number): Promise<{
        text: string;
        id: string;
        username: string | null;
        createdAt: Date;
        emotion: string;
        audioUrl: string | null;
    }[]>;
    deleteOldLogs(daysOld?: number): Promise<import('@prisma/client').Prisma.BatchPayload>;
};
//# sourceMappingURL=database.d.ts.map