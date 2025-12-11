interface APIKey {
    key: string;
    name: string;
    userId?: string;
    createdAt: Date;
    expiresAt?: Date;
    enabled: boolean;
    rateLimit: number;
    usage: {
        totalRequests: number;
        lastUsed?: Date;
        requestsThisHour: number;
        hourStart: Date;
    };
}
declare class APIKeyManager {
  private keys;
  private readonly KEY_PREFIX;
  constructor();
  private loadKeysFromEnv;
  generateKey(options: {
        name: string;
        userId?: string;
        rateLimit?: number;
        expiresInDays?: number;
    }): APIKey;
  validateKey(key: string): {
        valid: boolean;
        reason?: string;
        apiKey?: APIKey;
    };
  recordUsage(key: string): void;
  revokeKey(key: string): boolean;
  deleteKey(key: string): boolean;
  listKeys(): {
        name: string;
        userId: string | undefined;
        createdAt: Date;
        expiresAt: Date | undefined;
        enabled: boolean;
        rateLimit: number;
        usage: {
            totalRequests: number;
            lastUsed: Date | undefined;
            requestsThisHour: number;
        };
        keyPreview: string;
    }[];
  getUserKeys(userId: string): {
        name: string;
        createdAt: Date;
        expiresAt: Date | undefined;
        enabled: boolean;
        rateLimit: number;
        usage: {
            totalRequests: number;
            lastUsed?: Date;
            requestsThisHour: number;
            hourStart: Date;
        };
        keyPreview: string;
    }[];
  getUsageStats(): {
        totalKeys: number;
        activeKeys: number;
        expiredKeys: number;
        totalRequests: number;
        topKeys: {
            name: string;
            requests: number;
        }[];
    };
}
export declare const apiKeyManager: APIKeyManager;
export {};
//# sourceMappingURL=api-key-manager.d.ts.map