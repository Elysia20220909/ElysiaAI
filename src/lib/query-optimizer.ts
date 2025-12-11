import { logger } from './logger';

interface QueryOptimizerOptions {
	enableBatching?: boolean;
	batchSize?: number;
	enablePreparedStatements?: boolean;
}

class QueryOptimizer {
  private options: Required<QueryOptimizerOptions>;
  private batchQueue: Map<
		string,
		Array<{
			query: string;
			params: unknown[];
			resolve: (value: unknown) => void;
			reject: (reason?: unknown) => void;
		}>
	> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private preparedStatements: Map<string, unknown> = new Map();

  constructor(options?: QueryOptimizerOptions) {
    this.options = {
      enableBatching: options?.enableBatching ?? true,
      batchSize: options?.batchSize ?? 100,
      enablePreparedStatements: options?.enablePreparedStatements ?? true,
    };
  }

  // Database index recommendations
  private readonly indexRecommendations = {
    feedback: [
      'CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating)',
      'CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category)',
      'CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC)',
    ],
    knowledge: [
      'CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge USING GIN(tags)',
      'CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_knowledge_search ON knowledge USING GIN(to_tsvector(\'english\', content))',
    ],
    users: [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC)',
    ],
    sessions: [
      'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)',
    ],
    api_keys: [
      'CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key_hash)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at)',
    ],
    audit_logs: [
      'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource)',
      'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_audit_composite ON audit_logs(user_id, action, timestamp DESC)',
    ],
  };

  getIndexRecommendations(table?: string): string[] {
    if (
      table &&
			this.indexRecommendations[table as keyof typeof this.indexRecommendations]
    ) {
      return this.indexRecommendations[
				table as keyof typeof this.indexRecommendations
      ];
    }
    return Object.values(this.indexRecommendations).flat();
  }

  async createIndexes(db: {
		execute: (query: string) => Promise<unknown>;
	}): Promise<void> {
    const indexes = this.getIndexRecommendations();
    logger.info(`Creating ${indexes.length} database indexes...`);

    for (const index of indexes) {
      try {
        await db.execute(index);
      } catch (error) {
        logger.error(
          `Failed to create index: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    logger.info('Database indexes created');
  }

  // Query analysis and optimization
  analyzeQuery(query: string): {
		type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN';
		tables: string[];
		hasWhere: boolean;
		hasJoin: boolean;
		hasOrderBy: boolean;
		hasLimit: boolean;
		optimizationSuggestions: string[];
	} {
    const normalized = query.toUpperCase();
    const suggestions: string[] = [];

    // Determine query type
    let type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN' = 'UNKNOWN';
    if (normalized.startsWith('SELECT')) type = 'SELECT';
    else if (normalized.startsWith('INSERT')) type = 'INSERT';
    else if (normalized.startsWith('UPDATE')) type = 'UPDATE';
    else if (normalized.startsWith('DELETE')) type = 'DELETE';

    // Extract table names
    const tableMatch = query.match(/FROM\s+([a-zA-Z0-9_,\s]+)/i);
    const tables = tableMatch
      ? tableMatch[1].split(',').map((t) => t.trim())
      : [];

    const hasWhere = normalized.includes('WHERE');
    const hasJoin = /JOIN/i.test(query);
    const hasOrderBy = normalized.includes('ORDER BY');
    const hasLimit = normalized.includes('LIMIT');

    // Suggestions
    if (type === 'SELECT' && !hasLimit) {
      suggestions.push(
        'Consider adding LIMIT to prevent fetching too many rows',
      );
    }
    if (type === 'SELECT' && !hasWhere && !hasLimit) {
      suggestions.push(
        'SELECT without WHERE or LIMIT may return large result sets',
      );
    }
    if (hasOrderBy && !hasLimit) {
      suggestions.push('ORDER BY without LIMIT sorts entire result set');
    }
    if (normalized.includes('SELECT *')) {
      suggestions.push('Avoid SELECT *, specify only needed columns');
    }
    if (hasJoin && tables.length > 3) {
      suggestions.push(
        'Multiple JOINs detected, consider query restructuring or denormalization',
      );
    }

    return {
      type,
      tables,
      hasWhere,
      hasJoin,
      hasOrderBy,
      hasLimit,
      optimizationSuggestions: suggestions,
    };
  }

  // Batch query execution
  async batchQuery<T>(
    batchKey: string,
    query: string,
    params: unknown[],
  ): Promise<T> {
    if (!this.options.enableBatching) {
      throw new Error('Batching not enabled, execute query directly');
    }

    return new Promise<T>((resolve, reject) => {
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }

      const queue = this.batchQueue.get(batchKey);
      if (!queue) {
        reject(new Error('Failed to get batch queue'));
        return;
      }
      queue.push({
        query,
        params,
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      // Process batch if size reached
      if (queue.length >= this.options.batchSize) {
        this.processBatch(batchKey);
      } else {
        // Schedule batch processing
        if (!this.batchTimers.has(batchKey)) {
          const timer = setTimeout(() => {
            this.processBatch(batchKey);
          }, 50); // 50ms delay
          this.batchTimers.set(batchKey, timer);
        }
      }
    });
  }

  private async processBatch(batchKey: string): Promise<void> {
    const queue = this.batchQueue.get(batchKey);
    if (!queue || queue.length === 0) return;

    this.batchQueue.delete(batchKey);
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    logger.info(`Processing batch ${batchKey} with ${queue.length} queries`);

    // Process all queries in the batch
    for (const item of queue) {
      try {
        const startTime = Date.now();

        // Dynamic import to avoid circular dependencies
        const { prisma } = await import('./database');

        // Execute the query using Prisma's raw query capability
        const result = await prisma.$queryRawUnsafe(item.query, ...item.params);

        const executionTime = Date.now() - startTime;
        this.recordQueryExecution(item.query, executionTime);

        item.resolve(result);
      } catch (error) {
        logger.error(
          `Batch query failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        item.reject(error);
      }
    }
  }

  // Query monitoring
  private queryStats: Map<
		string,
		{ count: number; totalTime: number; avgTime: number }
	> = new Map();

  recordQueryExecution(query: string, executionTime: number): void {
    const key = query.substring(0, 100); // Use first 100 chars as key
    const stats = this.queryStats.get(key) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
    };
    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    this.queryStats.set(key, stats);

    // Warn about slow queries
    if (executionTime > 1000) {
      logger.warn(`Slow query detected (${executionTime}ms): ${key}...`);
    }
  }

  getQueryStats(): Array<{
		query: string;
		count: number;
		totalTime: number;
		avgTime: number;
	}> {
    return Array.from(this.queryStats.entries()).map(([query, stats]) => ({
      query,
      ...stats,
    }));
  }

  getSlowestQueries(
    limit = 10,
  ): Array<{ query: string; avgTime: number; count: number }> {
    return this.getQueryStats()
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }

  getMostFrequentQueries(
    limit = 10,
  ): Array<{ query: string; count: number; avgTime: number }> {
    return this.getQueryStats()
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  resetStats(): void {
    this.queryStats.clear();
    logger.info('Query statistics reset');
  }
}

export const queryOptimizer = new QueryOptimizer();
