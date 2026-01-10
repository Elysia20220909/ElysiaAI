/**
 * 入力サニタイゼーション・検証ユーティリティ
 *
 * クライアントサイドは信用できないため、サーバーサイドで徹底的に検証する
 */

/**
 * 危険なHTMLタグやスクリプトを除去
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * SQLインジェクション攻撃のパターンを検出
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/gi,
    /--/,
    /;.*(\bEXEC\b|\bEXECUTE\b)/gi,
    /'\s*(OR|AND)\s*'.*'=/gi,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * プロンプトインジェクション攻撃を検出
 */
export function containsPromptInjection(input: string): boolean {
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+(instructions|prompts?)/gi,
    /system\s+prompt/gi,
    /developer\s+(mode|prompt)/gi,
    /you\s+are\s+now\s+a/gi,
    /disregard\s+(all\s+)?(previous|prior)/gi,
    /forget\s+(everything|all)/gi,
  ];

  return injectionPatterns.some(pattern => pattern.test(input));
}

/**
 * 秘密情報の要求を検出
 */
export function containsSecretRequest(input: string): boolean {
  const secretPatterns = [
    /password/gi,
    /api[_\s-]?key/gi,
    /secret/gi,
    /token/gi,
    /credential/gi,
    /database\s+(connection|url)/gi,
    /private[_\s-]?key/gi,
  ];

  return secretPatterns.some(pattern => pattern.test(input));
}

/**
 * 総合的な入力検証
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateUserInput(input: string, maxLength: number = 10000): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 長さチェック
  if (input.length > maxLength) {
    errors.push(`入力が最大長（${maxLength}文字）を超えています`);
  }

  // 制御文字のチェック
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input)) {
    errors.push('不正な制御文字が含まれています');
  }

  // SQLインジェクション
  if (containsSqlInjection(input)) {
    errors.push('SQLインジェクションの可能性がある入力が検出されました');
  }

  // プロンプトインジェクション
  if (containsPromptInjection(input)) {
    warnings.push('プロンプトインジェクションの可能性がある入力が検出されました');
  }

  // 秘密情報の要求
  if (containsSecretRequest(input)) {
    warnings.push('機密情報を要求している可能性があります');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * レスポンスから機密情報をフィルタリング
 */
export function sanitizeResponse(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeResponse(item));
  }

  const sensitiveKeys = [
    'password',
    'passwordHash',
    'secret',
    'apiKey',
    'api_key',
    'privateKey',
    'private_key',
    'token',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'credential',
    'credentials',
    'connectionString',
    'connection_string',
  ];

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // 機密情報のキーは除外
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      continue;
    }

    // 再帰的にサニタイズ
    sanitized[key] = sanitizeResponse(value);
  }

  return sanitized;
}

/**
 * ユーザー名の検証
 */
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = [];

  if (username.length < 3) {
    errors.push('ユーザー名は3文字以上である必要があります');
  }

  if (username.length > 50) {
    errors.push('ユーザー名は50文字以下である必要があります');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('ユーザー名には英数字、アンダースコア、ハイフンのみ使用できます');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * パスワードの強度検証
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (password.length < 12) {
    errors.push('パスワードは12文字以上である必要があります');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('パスワードには少なくとも1つの大文字が必要です');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('パスワードには少なくとも1つの小文字が必要です');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('パスワードには少なくとも1つの数字が必要です');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    warnings.push('パスワードに特殊文字を含めることを推奨します');
  }

  // よく使われる脆弱なパスワードパターン
  const weakPatterns = [
    /password/gi,
    /123456/,
    /qwerty/gi,
    /admin/gi,
    /letmein/gi,
  ];

  if (weakPatterns.some(pattern => pattern.test(password))) {
    errors.push('パスワードが脆弱です。より複雑なパスワードを使用してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
