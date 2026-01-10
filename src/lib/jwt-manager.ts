/**
 * JWT トークン管理サービス
 * アクセストークンとリフレッシュトークンの発行・検証・ローテーション
 */

import { logger } from './logger';

type RedisClientType = any;

export interface TokenPayload {
  userId: string;
  username: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // 秒数
}

export interface TokenValidation {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
  expired?: boolean;
}

export class JWTManager {
  private redis: RedisClientType | null = null;
  private readonly ACCESS_TOKEN_EXPIRY = 15 * 60;  // 15分
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60;  // 7日
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

    // 本番環境でデフォルトシークレットを使用していないか確認
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        logger.error('⚠️ 本番環境でデフォルトのJWTシークレットが使用されています！');
        throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in production');
      }
    }
  }

  async initialize(): Promise<void> {
    try {
      // @ts-ignore - redis is optional dependency
      const redis = (await import('redis').catch(() => null)) as any;
      if (!redis) {
        logger.warn('Redis未インストール。トークン無効化機能が制限されます。');
        return;
      }

      this.redis = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      await this.redis.connect();
      logger.info('JWT Manager initialized with Redis');
    } catch (error) {
      logger.error(`Failed to initialize JWT Manager: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      logger.info('JWT Manager disconnected');
    }
  }

  /**
   * トークンペアを生成
   */
  async generateTokenPair(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);

    // アクセストークンのペイロード
    const accessPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + this.ACCESS_TOKEN_EXPIRY,
    };

    // リフレッシュトークンのペイロード
    const refreshPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + this.REFRESH_TOKEN_EXPIRY,
    };

    // JWT署名（簡易実装 - 本番環境では jsonwebtoken ライブラリを使用推奨）
    const accessToken = await this.signToken(accessPayload, this.JWT_SECRET);
    const refreshToken = await this.signToken(refreshPayload, this.JWT_REFRESH_SECRET);

    // リフレッシュトークンをRedisに保存
    if (this.redis) {
      const tokenKey = `refresh_token:${payload.userId}:${refreshToken}`;
      await this.redis.set(tokenKey, '1', { EX: this.REFRESH_TOKEN_EXPIRY });
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    };
  }

  /**
   * アクセストークンを検証
   */
  async validateAccessToken(token: string): Promise<TokenValidation> {
    try {
      // トークンが無効化されているかチェック
      if (await this.isTokenRevoked(token)) {
        return {
          valid: false,
          error: 'Token has been revoked',
        };
      }

      const payload = await this.verifyToken(token, this.JWT_SECRET);
      const now = Math.floor(Date.now() / 1000);

      // 有効期限チェック
      if (payload.exp && payload.exp < now) {
        return {
          valid: false,
          expired: true,
          error: 'Token expired',
        };
      }

      return {
        valid: true,
        payload,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      };
    }
  }

  /**
   * リフレッシュトークンを検証して新しいトークンペアを発行
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair | null> {
    try {
      // リフレッシュトークンを検証
      const payload = await this.verifyToken(refreshToken, this.JWT_REFRESH_SECRET);
      const now = Math.floor(Date.now() / 1000);

      // 有効期限チェック
      if (payload.exp && payload.exp < now) {
        return null;
      }

      // Redisにリフレッシュトークンが存在するかチェック
      if (this.redis) {
        const tokenKey = `refresh_token:${payload.userId}:${refreshToken}`;
        const exists = await this.redis.exists(tokenKey);
        if (!exists) {
          logger.warn(`Refresh token not found in Redis: ${payload.userId}`);
          return null;
        }

        // 古いリフレッシュトークンを削除（ローテーション）
        await this.redis.del(tokenKey);
      }

      // 新しいトークンペアを生成
      return this.generateTokenPair({
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
      });
    } catch (error) {
      logger.error(`Failed to refresh tokens: ${error}`);
      return null;
    }
  }

  /**
   * トークンを無効化（ログアウト時など）
   */
  async revokeToken(token: string, userId?: string): Promise<void> {
    if (!this.redis) {
      logger.warn('Redis not available. Token revocation disabled.');
      return;
    }

    try {
      const payload = await this.verifyToken(token, this.JWT_SECRET);
      const ttl = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : this.ACCESS_TOKEN_EXPIRY;

      if (ttl > 0) {
        const revokeKey = `revoked_token:${token}`;
        await this.redis.set(revokeKey, '1', { EX: ttl });
      }

      // ユーザーのすべてのリフレッシュトークンを削除
      if (userId) {
        await this.revokeAllUserTokens(userId);
      }
    } catch (error) {
      logger.error(`Failed to revoke token: ${error}`);
    }
  }

  /**
   * ユーザーのすべてのトークンを無効化
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const pattern = `refresh_token:${userId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(keys);
        logger.info(`Revoked ${keys.length} refresh tokens for user: ${userId}`);
      }
    } catch (error) {
      logger.error(`Failed to revoke all user tokens: ${error}`);
    }
  }

  /**
   * トークンが無効化されているかチェック
   */
  private async isTokenRevoked(token: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      const revokeKey = `revoked_token:${token}`;
      const exists = await this.redis.exists(revokeKey);
      return exists === 1;
    } catch (error) {
      logger.error(`Failed to check token revocation: ${error}`);
      return false;
    }
  }

  /**
   * トークンに署名（簡易実装）
   * 本番環境では jsonwebtoken ライブラリを使用すること
   */
  private async signToken(payload: TokenPayload, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const header = { alg: 'HS256', typ: 'JWT' };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

    const data = `${encodedHeader}.${encodedPayload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const encodedSignature = this.base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

    return `${data}.${encodedSignature}`;
  }

  /**
   * トークンを検証（簡易実装）
   */
  private async verifyToken(token: string, secret: string): Promise<TokenPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    // 署名検証
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = this.base64UrlDecode(encodedSignature);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      new Uint8Array(signature.split('').map(c => c.charCodeAt(0))),
      encoder.encode(data)
    );

    if (!valid) {
      throw new Error('Invalid token signature');
    }

    // ペイロードをデコード
    const payloadJson = this.base64UrlDecode(encodedPayload);
    return JSON.parse(payloadJson) as TokenPayload;
  }

  private base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private base64UrlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return atob(str);
  }
}

// シングルトンインスタンス
export const jwtManager = new JWTManager();
