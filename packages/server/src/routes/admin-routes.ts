import { Elysia, t } from "elysia";
import jwt from "jsonwebtoken";
import { CONFIG, jsonError } from "../lib/constants";
import { backupScheduler } from "../lib/backup-scheduler";
import { apiKeyManager } from "../lib/api-key-manager";
import { healthMonitor } from "../lib/health-monitor";
import { logCleanupManager } from "../lib/log-cleanup";
import { abTestManager } from "../lib/ab-testing";
import { webhookManager } from "../lib/webhook-events";
import { jobQueue } from "../lib/job-queue";

export const adminRoutes = new Elysia({ prefix: "/admin" })
    .guard(
        {
            beforeHandle: ({ request }: any) => {
                const auth = request.headers.get("authorization") || "";
                if (!auth.startsWith("Bearer "))
                    throw new Error("Missing Bearer token");
                try {
                    jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
                } catch {
                    throw new Error("Invalid or expired token");
                }
            },
        },
        (app) =>
            app
                .get("/analytics", async () => {
                    const { apiAnalytics } = await import("../lib/api-analytics");
                    return apiAnalytics.exportJSON();
                })
                .get("/webhooks", () => ({ webhooks: webhookManager.getSubscriptions() }))
                .get("/api-keys", () => ({
                    keys: apiKeyManager.listKeys(),
                    stats: apiKeyManager.getUsageStats(),
                }))
                .post("/api-keys", async ({ body }: any) => {
                    const { name, rateLimit, expiresInDays } = body;
                    const apiKey = apiKeyManager.generateKey({ name, rateLimit, expiresInDays });
                    return { success: true, key: apiKey.key };
                }, {
                    body: t.Object({
                        name: t.String({ minLength: 1 }),
                        rateLimit: t.Optional(t.Number()),
                        expiresInDays: t.Optional(t.Number()),
                    })
                })
                .get("/backups", () => ({
                    status: backupScheduler.getStatus(),
                    history: backupScheduler.getBackupHistory(),
                }))
                .post("/backups/trigger", async () => {
                    await backupScheduler.triggerManualBackup();
                    return { success: true, message: "Backup triggered" };
                })
                .get("/health-monitor", () => healthMonitor.getStatus())
                .get("/ab-tests", () => ({ tests: abTestManager.listTests() }))
                .get("/ab-tests/:testId", async ({ params }) => {
                    const results = abTestManager.getTestResults(params.testId);
                    if (!results) return jsonError(404, "Test not found");
                    return results;
                })
                .get("/logs/cleanup", () => logCleanupManager.getStats())
                .post("/logs/cleanup/trigger", async () => {
                    await logCleanupManager.triggerManualCleanup();
                    return { success: true, message: "Log cleanup triggered" };
                })
                .get("/jobs/stats", async () => await jobQueue.getStats())
                .post("/jobs/email", async ({ body }: any) => {
                    const job = await jobQueue.sendEmail(body.to, body.subject, body.html) as any;
                    return { success: true, jobId: job.id };
                })
                .post("/jobs/report", async ({ body }: any) => {
                    const job = await jobQueue.generateReport(body.reportType, new Date(body.startDate), new Date(body.endDate)) as any;
                    return { success: true, jobId: job.id };
                })
    );
