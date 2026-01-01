import { randomUUID } from "node:crypto";
import { logger } from "./logger";

interface JobRecord {
	id: string;
	type: string;
	payload: Record<string, unknown>;
	status: "waiting" | "completed" | "failed";
	createdAt: Date;
	completedAt?: Date;
	error?: string;
}

class JobQueueManager {
	private jobs: JobRecord[] = [];
	private initialized = false;

	async initialize(): Promise<void> {
		this.initialized = true;
		logger.info("Job queue initialized (in-memory mode)");
	}

	private record(type: string, payload: Record<string, unknown>) {
		const job: JobRecord = {
			id: randomUUID(),
			type,
			payload,
			status: "waiting",
			createdAt: new Date(),
		};
		this.jobs.push(job);
		return job;
	}

	private complete(job: JobRecord) {
		job.status = "completed";
		job.completedAt = new Date();
		return job;
	}

	async addJob(jobType: string, payload: Record<string, unknown>) {
		const job = this.record(jobType, payload);
		this.complete(job);
		return job.id;
	}

	async sendEmail(to: string, subject: string, html: string) {
		return this.addJob("send-email", { to, subject, html });
	}

	async generateReport(
		reportType: "daily" | "weekly" | "monthly",
		startDate: Date,
		endDate: Date,
	) {
		return this.addJob("generate-report", { reportType, startDate, endDate });
	}

	async cleanupOldData() {
		return this.addJob("cleanup-old-data", {});
	}

	async sendWebhook(payload: Record<string, unknown>) {
		return this.addJob("send-webhook", payload);
	}

	async getStats() {
		return {
			waiting: this.jobs.filter((j) => j.status === "waiting").length,
			active: 0,
			completed: this.jobs.filter((j) => j.status === "completed").length,
			failed: this.jobs.filter((j) => j.status === "failed").length,
		};
	}

	async shutdown() {
		this.jobs = [];
		this.initialized = false;
	}
}

export const jobQueue = new JobQueueManager();

