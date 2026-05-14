import axios from "axios";
import Redis from "ioredis";
import { config } from "../../../../src/config.ts";
import { checkOllamaStatus } from "./ollama-service";
import { checkOpenLlmVtuberStatus } from "./open-llm-vtuber";

export interface HealthStatus {
	status: "healthy" | "degraded" | "unhealthy";
	timestamp: string;
	uptime: number;
	services: {
		redis: ServiceHealth;
		fastapi: ServiceHealth;
		ollama: ServiceHealth;
	};
	companions: {
		openLlmVtuber: ServiceHealth;
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
	status: "up" | "down" | "degraded" | "disabled";
	responseTime?: number;
	error?: string;
	lastCheck: string;
	version?: string;
	model?: {
		configured: string;
		ready: boolean;
		matched?: string;
		availableCount?: number;
	};
}

export function disabledServiceHealth(reason: string): ServiceHealth {
	return {
		status: "disabled",
		error: reason,
		lastCheck: new Date().toISOString(),
	};
}

export function summarizeHealthStatus(
	services: ServiceHealth[],
): HealthStatus["status"] {
	const activeServices = services.filter(
		(service) => service.status !== "disabled",
	);
	if (activeServices.length === 0) return "healthy";

	const allUp = activeServices.every((service) => service.status === "up");
	const anyDown = activeServices.some((service) => service.status === "down");

	return allUp ? "healthy" : anyDown ? "unhealthy" : "degraded";
}

export function mapOpenLlmVtuberStatusToServiceHealth(
	status: Awaited<ReturnType<typeof checkOpenLlmVtuberStatus>>,
	responseTime?: number,
): ServiceHealth {
	const lastCheck = new Date().toISOString();

	if (status.status === "disabled") {
		return disabledServiceHealth("Open-LLM-VTuber bridge is disabled");
	}

	if (status.status === "online") {
		return {
			status: "up",
			responseTime,
			lastCheck,
		};
	}

	if (status.status === "degraded") {
		return {
			status: "degraded",
			responseTime,
			error: `HTTP ${status.statusCode}`,
			lastCheck,
		};
	}

	return {
		status: "down",
		responseTime,
		error: status.error,
		lastCheck,
	};
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

		const info = await redis.info("server");
		const _version = info.match(/redis_version:(.+)/)?.[1]?.trim();

		redis.disconnect();

		return {
			status: responseTime < 100 ? "up" : "degraded",
			responseTime,
			lastCheck: new Date().toISOString(),
		};
	} catch (error) {
		return {
			status: "down",
			error: error instanceof Error ? error.message : "Unknown error",
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
				status: responseTime < 200 ? "up" : "degraded",
				responseTime,
				lastCheck: new Date().toISOString(),
			};
		}

		return {
			status: "degraded",
			responseTime,
			error: `HTTP ${response.status}`,
			lastCheck: new Date().toISOString(),
		};
	} catch (error) {
		return {
			status: "down",
			error: error instanceof Error ? error.message : "Connection failed",
			lastCheck: new Date().toISOString(),
		};
	}
}

// Ollama Health Check
export async function checkOllama(ollamaUrl: string): Promise<ServiceHealth> {
	const status = await checkOllamaStatus({ baseUrl: ollamaUrl });
	const serviceStatus =
		status.status === "online"
			? status.responseTime < 500
				? "up"
				: "degraded"
			: status.status === "degraded"
				? "degraded"
				: "down";

	return {
		status: serviceStatus,
		responseTime: status.responseTime,
		error: status.error || status.recommendations[0],
		lastCheck: status.lastCheck,
		version: status.version,
		model: {
			configured: status.configuredModel,
			ready: status.modelReady,
			matched: status.matchedModel,
			availableCount: status.models.length,
		},
	};
}

export async function checkOpenLlmVtuberService(
	timeoutMs = 750,
): Promise<ServiceHealth> {
	const startTime = Date.now();
	const status = await checkOpenLlmVtuberStatus({ timeoutMs });
	const responseTime = Date.now() - startTime;

	return mapOpenLlmVtuberStatusToServiceHealth(status, responseTime);
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
export async function performHealthCheck(): Promise<HealthStatus> {
	const [redis, fastapi, ollama, openLlmVtuber] = await Promise.all([
		config.redisEnabled
			? checkRedis(config.redisUrl)
			: Promise.resolve(disabledServiceHealth("Redis is disabled")),
		checkFastAPI(config.fastApiBaseUrl),
		checkOllama(config.ollamaBaseUrl),
		checkOpenLlmVtuberService(),
	]);

	const system = getSystemMetrics();

	const status = summarizeHealthStatus([redis, fastapi, ollama]);

	return {
		status,
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		services: { redis, fastapi, ollama },
		companions: { openLlmVtuber },
		system,
	};
}
