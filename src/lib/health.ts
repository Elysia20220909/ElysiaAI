// Health Check Module - Comprehensive service monitoring
import axios from 'axios';
import Redis from 'ioredis';

export interface HealthStatus {
	status: 'healthy' | 'degraded' | 'unhealthy';
	timestamp: string;
	uptime: number;
	services: {
		redis: ServiceHealth;
		fastapi: ServiceHealth;
		ollama: ServiceHealth;
	};
	system: {
		memory: {
			used: number;
			total: number;
			percentage: number;
		};
		cpu: {
			usage: number;
		};
	};
}

export interface ServiceHealth {
	status: 'up' | 'down' | 'degraded';
	responseTime?: number;
	error?: string;
	lastCheck: string;
}

// Redis Health Check
export async function checkRedis(redisUrl: string): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    const redis = new Redis(redisUrl, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
    });

    await redis.ping();
    const responseTime = Date.now() - startTime;

    const info = await redis.info('server');
    const version = info.match(/redis_version:(.+)/)?.[1]?.trim();

    redis.disconnect();

    return {
      status: responseTime < 100 ? 'up' : 'degraded',
      responseTime,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date().toISOString(),
    };
  }
}

// FastAPI Health Check
export async function checkFastAPI(fastAPIUrl: string): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    const response = await axios.get(`${fastAPIUrl}/health`, {
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });

    const responseTime = Date.now() - startTime;

    if (response.status === 200) {
      return {
        status: responseTime < 200 ? 'up' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    }

    return {
      status: 'degraded',
      responseTime,
      error: `HTTP ${response.status}`,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Connection failed',
      lastCheck: new Date().toISOString(),
    };
  }
}

// Ollama Health Check
export async function checkOllama(ollamaUrl: string): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    const response = await axios.get(`${ollamaUrl}/api/version`, {
      timeout: 5000,
    });

    const responseTime = Date.now() - startTime;

    if (response.status === 200) {
      return {
        status: responseTime < 500 ? 'up' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    }

    return {
      status: 'degraded',
      responseTime,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Connection failed',
      lastCheck: new Date().toISOString(),
    };
  }
}

// System Metrics
export function getSystemMetrics() {
  const memory = process.memoryUsage();
  const totalMemory = memory.heapTotal;
  const usedMemory = memory.heapUsed;

  return {
    memory: {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round((usedMemory / totalMemory) * 100),
    },
    cpu: {
      usage: process.cpuUsage().user / 1000000, // seconds
    },
  };
}

// Comprehensive Health Check
export async function performHealthCheck(
  redisUrl: string,
  fastAPIUrl: string,
  ollamaUrl: string,
): Promise<HealthStatus> {
  const [redis, fastapi, ollama] = await Promise.all([
    checkRedis(redisUrl),
    checkFastAPI(fastAPIUrl),
    checkOllama(ollamaUrl),
  ]);

  const system = getSystemMetrics();

  // Determine overall status
  const allUp = [redis, fastapi, ollama].every((s) => s.status === 'up');
  const anyDown = [redis, fastapi, ollama].some((s) => s.status === 'down');

  const status = allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: { redis, fastapi, ollama },
    system,
  };
}
