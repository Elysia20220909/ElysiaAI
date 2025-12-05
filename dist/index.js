/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 24:
/***/ ((module) => {

module.exports = require("node:fs");

/***/ }),

/***/ 74:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  m: () => (/* binding */ cronScheduler)
});

;// external "cron"
const external_cron_namespaceObject = require("cron");
// EXTERNAL MODULE: ./src/lib/backup-scheduler.ts
var backup_scheduler = __webpack_require__(935);
// EXTERNAL MODULE: ./src/lib/file-upload.ts
var file_upload = __webpack_require__(121);
// EXTERNAL MODULE: ./src/lib/job-queue.ts + 1 modules
var job_queue = __webpack_require__(654);
// EXTERNAL MODULE: ./src/lib/log-cleanup.ts
var log_cleanup = __webpack_require__(922);
// EXTERNAL MODULE: ./src/lib/logger.ts
var logger = __webpack_require__(629);
;// ./src/lib/cron-scheduler.ts






class CronScheduler {
    tasks;
    constructor() {
        this.tasks = new Map();
    }
    initializeDefaultTasks() {
        this.addTask("daily-report", "0 9 * * *", async () => {
            logger/* logger */.v.info("Running daily report task");
            const today = new Date();
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            await job_queue/* jobQueue */.f.generateReport("daily", yesterday, today);
        }, process.env.DAILY_REPORT_ENABLED === "true");
        this.addTask("weekly-report", "0 10 * * 1", async () => {
            logger/* logger */.v.info("Running weekly report task");
            const today = new Date();
            const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            await job_queue/* jobQueue */.f.generateReport("weekly", lastWeek, today);
        }, process.env.WEEKLY_REPORT_ENABLED === "true");
        this.addTask("monthly-report", "0 10 1 * *", async () => {
            logger/* logger */.v.info("Running monthly report task");
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            await job_queue/* jobQueue */.f.generateReport("monthly", lastMonth, today);
        }, process.env.MONTHLY_REPORT_ENABLED === "true");
        this.addTask("db-backup", "0 3 * * *", async () => {
            logger/* logger */.v.info("Running database backup task");
            await backup_scheduler/* backupScheduler */.m.triggerManualBackup();
        }, true);
        this.addTask("log-cleanup", "0 4 * * *", async () => {
            logger/* logger */.v.info("Running log cleanup task");
            await log_cleanup.logCleanupManager.triggerManualCleanup();
        }, true);
        this.addTask("file-cleanup", "0 5 * * 0", async () => {
            logger/* logger */.v.info("Running file cleanup task");
            file_upload/* fileUploadManager */.r.cleanupOldFiles(30);
        }, true);
        this.addTask("health-check", "*/10 * * * *", async () => {
            const { healthMonitor } = await Promise.resolve(/* import() */).then(__webpack_require__.bind(__webpack_require__, 732));
            await healthMonitor.runCheck("database");
            await healthMonitor.runCheck("ollama");
        }, process.env.HEALTH_CHECK_CRON_ENABLED === "true");
        logger/* logger */.v.info("Cron scheduler initialized", {
            tasks: this.tasks.size,
        });
    }
    addTask(name, cronTime, callback, enabled = true) {
        try {
            const job = new external_cron_namespaceObject.CronJob(cronTime, async () => {
                try {
                    await callback();
                    logger/* logger */.v.info("Cron task completed", { name });
                }
                catch (error) {
                    logger/* logger */.v.error(`Cron task failed: ${name}`, error);
                }
            }, null, enabled, "Asia/Tokyo");
            this.tasks.set(name, {
                name,
                cronTime,
                job,
                enabled,
            });
            if (enabled) {
                job.start();
                logger/* logger */.v.info("Cron task added", { name, cronTime });
            }
        }
        catch (error) {
            logger/* logger */.v.error(`Failed to add cron task: ${name}`, error);
        }
    }
    enableTask(name) {
        const task = this.tasks.get(name);
        if (task && !task.enabled) {
            task.job.start();
            task.enabled = true;
            logger/* logger */.v.info("Cron task enabled", { name });
        }
    }
    disableTask(name) {
        const task = this.tasks.get(name);
        if (task?.enabled) {
            task.job.stop();
            task.enabled = false;
            logger/* logger */.v.info("Cron task disabled", { name });
        }
    }
    removeTask(name) {
        const task = this.tasks.get(name);
        if (task) {
            task.job.stop();
            this.tasks.delete(name);
            logger/* logger */.v.info("Cron task removed", { name });
        }
    }
    listTasks() {
        return Array.from(this.tasks.values()).map((task) => ({
            name: task.name,
            cronTime: task.cronTime,
            enabled: task.enabled,
            nextRun: task.enabled ? task.job.nextDate().toJSDate() : null,
        }));
    }
    async runTask(name) {
        const task = this.tasks.get(name);
        if (!task) {
            throw new Error(`Task not found: ${name}`);
        }
        logger/* logger */.v.info("Running cron task manually", { name });
        task.job.fireOnTick();
    }
    stopAll() {
        for (const task of this.tasks.values()) {
            task.job.stop();
        }
        logger/* logger */.v.info("All cron tasks stopped");
    }
    getStats() {
        const tasks = Array.from(this.tasks.values());
        return {
            totalTasks: tasks.length,
            enabledTasks: tasks.filter((t) => t.enabled).length,
            disabledTasks: tasks.filter((t) => !t.enabled).length,
            nextRuns: tasks
                .filter((t) => t.enabled)
                .map((t) => ({
                name: t.name,
                nextRun: t.job.nextDate().toJSDate(),
            })),
        };
    }
}
const cronScheduler = new CronScheduler();


/***/ }),

/***/ 95:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   n: () => (/* binding */ abTestManager)
/* harmony export */ });
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(629);

class ABTestManager {
    tests;
    userAssignments;
    constructor() {
        this.tests = new Map();
        this.userAssignments = new Map();
        this.initializeDefaultTests();
    }
    initializeDefaultTests() {
        this.createTest({
            id: "prompt-style",
            name: "プロンプトスタイルテスト",
            description: "異なるプロンプトスタイルの効果を測定",
            variants: [
                {
                    id: "original",
                    name: "オリジナル",
                    weight: 50,
                    config: { style: "original" },
                },
                {
                    id: "detailed",
                    name: "詳細指示",
                    weight: 50,
                    config: { style: "detailed" },
                },
            ],
        });
        this.createTest({
            id: "response-length",
            name: "レスポンス長テスト",
            description: "短い回答 vs 長い回答",
            variants: [
                {
                    id: "short",
                    name: "短い回答",
                    weight: 50,
                    config: { maxTokens: 150 },
                },
                {
                    id: "long",
                    name: "長い回答",
                    weight: 50,
                    config: { maxTokens: 500 },
                },
            ],
        });
    }
    createTest(options) {
        const test = {
            id: options.id,
            name: options.name,
            description: options.description,
            variants: options.variants,
            active: true,
            startDate: new Date(),
            endDate: options.endDate,
            metrics: {
                impressions: new Map(),
                conversions: new Map(),
                averageRating: new Map(),
            },
        };
        for (const variant of test.variants) {
            test.metrics.impressions.set(variant.id, 0);
            test.metrics.conversions.set(variant.id, 0);
            test.metrics.averageRating.set(variant.id, []);
        }
        this.tests.set(test.id, test);
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.info("A/B test created", {
            id: test.id,
            name: test.name,
            variants: test.variants.length,
        });
        return test;
    }
    assignVariant(testId, userId) {
        const test = this.tests.get(testId);
        if (!test || !test.active)
            return null;
        if (!this.userAssignments.has(userId)) {
            this.userAssignments.set(userId, new Map());
        }
        const userTests = this.userAssignments.get(userId);
        if (userTests?.has(testId)) {
            const variantId = userTests.get(testId);
            return test.variants.find((v) => v.id === variantId) || null;
        }
        const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedVariant = null;
        for (const variant of test.variants) {
            random -= variant.weight;
            if (random <= 0) {
                selectedVariant = variant;
                break;
            }
        }
        if (selectedVariant) {
            userTests?.set(testId, selectedVariant.id);
            const currentImpressions = test.metrics.impressions.get(selectedVariant.id) || 0;
            test.metrics.impressions.set(selectedVariant.id, currentImpressions + 1);
        }
        return selectedVariant;
    }
    recordConversion(testId, userId) {
        const test = this.tests.get(testId);
        if (!test)
            return;
        const variantId = this.userAssignments.get(userId)?.get(testId);
        if (!variantId)
            return;
        const currentConversions = test.metrics.conversions.get(variantId) || 0;
        test.metrics.conversions.set(variantId, currentConversions + 1);
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.debug("A/B test conversion recorded", {
            testId,
            variantId,
            userId,
        });
    }
    recordRating(testId, userId, rating) {
        const test = this.tests.get(testId);
        if (!test)
            return;
        const variantId = this.userAssignments.get(userId)?.get(testId);
        if (!variantId)
            return;
        const ratings = test.metrics.averageRating.get(variantId) || [];
        ratings.push(rating);
        test.metrics.averageRating.set(variantId, ratings);
    }
    getTestResults(testId) {
        const test = this.tests.get(testId);
        if (!test)
            return null;
        const results = test.variants.map((variant) => {
            const impressions = test.metrics.impressions.get(variant.id) || 0;
            const conversions = test.metrics.conversions.get(variant.id) || 0;
            const ratings = test.metrics.averageRating.get(variant.id) || [];
            const avgRating = ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
                : 0;
            return {
                variantId: variant.id,
                name: variant.name,
                impressions,
                conversions,
                conversionRate: impressions > 0 ? (conversions / impressions) * 100 : 0,
                averageRating: avgRating,
                sampleSize: ratings.length,
            };
        });
        return {
            testId: test.id,
            name: test.name,
            description: test.description,
            active: test.active,
            startDate: test.startDate,
            endDate: test.endDate,
            results,
        };
    }
    endTest(testId) {
        const test = this.tests.get(testId);
        if (test) {
            test.active = false;
            test.endDate = new Date();
            _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.info("A/B test ended", { testId, name: test.name });
        }
    }
    listTests() {
        return Array.from(this.tests.values()).map((test) => ({
            id: test.id,
            name: test.name,
            description: test.description,
            active: test.active,
            startDate: test.startDate,
            endDate: test.endDate,
            variantCount: test.variants.length,
        }));
    }
}
const abTestManager = new ABTestManager();


/***/ }),

/***/ 112:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  Ql: () => (/* binding */ getTraceContextFromRequest),
  Y9: () => (/* binding */ telemetry)
});

// UNUSED EXPORTS: Trace

;// external "node:process"
const external_node_process_namespaceObject = require("node:process");
;// ./src/lib/telemetry.ts

class Telemetry {
    spans = new Map();
    activeSpans = new Map();
    enabled;
    constructor(enabled = true) {
        this.enabled = enabled;
    }
    generateTraceId() {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }
    generateSpanId() {
        const randomBytes = new Uint8Array(8);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }
    parseTraceContext(traceparent) {
        if (!traceparent)
            return null;
        const parts = traceparent.split("-");
        if (parts.length !== 4)
            return null;
        const [version, traceId, spanId, traceFlags] = parts;
        if (version !== "00")
            return null;
        return {
            traceId,
            spanId,
            traceFlags: Number.parseInt(traceFlags, 16),
        };
    }
    createTraceContext(traceId, spanId, sampled = true) {
        const flags = sampled ? "01" : "00";
        return `00-${traceId}-${spanId}-${flags}`;
    }
    startSpan(name, options) {
        if (!this.enabled) {
            return this.createDummySpan(name);
        }
        const traceId = options?.parentContext?.traceId || this.generateTraceId();
        const spanId = this.generateSpanId();
        const parentSpanId = options?.parentContext?.spanId;
        const span = {
            traceId,
            spanId,
            parentSpanId,
            name,
            startTime: external_node_process_namespaceObject.hrtime.bigint(),
            attributes: options?.attributes || {},
            events: [],
            status: { code: "UNSET" },
        };
        this.spans.set(spanId, span);
        if (options?.contextId) {
            this.activeSpans.set(options.contextId, spanId);
        }
        return span;
    }
    endSpan(spanId, status) {
        const span = this.spans.get(spanId);
        if (!span)
            return;
        span.endTime = external_node_process_namespaceObject.hrtime.bigint();
        span.duration = Number(span.endTime - span.startTime) / 1_000_000;
        span.status = status || { code: "OK" };
        for (const [contextId, activeSpanId] of this.activeSpans.entries()) {
            if (activeSpanId === spanId) {
                this.activeSpans.delete(contextId);
            }
        }
    }
    addEvent(spanId, name, attributes) {
        const span = this.spans.get(spanId);
        if (!span)
            return;
        span.events.push({
            name,
            timestamp: external_node_process_namespaceObject.hrtime.bigint(),
            attributes,
        });
    }
    setAttribute(spanId, key, value) {
        const span = this.spans.get(spanId);
        if (!span)
            return;
        span.attributes[key] = value;
    }
    setStatus(spanId, status) {
        const span = this.spans.get(spanId);
        if (!span)
            return;
        span.status = status;
    }
    getSpan(spanId) {
        return this.spans.get(spanId);
    }
    getActiveSpan(contextId) {
        const spanId = this.activeSpans.get(contextId);
        return spanId ? this.spans.get(spanId) : undefined;
    }
    getTrace(traceId) {
        return Array.from(this.spans.values()).filter((span) => span.traceId === traceId);
    }
    exportSpans() {
        const completed = Array.from(this.spans.values()).filter((span) => span.endTime !== undefined);
        for (const span of completed) {
            this.spans.delete(span.spanId);
        }
        return completed;
    }
    createDummySpan(name) {
        return {
            traceId: "",
            spanId: "",
            name,
            startTime: external_node_process_namespaceObject.hrtime.bigint(),
            attributes: {},
            events: [],
            status: { code: "UNSET" },
        };
    }
    async trace(name, fn, options) {
        const span = this.startSpan(name, options);
        try {
            const result = await fn(span);
            this.endSpan(span.spanId, { code: "OK" });
            return result;
        }
        catch (error) {
            this.endSpan(span.spanId, {
                code: "ERROR",
                message: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    }
    getStats() {
        const spans = Array.from(this.spans.values());
        const completed = spans.filter((s) => s.endTime !== undefined);
        const active = spans.filter((s) => s.endTime === undefined);
        const avgDuration = completed.reduce((sum, s) => sum + (s.duration || 0), 0) /
            completed.length || 0;
        return {
            totalSpans: spans.length,
            activeSpans: active.length,
            completedSpans: completed.length,
            averageDuration: avgDuration,
            traces: new Set(spans.map((s) => s.traceId)).size,
        };
    }
    clear() {
        this.spans.clear();
        this.activeSpans.clear();
    }
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}
const telemetry = new Telemetry(process.env.TELEMETRY_ENABLED !== "false");
function getTraceContextFromRequest(request) {
    const traceparent = request.headers.get("traceparent");
    return telemetry.parseTraceContext(traceparent || undefined);
}
function Trace(spanName) {
    return (target, propertyKey, descriptor) => {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const name = spanName ||
                `${target.constructor.name}.${propertyKey}`;
            return telemetry.trace(name, async (span) => {
                span.attributes.method = propertyKey;
                return originalMethod.apply(this, args);
            });
        };
        return descriptor;
    };
}


/***/ }),

/***/ 121:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   r: () => (/* binding */ fileUploadManager)
/* harmony export */ });
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(598);
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_crypto__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(629);




class FileUploadManager {
    UPLOAD_DIR;
    MAX_SIZE_MB;
    ALLOWED_TYPES;
    files;
    constructor() {
        this.UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
        this.MAX_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB) || 10;
        this.ALLOWED_TYPES = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "application/pdf",
            "text/plain",
            "text/markdown",
        ];
        this.files = new Map();
        if (!node_fs__WEBPACK_IMPORTED_MODULE_1__.existsSync(this.UPLOAD_DIR)) {
            node_fs__WEBPACK_IMPORTED_MODULE_1__.mkdirSync(this.UPLOAD_DIR, { recursive: true });
        }
    }
    async upload(fileBuffer, originalName, mimeType, options = {}) {
        const maxSize = (options.maxSizeMB || this.MAX_SIZE_MB) * 1024 * 1024;
        if (fileBuffer.length > maxSize) {
            throw new Error(`File size exceeds ${options.maxSizeMB || this.MAX_SIZE_MB}MB limit`);
        }
        const allowedTypes = options.allowedTypes || this.ALLOWED_TYPES;
        if (!allowedTypes.includes(mimeType)) {
            throw new Error(`File type ${mimeType} is not allowed`);
        }
        const fileId = node_crypto__WEBPACK_IMPORTED_MODULE_0__.randomBytes(16).toString("hex");
        const ext = node_path__WEBPACK_IMPORTED_MODULE_2__.extname(originalName);
        const filename = `${fileId}${ext}`;
        const filePath = node_path__WEBPACK_IMPORTED_MODULE_2__.join(this.UPLOAD_DIR, filename);
        node_fs__WEBPACK_IMPORTED_MODULE_1__.writeFileSync(filePath, fileBuffer);
        const uploadedFile = {
            id: fileId,
            originalName,
            filename,
            path: filePath,
            size: fileBuffer.length,
            mimeType,
            userId: options.userId,
            uploadedAt: new Date(),
        };
        this.files.set(fileId, uploadedFile);
        _logger__WEBPACK_IMPORTED_MODULE_3__/* .logger */ .v.info("File uploaded", {
            fileId,
            originalName,
            size: fileBuffer.length,
        });
        return uploadedFile;
    }
    getFile(fileId) {
        return this.files.get(fileId);
    }
    readFile(fileId) {
        const file = this.files.get(fileId);
        if (!file)
            return null;
        try {
            return node_fs__WEBPACK_IMPORTED_MODULE_1__.readFileSync(file.path);
        }
        catch (error) {
            _logger__WEBPACK_IMPORTED_MODULE_3__/* .logger */ .v.error("Failed to read file", error);
            return null;
        }
    }
    deleteFile(fileId, userId) {
        const file = this.files.get(fileId);
        if (!file)
            return false;
        if (userId && file.userId !== userId) {
            _logger__WEBPACK_IMPORTED_MODULE_3__/* .logger */ .v.warn("Unauthorized file deletion attempt", { fileId, userId });
            return false;
        }
        try {
            node_fs__WEBPACK_IMPORTED_MODULE_1__.unlinkSync(file.path);
            this.files.delete(fileId);
            _logger__WEBPACK_IMPORTED_MODULE_3__/* .logger */ .v.info("File deleted", { fileId });
            return true;
        }
        catch (error) {
            _logger__WEBPACK_IMPORTED_MODULE_3__/* .logger */ .v.error("Failed to delete file", error);
            return false;
        }
    }
    getUserFiles(userId) {
        return Array.from(this.files.values()).filter((f) => f.userId === userId);
    }
    listFiles() {
        return Array.from(this.files.values());
    }
    cleanupOldFiles(maxAgeDays = 30) {
        const now = new Date();
        const cutoff = new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);
        let deletedCount = 0;
        for (const [fileId, file] of this.files.entries()) {
            if (file.uploadedAt < cutoff) {
                if (this.deleteFile(fileId)) {
                    deletedCount++;
                }
            }
        }
        _logger__WEBPACK_IMPORTED_MODULE_3__/* .logger */ .v.info("Old files cleaned up", {
            deletedCount,
            maxAgeDays,
        });
        return deletedCount;
    }
    getStorageStats() {
        let totalSize = 0;
        const filesByType = {};
        for (const file of this.files.values()) {
            totalSize += file.size;
            filesByType[file.mimeType] = (filesByType[file.mimeType] || 0) + 1;
        }
        return {
            totalFiles: this.files.size,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            filesByType,
        };
    }
}
const fileUploadManager = new FileUploadManager();


/***/ }),

/***/ 132:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $: () => (/* binding */ webhookManager)
/* harmony export */ });
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(629);

class WebhookManager {
    subscriptions;
    constructor() {
        this.subscriptions = new Map();
        this.loadSubscriptionsFromEnv();
    }
    loadSubscriptionsFromEnv() {
        const discordUrl = process.env.DISCORD_WEBHOOK_URL;
        const slackUrl = process.env.SLACK_WEBHOOK_URL;
        const customUrl = process.env.CUSTOM_WEBHOOK_URL;
        if (discordUrl) {
            this.subscribe("discord", {
                url: discordUrl,
                events: [
                    "error.critical",
                    "system.health_check_failed",
                    "rate_limit.exceeded",
                ],
                enabled: true,
            });
        }
        if (slackUrl) {
            this.subscribe("slack", {
                url: slackUrl,
                events: ["user.registered", "backup.completed", "error.critical"],
                enabled: true,
            });
        }
        if (customUrl) {
            this.subscribe("custom", {
                url: customUrl,
                events: ["chat.message", "feedback.created"],
                secret: process.env.CUSTOM_WEBHOOK_SECRET,
                enabled: true,
            });
        }
    }
    subscribe(name, subscription) {
        this.subscriptions.set(name, subscription);
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.info(`Webhook subscribed: ${name}`, { events: subscription.events });
    }
    unsubscribe(name) {
        this.subscriptions.delete(name);
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.info(`Webhook unsubscribed: ${name}`);
    }
    async emit(event, data) {
        const payload = {
            event,
            timestamp: new Date(),
            data,
        };
        const promises = [];
        for (const [name, subscription] of this.subscriptions.entries()) {
            if (!subscription.enabled)
                continue;
            if (!subscription.events.includes(event))
                continue;
            promises.push(this.sendWebhook(name, subscription, payload));
        }
        await Promise.allSettled(promises);
    }
    async sendWebhook(name, subscription, payload) {
        try {
            const headers = {
                "Content-Type": "application/json",
            };
            if (subscription.secret) {
                const signature = await this.generateSignature(JSON.stringify(payload), subscription.secret);
                headers["X-Webhook-Signature"] = signature;
            }
            const response = await fetch(subscription.url, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.warn(`Webhook delivery failed: ${name}`, {
                    status: response.status,
                });
            }
            else {
                _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.debug(`Webhook delivered: ${name}`, { event: payload.event });
            }
        }
        catch (error) {
            _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.error(`Webhook error: ${name}`, error);
        }
    }
    async generateSignature(payload, secret) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const data = encoder.encode(payload);
        const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const signature = await crypto.subtle.sign("HMAC", key, data);
        return Array.from(new Uint8Array(signature))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }
    getSubscriptions() {
        return Array.from(this.subscriptions.entries()).map(([name, sub]) => ({
            name,
            events: sub.events,
            enabled: sub.enabled,
        }));
    }
    toggleSubscription(name, enabled) {
        const subscription = this.subscriptions.get(name);
        if (subscription) {
            subscription.enabled = enabled;
            _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.info(`Webhook ${enabled ? "enabled" : "disabled"}: ${name}`);
        }
    }
}
const webhookManager = new WebhookManager();


/***/ }),

/***/ 172:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  x: () => (/* binding */ emailNotifier)
});

;// external "nodemailer"
const external_nodemailer_namespaceObject = require("nodemailer");
var external_nodemailer_default = /*#__PURE__*/__webpack_require__.n(external_nodemailer_namespaceObject);
// EXTERNAL MODULE: ./src/lib/logger.ts
var logger = __webpack_require__(629);
;// ./src/lib/email-notifier.ts


class EmailNotifier {
    transporter;
    config;
    constructor() {
        this.config = {
            enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === "true",
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER || "",
                pass: process.env.SMTP_PASS || "",
            },
            from: process.env.EMAIL_FROM || "noreply@elysia-ai.com",
        };
        if (this.config.enabled && this.config.auth.user && this.config.auth.pass) {
            this.initializeTransporter();
        }
    }
    initializeTransporter() {
        try {
            this.transporter = external_nodemailer_default().createTransport({
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
                auth: this.config.auth,
            });
            logger/* logger */.v.info("Email transporter initialized", {
                host: this.config.host,
                port: this.config.port,
            });
        }
        catch (error) {
            logger/* logger */.v.error("Failed to initialize email transporter", error);
        }
    }
    async send(options) {
        if (!this.config.enabled) {
            logger/* logger */.v.debug("Email notifications are disabled");
            return false;
        }
        if (!this.transporter) {
            logger/* logger */.v.warn("Email transporter not initialized");
            return false;
        }
        try {
            const info = await this.transporter.sendMail({
                from: this.config.from,
                to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
            });
            logger/* logger */.v.info("Email sent", {
                messageId: info.messageId,
                to: options.to,
                subject: options.subject,
            });
            return true;
        }
        catch (error) {
            logger/* logger */.v.error("Failed to send email", error);
            return false;
        }
    }
    async sendErrorNotification(error, context) {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail)
            return;
        const html = `
			<h2>🚨 エリシアAI - エラー発生</h2>
			<p><strong>エラーメッセージ:</strong> ${error.message}</p>
			<p><strong>発生時刻:</strong> ${new Date().toLocaleString("ja-JP")}</p>
			${context ? `<p><strong>コンテキスト:</strong> <pre>${JSON.stringify(context, null, 2)}</pre></p>` : ""}
			${error.stack ? `<p><strong>スタックトレース:</strong> <pre>${error.stack}</pre></p>` : ""}
		`;
        await this.send({
            to: adminEmail,
            subject: `[エリシアAI] エラー通知: ${error.message}`,
            html,
        });
    }
    async sendWelcomeEmail(userEmail, userName) {
        const html = `
			<h2>🎉 エリシアAIへようこそ！</h2>
			<p>こんにちは、${userName}さん♡</p>
			<p>エリシアAIのアカウント登録が完了しました！</p>
			<p>さっそくチャットを始めてみましょう！</p>
			<hr>
			<p><small>このメールに心当たりがない場合は、無視してください。</small></p>
		`;
        await this.send({
            to: userEmail,
            subject: "エリシアAIへようこそ！",
            html,
        });
    }
    async sendBackupNotification(backupInfo) {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail)
            return;
        const html = `
			<h2>✅ 自動バックアップ完了</h2>
			<p><strong>ファイル:</strong> ${backupInfo.file}</p>
			<p><strong>サイズ:</strong> ${(backupInfo.size / 1024 / 1024).toFixed(2)} MB</p>
			<p><strong>処理時間:</strong> ${backupInfo.duration}ms</p>
			<p><strong>完了時刻:</strong> ${new Date().toLocaleString("ja-JP")}</p>
		`;
        await this.send({
            to: adminEmail,
            subject: "[エリシアAI] 自動バックアップ完了",
            html,
        });
    }
    async sendHealthCheckFailure(service, details) {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail)
            return;
        const html = `
			<h2>⚠️ ヘルスチェック失敗</h2>
			<p><strong>サービス:</strong> ${service}</p>
			<p><strong>詳細:</strong> ${details}</p>
			<p><strong>発生時刻:</strong> ${new Date().toLocaleString("ja-JP")}</p>
			<p>早急に確認してください。</p>
		`;
        await this.send({
            to: adminEmail,
            subject: `[エリシアAI] ヘルスチェック失敗: ${service}`,
            html,
        });
    }
    getStatus() {
        return {
            enabled: this.config.enabled,
            configured: !!this.transporter,
            host: this.config.host,
            port: this.config.port,
            from: this.config.from,
        };
    }
}
const emailNotifier = new EmailNotifier();


/***/ }),

/***/ 229:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _elysiajs_cors__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(836);
/* harmony import */ var _elysiajs_cors__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_elysiajs_cors__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _elysiajs_html__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(696);
/* harmony import */ var _elysiajs_html__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_elysiajs_html__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _elysiajs_static__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(855);
/* harmony import */ var _elysiajs_static__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_elysiajs_static__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _elysiajs_swagger__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(811);
/* harmony import */ var _elysiajs_swagger__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_elysiajs_swagger__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(938);
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var elysia__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(931);
/* harmony import */ var elysia__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(elysia__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var jsonwebtoken__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(829);
/* harmony import */ var jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(jsonwebtoken__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var sanitize_html__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(583);
/* harmony import */ var sanitize_html__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(sanitize_html__WEBPACK_IMPORTED_MODULE_8__);
/* harmony import */ var _internal_app_llm_llm_config__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(970);
/* harmony import */ var _internal_secure_auth__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(237);
/* harmony import */ var _internal_secure_db__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(807);
/* harmony import */ var _lib_ab_testing__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(95);
/* harmony import */ var _lib_api_key_manager__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(257);
/* harmony import */ var _lib_audit_logger__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(371);
/* harmony import */ var _lib_audit_middleware__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(695);
/* harmony import */ var _lib_backup_scheduler__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(935);
/* harmony import */ var _lib_cron_scheduler__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(74);
/* harmony import */ var _lib_database__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(828);
/* harmony import */ var _lib_env_validator__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(709);
/* harmony import */ var _lib_file_upload__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(121);
/* harmony import */ var _lib_health__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(703);
/* harmony import */ var _lib_health_monitor__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(732);
/* harmony import */ var _lib_job_queue__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(654);
/* harmony import */ var _lib_log_cleanup__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(922);
/* harmony import */ var _lib_logger__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(629);
/* harmony import */ var _lib_metrics__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(644);
/* harmony import */ var _lib_session_manager__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(619);
/* harmony import */ var _lib_telemetry__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(112);
/* harmony import */ var _lib_webhook_events__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(132);






























(0,_lib_env_validator__WEBPACK_IMPORTED_MODULE_19__/* .checkEnvironmentOrExit */ .x)();
_lib_backup_scheduler__WEBPACK_IMPORTED_MODULE_16__/* .backupScheduler */ .m.start();
_lib_health_monitor__WEBPACK_IMPORTED_MODULE_22__.healthMonitor.start();
_lib_log_cleanup__WEBPACK_IMPORTED_MODULE_24__.logCleanupManager.start();
try {
    await _lib_job_queue__WEBPACK_IMPORTED_MODULE_23__/* .jobQueue */ .f.initialize();
}
catch (error) {
    _lib_logger__WEBPACK_IMPORTED_MODULE_25__/* .logger */ .v.warn("Job queue initialization failed, continuing without job queue", {
        error: error instanceof Error ? error.message : String(error),
    });
}
_lib_cron_scheduler__WEBPACK_IMPORTED_MODULE_17__/* .cronScheduler */ .m.initializeDefaultTasks();
const CONFIG = {
    PORT: Number(process.env.PORT) || 3000,
    RAG_API_URL: _internal_secure_db__WEBPACK_IMPORTED_MODULE_11__/* .DATABASE_CONFIG */ .r.RAG_API_URL,
    RAG_TIMEOUT: _internal_secure_db__WEBPACK_IMPORTED_MODULE_11__/* .DATABASE_CONFIG */ .r.RAG_TIMEOUT,
    MODEL_NAME: process.env.MODEL_NAME || "llama3.2",
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    MAX_REQUESTS_PER_MINUTE: Number(process.env.RATE_LIMIT_RPM) || 60,
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
    ]),
    AUTH_USERNAME: process.env.AUTH_USERNAME || "elysia",
    AUTH_PASSWORD: process.env.AUTH_PASSWORD || "elysia-dev-password",
    JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
};
function jsonError(status, message) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "content-type": "application/json" },
    });
}
async function checkRateLimit(key) {
    try {
        return await (0,_internal_secure_auth__WEBPACK_IMPORTED_MODULE_10__/* .checkRateLimitRedis */ .HY)(key, CONFIG.MAX_REQUESTS_PER_MINUTE);
    }
    catch {
        return true;
    }
}
function containsDangerousKeywords(text) {
    const bad = [/\b(drop|delete)\b/i, /<script/i];
    return bad.some((r) => r.test(text));
}
const auditMiddleware = (0,_lib_audit_middleware__WEBPACK_IMPORTED_MODULE_15__/* .createAuditMiddleware */ .W)({
    excludePaths: ["/ping", "/health", "/metrics", "/swagger"],
    excludeMethods: ["OPTIONS"],
    includeBody: false,
});
const app = new elysia__WEBPACK_IMPORTED_MODULE_6__.Elysia()
    .use((0,_elysiajs_cors__WEBPACK_IMPORTED_MODULE_1__.cors)({ origin: CONFIG.ALLOWED_ORIGINS }))
    .use((0,_elysiajs_html__WEBPACK_IMPORTED_MODULE_2__.html)())
    .use((0,_elysiajs_static__WEBPACK_IMPORTED_MODULE_3__.staticPlugin)({ assets: "public" }))
    .use((0,_elysiajs_swagger__WEBPACK_IMPORTED_MODULE_4__.swagger)({ path: "/swagger" }))
    .onBeforeHandle(({ request }) => {
    const url = new URL(request.url);
    const path = url.pathname;
    const traceContext = (0,_lib_telemetry__WEBPACK_IMPORTED_MODULE_28__/* .getTraceContextFromRequest */ .Ql)(request);
    const span = _lib_telemetry__WEBPACK_IMPORTED_MODULE_28__/* .telemetry */ .Y9.startSpan(`HTTP ${request.method} ${path}`, {
        parentContext: traceContext || undefined,
        attributes: {
            "http.method": request.method,
            "http.url": request.url,
            "http.route": path,
        },
    });
    request.__span = span;
    request.__startTime = Date.now();
    _lib_metrics__WEBPACK_IMPORTED_MODULE_26__/* .metricsCollector */ .D.incrementRequest(request.method, path, 200);
})
    .onBeforeHandle(auditMiddleware.beforeHandle)
    .onError(({ error, code, request, set }) => {
    const url = new URL(request.url);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorLog = `${String(code)}: ${errorMsg} at ${url.pathname}`;
    _lib_logger__WEBPACK_IMPORTED_MODULE_25__/* .logger */ .v.error(errorLog);
    _lib_metrics__WEBPACK_IMPORTED_MODULE_26__/* .metricsCollector */ .D.incrementError(request.method, url.pathname, String(code));
    const span = request.__span;
    if (span) {
        _lib_telemetry__WEBPACK_IMPORTED_MODULE_28__/* .telemetry */ .Y9.endSpan(span.spanId, {
            code: "ERROR",
            message: errorMsg,
        });
    }
    auditMiddleware.onError({ request, error, set });
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonError(500, message);
})
    .onAfterHandle(({ set, request, response }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    const extReq = request;
    const span = extReq.__span;
    if (span) {
        set.headers.traceparent = _lib_telemetry__WEBPACK_IMPORTED_MODULE_28__/* .telemetry */ .Y9.createTraceContext(span.traceId, span.spanId);
        _lib_telemetry__WEBPACK_IMPORTED_MODULE_28__/* .telemetry */ .Y9.endSpan(span.spanId);
    }
    const startTime = extReq.__startTime;
    if (startTime) {
        const duration = (Date.now() - startTime) / 1000;
        const url = new URL(request.url);
        _lib_metrics__WEBPACK_IMPORTED_MODULE_26__/* .metricsCollector */ .D.recordRequestDuration(request.method, url.pathname, duration);
    }
    auditMiddleware.afterHandle({ request, set, response });
})
    .get("/ping", () => ({ ok: true }), {
    detail: {
        tags: ["health"],
        summary: "Health check endpoint",
        description: "Returns a simple OK response to verify server is running",
    },
})
    .get("/health", async () => {
    try {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        const health = await (0,_lib_health__WEBPACK_IMPORTED_MODULE_21__/* .performHealthCheck */ .uY)(redisUrl, CONFIG.RAG_API_URL, CONFIG.OLLAMA_BASE_URL);
        const status = health.status === "healthy" ? 200 : 503;
        return new Response(JSON.stringify(health), {
            status,
            headers: { "content-type": "application/json" },
        });
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        _lib_logger__WEBPACK_IMPORTED_MODULE_25__/* .logger */ .v.error(`Health check failed: ${errorMsg}`);
        return jsonError(503, "Health check failed");
    }
}, {
    detail: {
        tags: ["health"],
        summary: "Detailed health check",
        description: "Check status of Redis, FastAPI, Ollama, and system metrics",
    },
})
    .get("/metrics", () => {
    const metrics = _lib_metrics__WEBPACK_IMPORTED_MODULE_26__/* .metricsCollector */ .D.toPrometheusFormat();
    return new Response(metrics, {
        headers: { "content-type": "text/plain; version=0.0.4" },
    });
}, {
    detail: {
        tags: ["monitoring"],
        summary: "Prometheus metrics",
        description: "Expose metrics in Prometheus format",
    },
})
    .get("/", () => Bun.file("public/index.html"), {
    detail: {
        tags: ["ui"],
        summary: "Portfolio index page",
        description: "Serves the main Elysia AI portfolio and chat interface",
    },
})
    .post("/feedback", async ({ body, request, }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    let payload;
    try {
        payload = jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)("data"))
        (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.mkdirSync)("data", { recursive: true });
    const ip = request.headers.get("x-forwarded-for") || "anon";
    const userId = payload.userId || undefined;
    try {
        await _lib_database__WEBPACK_IMPORTED_MODULE_18__.feedbackService.create({
            userId,
            query: body.query,
            answer: body.answer,
            rating: body.rating,
            reason: body.reason || undefined,
        });
    }
    catch (err) {
        _lib_logger__WEBPACK_IMPORTED_MODULE_25__/* .logger */ .v.error("Failed to store feedback", err instanceof Error ? err : undefined);
        return jsonError(500, "Failed to store feedback");
    }
    return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
    });
}, {
    body: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Object({
        query: elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ minLength: 1, maxLength: 400 }),
        answer: elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ minLength: 1, maxLength: 4000 }),
        rating: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Union([elysia__WEBPACK_IMPORTED_MODULE_6__.t.Literal("up"), elysia__WEBPACK_IMPORTED_MODULE_6__.t.Literal("down")]),
        reason: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Optional(elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ maxLength: 256 })),
    }),
    detail: {
        tags: ["feedback"],
        summary: "Submit user feedback",
        description: "Submit feedback for a query-answer pair. Requires JWT authentication.",
        security: [{ bearerAuth: [] }],
    },
})
    .post("/knowledge/upsert", async ({ body, request, }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    try {
        await _lib_database__WEBPACK_IMPORTED_MODULE_18__.knowledgeService.create({
            question: body.summary,
            answer: body.sourceUrl || "No source provided",
            source: "api",
            verified: body.confidence > 0.8,
        });
    }
    catch (err) {
        _lib_logger__WEBPACK_IMPORTED_MODULE_25__/* .logger */ .v.error("Failed to store knowledge", err instanceof Error ? err : undefined);
        return jsonError(500, "Failed to store knowledge");
    }
    return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
    });
}, {
    body: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Object({
        summary: elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ minLength: 10, maxLength: 2000 }),
        sourceUrl: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Optional(elysia__WEBPACK_IMPORTED_MODULE_6__.t.String()),
        tags: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Optional(elysia__WEBPACK_IMPORTED_MODULE_6__.t.Array(elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ maxLength: 32 }), { maxItems: 8 })),
        confidence: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Number({ minimum: 0, maximum: 1 }),
    }),
    detail: {
        tags: ["knowledge"],
        summary: "Add or update knowledge entry",
        description: "Store a new knowledge entry with summary, source, tags, and confidence. Requires JWT.",
        security: [{ bearerAuth: [] }],
    },
})
    .get("/knowledge/review", async ({ request, query }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const n = Number(query?.n ?? 20) || 20;
    try {
        if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)("data/knowledge.jsonl"))
            return new Response(JSON.stringify([]), {
                headers: { "content-type": "application/json" },
            });
        const file = await Bun.file("data/knowledge.jsonl").text();
        const lines = file.trim().split("\n").filter(Boolean);
        const last = lines
            .slice(Math.max(0, lines.length - n))
            .map((l) => JSON.parse(l));
        return new Response(JSON.stringify(last), {
            headers: { "content-type": "application/json" },
        });
    }
    catch {
        return jsonError(500, "Failed to read knowledge");
    }
}, {
    query: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Object({ n: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Optional(elysia__WEBPACK_IMPORTED_MODULE_6__.t.Number()) }),
    detail: {
        tags: ["knowledge"],
        summary: "Get recent knowledge entries",
        description: "Retrieve the last N knowledge entries from the knowledge base. Requires JWT.",
        security: [{ bearerAuth: [] }],
    },
})
    .post("/auth/token", async ({ body }) => {
    const { username, password } = body;
    if (username !== CONFIG.AUTH_USERNAME ||
        password !== CONFIG.AUTH_PASSWORD)
        return jsonError(401, "Invalid credentials");
    const userId = username;
    const accessToken = jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().sign({ iss: "elysia-ai", userId, iat: Math.floor(Date.now() / 1000) }, CONFIG.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().sign({
        iss: "elysia-ai-refresh",
        userId,
        iat: Math.floor(Date.now() / 1000),
    }, CONFIG.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    await (0,_internal_secure_auth__WEBPACK_IMPORTED_MODULE_10__/* .storeRefreshToken */ .OL)(userId, refreshToken, 7 * 24 * 60 * 60);
    return new Response(JSON.stringify({ accessToken, refreshToken, expiresIn: 900 }), { headers: { "content-type": "application/json" } });
}, {
    body: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Object({
        username: elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ minLength: 1, maxLength: 128 }),
        password: elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ minLength: 1, maxLength: 128 }),
    }),
    detail: {
        tags: ["auth"],
        summary: "Login and get JWT tokens",
        description: "Authenticate with username and password to receive access token (15min) and refresh token (7 days)",
    },
})
    .post("/auth/refresh", async ({ body }) => {
    const { refreshToken } = body;
    let payload;
    try {
        payload = jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(refreshToken, CONFIG.JWT_REFRESH_SECRET);
    }
    catch {
        return jsonError(401, "Invalid or expired refresh token");
    }
    const userId = payload.userId || "default-user";
    const isValid = await (0,_internal_secure_auth__WEBPACK_IMPORTED_MODULE_10__/* .verifyStoredRefreshToken */ .tj)(userId, refreshToken);
    if (!isValid)
        return jsonError(401, "Refresh token not found or revoked");
    const newAccessToken = jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().sign({ iss: "elysia-ai", userId, iat: Math.floor(Date.now() / 1000) }, CONFIG.JWT_SECRET, { expiresIn: "15m" });
    return new Response(JSON.stringify({ accessToken: newAccessToken, expiresIn: 900 }), { headers: { "content-type": "application/json" } });
}, {
    body: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Object({ refreshToken: elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ minLength: 20 }) }),
    detail: {
        tags: ["auth"],
        summary: "Refresh access token",
        description: "Exchange a valid refresh token for a new access token without re-authentication",
    },
})
    .post("/auth/logout", async ({ body }) => {
    const { refreshToken } = body;
    try {
        const payload = jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(refreshToken, CONFIG.JWT_REFRESH_SECRET);
        const userId = payload.userId || "default-user";
        await (0,_internal_secure_auth__WEBPACK_IMPORTED_MODULE_10__/* .revokeRefreshToken */ .ln)(userId);
        return new Response(JSON.stringify({ message: "Logged out successfully" }), {
            headers: { "content-type": "application/json" },
        });
    }
    catch {
        return jsonError(400, "Invalid refresh token");
    }
}, {
    body: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Object({ refreshToken: elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ minLength: 20 }) }),
    detail: {
        tags: ["auth"],
        summary: "Logout and revoke refresh token",
        description: "Revoke a refresh token to prevent future token refreshes. Effectively logs out the user.",
    },
})
    .guard({
    beforeHandle: ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        if (!auth.startsWith("Bearer "))
            throw new Error("Missing Bearer token");
        try {
            jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
        }
        catch {
            throw new Error("Invalid or expired token");
        }
    },
}, (app) => app.post("/elysia-love", async ({ body, request }) => {
    const ip = request.headers.get("x-forwarded-for") || "anon";
    let userId = "anon";
    const auth = request.headers.get("authorization") || "";
    try {
        if (auth.startsWith("Bearer ")) {
            const payload = jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
            userId = payload.userId || "anon";
        }
    }
    catch { }
    const clientKey = `${userId}:${ip}`;
    const rateLimitOk = await checkRateLimit(clientKey);
    if (!rateLimitOk)
        return jsonError(429, "Rate limit exceeded");
    const mode = body.mode || _internal_app_llm_llm_config__WEBPACK_IMPORTED_MODULE_9__/* .DEFAULT_MODE */ .Cm;
    const llmConfig = _internal_app_llm_llm_config__WEBPACK_IMPORTED_MODULE_9__/* .ELYSIA_MODES */ .V_[mode];
    const sanitizedMessages = body.messages.map((m) => {
        const cleaned = sanitize_html__WEBPACK_IMPORTED_MODULE_8___default()(m.content, {
            allowedTags: [],
            allowedAttributes: {},
        });
        if (containsDangerousKeywords(cleaned))
            throw new Error("Dangerous content detected");
        return { ...m, content: cleaned };
    });
    const messagesWithSystem = [
        { role: "system", content: llmConfig.systemPrompt },
        ...sanitizedMessages,
    ];
    try {
        const upstream = await axios__WEBPACK_IMPORTED_MODULE_5___default().post(CONFIG.RAG_API_URL, {
            messages: messagesWithSystem,
            temperature: llmConfig.temperature,
            model: llmConfig.model,
        }, { responseType: "stream", timeout: CONFIG.RAG_TIMEOUT });
        return new Response(upstream.data, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "X-Elysia-Mode": mode,
            },
        });
    }
    catch (error) {
        if (axios__WEBPACK_IMPORTED_MODULE_5___default().isAxiosError(error) && error.response?.status === 503)
            return jsonError(503, "Upstream unavailable");
        return jsonError(500, "Internal chat error");
    }
}, {
    body: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Object({
        messages: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Array(elysia__WEBPACK_IMPORTED_MODULE_6__.t.Object({
            role: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Union([
                elysia__WEBPACK_IMPORTED_MODULE_6__.t.Literal("user"),
                elysia__WEBPACK_IMPORTED_MODULE_6__.t.Literal("assistant"),
                elysia__WEBPACK_IMPORTED_MODULE_6__.t.Literal("system"),
            ]),
            content: elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({
                maxLength: 400,
                minLength: 1,
            }),
        }), { maxItems: 8 }),
        mode: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Optional(elysia__WEBPACK_IMPORTED_MODULE_6__.t.Union([
            elysia__WEBPACK_IMPORTED_MODULE_6__.t.Literal("sweet"),
            elysia__WEBPACK_IMPORTED_MODULE_6__.t.Literal("normal"),
            elysia__WEBPACK_IMPORTED_MODULE_6__.t.Literal("professional"),
        ])),
    }),
    detail: {
        tags: ["chat"],
        summary: "Chat with Elysia AI (Multi-LLM)",
        description: "Send chat messages to Elysia AI with selectable personality modes (sweet/normal/professional). Returns streaming SSE response. Requires JWT.",
        security: [{ bearerAuth: [] }],
    },
}))
    .get("/admin/feedback/stats", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const stats = await _lib_database__WEBPACK_IMPORTED_MODULE_18__.feedbackService.getStats();
    return new Response(JSON.stringify(stats), {
        headers: { "content-type": "application/json" },
    });
}, {
    detail: {
        tags: ["admin"],
        summary: "Get feedback statistics",
        security: [{ bearerAuth: [] }],
    },
})
    .get("/admin/feedback", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const feedbacks = await _lib_database__WEBPACK_IMPORTED_MODULE_18__.feedbackService.getRecent(100);
    return new Response(JSON.stringify(feedbacks), {
        headers: { "content-type": "application/json" },
    });
}, {
    detail: {
        tags: ["admin"],
        summary: "Get recent feedback",
        security: [{ bearerAuth: [] }],
    },
})
    .get("/admin/knowledge", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const knowledge = await _lib_database__WEBPACK_IMPORTED_MODULE_18__.knowledgeService.getAll(false);
    return new Response(JSON.stringify(knowledge), {
        headers: { "content-type": "application/json" },
    });
}, {
    detail: {
        tags: ["admin"],
        summary: "Get all knowledge entries",
        security: [{ bearerAuth: [] }],
    },
})
    .post("/admin/knowledge/:id/verify", async ({ params, request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    await _lib_database__WEBPACK_IMPORTED_MODULE_18__.knowledgeService.verify(params.id);
    return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
    });
}, {
    detail: {
        tags: ["admin"],
        summary: "Verify knowledge entry",
        security: [{ bearerAuth: [] }],
    },
})
    .delete("/admin/knowledge/:id", async ({ params, request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    await _lib_database__WEBPACK_IMPORTED_MODULE_18__.knowledgeService.delete(params.id);
    return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
    });
}, {
    detail: {
        tags: ["admin"],
        summary: "Delete knowledge entry",
        security: [{ bearerAuth: [] }],
    },
});
app.post("/auth/register", async ({ body }) => {
    const { username, password } = body;
    const existing = await _lib_database__WEBPACK_IMPORTED_MODULE_18__/* .userService */ .Dv.findByUsername(username);
    if (existing) {
        return jsonError(400, "Username already exists");
    }
    if (password.length < 8) {
        return jsonError(400, "Password must be at least 8 characters");
    }
    try {
        const { createUser } = await __webpack_require__.e(/* import() */ 615).then(__webpack_require__.bind(__webpack_require__, 615));
        const user = await createUser(username, password, "user");
        return new Response(JSON.stringify({
            success: true,
            userId: user.id,
            username: user.username,
        }), { headers: { "content-type": "application/json" } });
    }
    catch (error) {
        _lib_logger__WEBPACK_IMPORTED_MODULE_25__/* .logger */ .v.error("Registration failed", error instanceof Error ? error : undefined);
        return jsonError(500, "Registration failed");
    }
}, {
    body: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Object({
        username: elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ minLength: 3, maxLength: 32 }),
        password: elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ minLength: 8, maxLength: 128 }),
    }),
    detail: {
        tags: ["auth"],
        summary: "Register new user",
    },
});
app.get("/admin/export/feedback", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const { exportFeedbackToCSV } = await __webpack_require__.e(/* import() */ 508).then(__webpack_require__.bind(__webpack_require__, 508));
    const csv = await exportFeedbackToCSV();
    return new Response(csv, {
        headers: {
            "content-type": "text/csv; charset=utf-8",
            "content-disposition": `attachment; filename="feedback_${new Date().toISOString().split("T")[0]}.csv"`,
        },
    });
});
app.get("/admin/export/knowledge/json", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const { exportKnowledgeToJSON } = await __webpack_require__.e(/* import() */ 508).then(__webpack_require__.bind(__webpack_require__, 508));
    const json = await exportKnowledgeToJSON();
    return new Response(json, {
        headers: {
            "content-type": "application/json; charset=utf-8",
            "content-disposition": `attachment; filename="knowledge_${new Date().toISOString().split("T")[0]}.json"`,
        },
    });
});
app.get("/admin/analytics", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const { apiAnalytics } = await __webpack_require__.e(/* import() */ 404).then(__webpack_require__.bind(__webpack_require__, 404));
    const data = apiAnalytics.exportJSON();
    return new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
    });
});
app.get("/admin/webhooks", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    return { webhooks: _lib_webhook_events__WEBPACK_IMPORTED_MODULE_29__/* .webhookManager */ .$.getSubscriptions() };
});
app.post("/admin/api-keys", async ({ request, body }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const { name, rateLimit, expiresInDays } = body;
    const apiKey = _lib_api_key_manager__WEBPACK_IMPORTED_MODULE_13__/* .apiKeyManager */ .X.generateKey({
        name,
        rateLimit,
        expiresInDays,
    });
    return { success: true, key: apiKey.key };
}, {
    body: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Object({
        name: elysia__WEBPACK_IMPORTED_MODULE_6__.t.String({ minLength: 1 }),
        rateLimit: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Optional(elysia__WEBPACK_IMPORTED_MODULE_6__.t.Number()),
        expiresInDays: elysia__WEBPACK_IMPORTED_MODULE_6__.t.Optional(elysia__WEBPACK_IMPORTED_MODULE_6__.t.Number()),
    }),
});
app.get("/admin/api-keys", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    return {
        keys: _lib_api_key_manager__WEBPACK_IMPORTED_MODULE_13__/* .apiKeyManager */ .X.listKeys(),
        stats: _lib_api_key_manager__WEBPACK_IMPORTED_MODULE_13__/* .apiKeyManager */ .X.getUsageStats(),
    };
});
app.get("/admin/backups", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    return {
        status: _lib_backup_scheduler__WEBPACK_IMPORTED_MODULE_16__/* .backupScheduler */ .m.getStatus(),
        history: _lib_backup_scheduler__WEBPACK_IMPORTED_MODULE_16__/* .backupScheduler */ .m.getBackupHistory(),
    };
});
app.post("/admin/backups/trigger", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    await _lib_backup_scheduler__WEBPACK_IMPORTED_MODULE_16__/* .backupScheduler */ .m.triggerManualBackup();
    return { success: true, message: "Backup triggered" };
});
app.get("/admin/health-monitor", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    return _lib_health_monitor__WEBPACK_IMPORTED_MODULE_22__.healthMonitor.getStatus();
});
app.get("/admin/sessions", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        const payload = jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
        return {
            sessions: _lib_session_manager__WEBPACK_IMPORTED_MODULE_27__/* .sessionManager */ .i.getUserSessions(payload.userId),
            stats: _lib_session_manager__WEBPACK_IMPORTED_MODULE_27__/* .sessionManager */ .i.getStats(),
        };
    }
    catch {
        return jsonError(401, "Invalid token");
    }
});
app.get("/admin/ab-tests", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    return { tests: _lib_ab_testing__WEBPACK_IMPORTED_MODULE_12__/* .abTestManager */ .n.listTests() };
});
app.get("/admin/ab-tests/:testId", async ({ request, params }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const results = _lib_ab_testing__WEBPACK_IMPORTED_MODULE_12__/* .abTestManager */ .n.getTestResults(params.testId);
    if (!results)
        return jsonError(404, "Test not found");
    return results;
});
app.get("/admin/logs/cleanup", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    return _lib_log_cleanup__WEBPACK_IMPORTED_MODULE_24__.logCleanupManager.getStats();
});
app.post("/admin/logs/cleanup/trigger", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    await _lib_log_cleanup__WEBPACK_IMPORTED_MODULE_24__.logCleanupManager.triggerManualCleanup();
    return { success: true, message: "Log cleanup triggered" };
});
app.get("/admin/jobs/stats", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    return await _lib_job_queue__WEBPACK_IMPORTED_MODULE_23__/* .jobQueue */ .f.getStats();
});
app.post("/admin/jobs/email", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const body = (await request.json());
    const job = (await _lib_job_queue__WEBPACK_IMPORTED_MODULE_23__/* .jobQueue */ .f.sendEmail(body.to, body.subject, body.html));
    return { success: true, jobId: job.id };
});
app.post("/admin/jobs/report", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const body = (await request.json());
    const job = (await _lib_job_queue__WEBPACK_IMPORTED_MODULE_23__/* .jobQueue */ .f.generateReport(body.reportType, new Date(body.startDate), new Date(body.endDate)));
    return { success: true, jobId: job.id };
});
app.post("/upload", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    let userId;
    try {
        const decoded = jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
        userId = decoded.username;
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
        return jsonError(400, "No file provided");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedFile = await _lib_file_upload__WEBPACK_IMPORTED_MODULE_20__/* .fileUploadManager */ .r.upload(buffer, file.name, file.type, { userId });
    return {
        success: true,
        file: {
            id: uploadedFile.id,
            originalName: uploadedFile.originalName,
            size: uploadedFile.size,
            mimeType: uploadedFile.mimeType,
        },
    };
});
app.get("/files/:fileId", async ({ request, params }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const { fileId } = params;
    const file = _lib_file_upload__WEBPACK_IMPORTED_MODULE_20__/* .fileUploadManager */ .r.getFile(fileId);
    if (!file) {
        return jsonError(404, "File not found");
    }
    const buffer = _lib_file_upload__WEBPACK_IMPORTED_MODULE_20__/* .fileUploadManager */ .r.readFile(fileId);
    if (!buffer) {
        return jsonError(404, "File not found");
    }
    return new Response(new Uint8Array(buffer), {
        headers: {
            "content-type": file.mimeType,
            "content-disposition": `attachment; filename="${file.originalName}"`,
        },
    });
});
app.get("/files", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    let userId;
    try {
        const decoded = jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
        userId = decoded.username;
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const files = _lib_file_upload__WEBPACK_IMPORTED_MODULE_20__/* .fileUploadManager */ .r.getUserFiles(userId);
    return {
        files: files.map((f) => ({
            id: f.id,
            originalName: f.originalName,
            size: f.size,
            mimeType: f.mimeType,
            uploadedAt: f.uploadedAt,
        })),
    };
});
app.get("/admin/cron/tasks", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    return { tasks: _lib_cron_scheduler__WEBPACK_IMPORTED_MODULE_17__/* .cronScheduler */ .m.listTasks() };
});
app.get("/admin/cron/stats", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    return _lib_cron_scheduler__WEBPACK_IMPORTED_MODULE_17__/* .cronScheduler */ .m.getStats();
});
app.post("/admin/cron/tasks/:name/run", async ({ request, params }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    try {
        await _lib_cron_scheduler__WEBPACK_IMPORTED_MODULE_17__/* .cronScheduler */ .m.runTask(params.name);
        return { success: true, message: `Task ${params.name} executed` };
    }
    catch (error) {
        return jsonError(400, error.message);
    }
});
app.get("/admin/audit/logs", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const url = new URL(request.url);
    const result = _lib_audit_logger__WEBPACK_IMPORTED_MODULE_14__/* .auditLogger */ ._.search({
        userId: url.searchParams.get("userId") || undefined,
        action: url.searchParams.get("action") || undefined,
        resource: url.searchParams.get("resource") || undefined,
        limit: Number(url.searchParams.get("limit")) || 100,
        offset: Number(url.searchParams.get("offset")) || 0,
    });
    return result;
});
app.get("/admin/audit/stats", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    return _lib_audit_logger__WEBPACK_IMPORTED_MODULE_14__/* .auditLogger */ ._.getStats();
});
app.get("/admin/audit/export", async ({ request }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer "))
        return jsonError(401, "Missing Bearer token");
    try {
        jsonwebtoken__WEBPACK_IMPORTED_MODULE_7___default().verify(auth.substring(7), CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "json";
    const content = _lib_audit_logger__WEBPACK_IMPORTED_MODULE_14__/* .auditLogger */ ._.export(format);
    if (!content) {
        return jsonError(400, "Invalid format");
    }
    return new Response(content, {
        headers: {
            "content-type": format === "json" ? "application/json" : "text/csv",
            "content-disposition": `attachment; filename="audit-logs.${format}"`,
        },
    });
});
if (false) // removed by dead control flow
{}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (app);

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } }, 1);

/***/ }),

/***/ 237:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  HY: () => (/* reexport */ checkRateLimitRedis),
  ln: () => (/* reexport */ revokeRefreshToken),
  OL: () => (/* reexport */ storeRefreshToken),
  tj: () => (/* reexport */ verifyStoredRefreshToken)
});

// UNUSED EXPORTS: extractBearerToken, generateAccessToken, generateRefreshToken, isRedisAvailable, verifyAccessToken, verifyRefreshToken

// EXTERNAL MODULE: external "jsonwebtoken"
var external_jsonwebtoken_ = __webpack_require__(829);
;// ./.internal/secure/auth/jwt.ts

const CONFIG = {
    JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    ACCESS_TOKEN_EXPIRY: "15m",
    REFRESH_TOKEN_EXPIRY: "7d",
};
function generateAccessToken(userId) {
    const payload = {
        iss: "elysia-ai",
        userId,
        iat: Math.floor(Date.now() / 1000),
    };
    const options = { expiresIn: CONFIG.ACCESS_TOKEN_EXPIRY };
    return jwt.sign(payload, CONFIG.JWT_SECRET, options);
}
function generateRefreshToken(userId) {
    const payload = {
        iss: "elysia-ai-refresh",
        userId,
        iat: Math.floor(Date.now() / 1000),
    };
    const options = { expiresIn: CONFIG.REFRESH_TOKEN_EXPIRY };
    return jwt.sign(payload, CONFIG.JWT_REFRESH_SECRET, options);
}
function verifyAccessToken(token) {
    try {
        return jwt.verify(token, CONFIG.JWT_SECRET);
    }
    catch {
        return null;
    }
}
function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, CONFIG.JWT_REFRESH_SECRET);
    }
    catch {
        return null;
    }
}
function extractBearerToken(authHeader) {
    if (!authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.substring(7);
}

// EXTERNAL MODULE: external "ioredis"
var external_ioredis_ = __webpack_require__(659);
var external_ioredis_default = /*#__PURE__*/__webpack_require__.n(external_ioredis_);
;// ./.internal/secure/auth/redis.ts

const redis_CONFIG = {
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    REDIS_ENABLED: process.env.REDIS_ENABLED !== "false",
};
let redis = null;
let redisAvailable = false;
if (redis_CONFIG.REDIS_ENABLED) {
    try {
        redis = new (external_ioredis_default())(redis_CONFIG.REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    redisAvailable = false;
                    return null;
                }
                return Math.min(times * 100, 2000);
            },
            lazyConnect: true,
        });
        redis.on("connect", () => {
            redisAvailable = true;
        });
        redis.on("error", () => {
            redisAvailable = false;
        });
        redis.connect().catch(() => {
            redisAvailable = false;
        });
    }
    catch {
        redis = null;
        redisAvailable = false;
    }
}
async function checkRateLimitRedis(id, maxRequests, windowSeconds = 60) {
    if (!redis || !redisAvailable) {
        return true;
    }
    try {
        const key = `ratelimit:${id}`;
        const nowMs = Date.now();
        const windowStart = nowMs - windowSeconds * 1000;
        await redis.zremrangebyscore(key, 0, windowStart);
        await redis.zadd(key, nowMs, `${nowMs}:${Math.random()}`);
        const count = await redis.zcard(key);
        await redis.expire(key, windowSeconds);
        return count <= maxRequests;
    }
    catch {
        return true;
    }
}
async function storeRefreshToken(userId, refreshToken, expiresIn = 7 * 24 * 60 * 60) {
    if (!redis || !redisAvailable) {
        return;
    }
    try {
        const key = `refresh:${userId}`;
        await redis.setex(key, expiresIn, refreshToken);
    }
    catch { }
}
async function verifyStoredRefreshToken(userId, refreshToken) {
    if (!redis || !redisAvailable) {
        return false;
    }
    try {
        const key = `refresh:${userId}`;
        const storedToken = await redis.get(key);
        return storedToken === refreshToken;
    }
    catch {
        return false;
    }
}
async function revokeRefreshToken(userId) {
    if (!redis || !redisAvailable) {
        return;
    }
    try {
        const key = `refresh:${userId}`;
        await redis.del(key);
    }
    catch { }
}
function isRedisAvailable() {
    return redisAvailable;
}
/* harmony default export */ const auth_redis = ((/* unused pure expression or super */ null && (redis)));

;// ./.internal/secure/auth/index.ts




/***/ }),

/***/ 257:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   X: () => (/* binding */ apiKeyManager)
/* harmony export */ });
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(598);
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_crypto__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(629);


class APIKeyManager {
    keys;
    KEY_PREFIX = "elysia_";
    constructor() {
        this.keys = new Map();
        this.loadKeysFromEnv();
    }
    loadKeysFromEnv() {
        const masterKey = process.env.MASTER_API_KEY;
        if (masterKey) {
            this.keys.set(masterKey, {
                key: masterKey,
                name: "Master Key",
                createdAt: new Date(),
                enabled: true,
                rateLimit: 10000,
                usage: {
                    totalRequests: 0,
                    requestsThisHour: 0,
                    hourStart: new Date(),
                },
            });
        }
    }
    generateKey(options) {
        const randomBytes = node_crypto__WEBPACK_IMPORTED_MODULE_0__.randomBytes(32);
        const key = `${this.KEY_PREFIX}${randomBytes.toString("base64url")}`;
        const expiresAt = options.expiresInDays
            ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
            : undefined;
        const apiKey = {
            key,
            name: options.name,
            userId: options.userId,
            createdAt: new Date(),
            expiresAt,
            enabled: true,
            rateLimit: options.rateLimit || 1000,
            usage: {
                totalRequests: 0,
                requestsThisHour: 0,
                hourStart: new Date(),
            },
        };
        this.keys.set(key, apiKey);
        _logger__WEBPACK_IMPORTED_MODULE_1__/* .logger */ .v.info("API key generated", {
            name: options.name,
            userId: options.userId,
            rateLimit: apiKey.rateLimit,
        });
        return apiKey;
    }
    validateKey(key) {
        const apiKey = this.keys.get(key);
        if (!apiKey) {
            return { valid: false, reason: "Invalid API key" };
        }
        if (!apiKey.enabled) {
            return { valid: false, reason: "API key is disabled" };
        }
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            return { valid: false, reason: "API key has expired" };
        }
        const now = new Date();
        const hoursSince = (now.getTime() - apiKey.usage.hourStart.getTime()) / (1000 * 60 * 60);
        if (hoursSince >= 1) {
            apiKey.usage.requestsThisHour = 0;
            apiKey.usage.hourStart = now;
        }
        if (apiKey.usage.requestsThisHour >= apiKey.rateLimit) {
            return {
                valid: false,
                reason: `Rate limit exceeded (${apiKey.rateLimit} requests/hour)`,
            };
        }
        return { valid: true, apiKey };
    }
    recordUsage(key) {
        const apiKey = this.keys.get(key);
        if (apiKey) {
            apiKey.usage.totalRequests++;
            apiKey.usage.requestsThisHour++;
            apiKey.usage.lastUsed = new Date();
        }
    }
    revokeKey(key) {
        const apiKey = this.keys.get(key);
        if (apiKey) {
            apiKey.enabled = false;
            _logger__WEBPACK_IMPORTED_MODULE_1__/* .logger */ .v.info("API key revoked", { name: apiKey.name });
            return true;
        }
        return false;
    }
    deleteKey(key) {
        const apiKey = this.keys.get(key);
        if (apiKey) {
            this.keys.delete(key);
            _logger__WEBPACK_IMPORTED_MODULE_1__/* .logger */ .v.info("API key deleted", { name: apiKey.name });
            return true;
        }
        return false;
    }
    listKeys() {
        return Array.from(this.keys.values()).map((key) => ({
            name: key.name,
            userId: key.userId,
            createdAt: key.createdAt,
            expiresAt: key.expiresAt,
            enabled: key.enabled,
            rateLimit: key.rateLimit,
            usage: {
                totalRequests: key.usage.totalRequests,
                lastUsed: key.usage.lastUsed,
                requestsThisHour: key.usage.requestsThisHour,
            },
            keyPreview: `${key.key.substring(0, 16)}...`,
        }));
    }
    getUserKeys(userId) {
        return Array.from(this.keys.values())
            .filter((key) => key.userId === userId)
            .map((key) => ({
            name: key.name,
            createdAt: key.createdAt,
            expiresAt: key.expiresAt,
            enabled: key.enabled,
            rateLimit: key.rateLimit,
            usage: key.usage,
            keyPreview: `${key.key.substring(0, 16)}...`,
        }));
    }
    getUsageStats() {
        const keys = Array.from(this.keys.values());
        return {
            totalKeys: keys.length,
            activeKeys: keys.filter((k) => k.enabled).length,
            expiredKeys: keys.filter((k) => k.expiresAt && k.expiresAt < new Date())
                .length,
            totalRequests: keys.reduce((sum, k) => sum + k.usage.totalRequests, 0),
            topKeys: keys
                .sort((a, b) => b.usage.totalRequests - a.usage.totalRequests)
                .slice(0, 5)
                .map((k) => ({
                name: k.name,
                requests: k.usage.totalRequests,
            })),
        };
    }
}
const apiKeyManager = new APIKeyManager();


/***/ }),

/***/ 330:
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ 371:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   _: () => (/* binding */ auditLogger)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(629);



class AuditLoggerService {
    LOG_DIR;
    LOG_FILE;
    logs;
    logCounter;
    constructor() {
        this.LOG_DIR = process.env.AUDIT_LOG_DIR || "./logs/audit";
        this.LOG_FILE = node_path__WEBPACK_IMPORTED_MODULE_1__.join(this.LOG_DIR, "audit.jsonl");
        this.logs = [];
        this.logCounter = 0;
        if (!node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync(this.LOG_DIR)) {
            node_fs__WEBPACK_IMPORTED_MODULE_0__.mkdirSync(this.LOG_DIR, { recursive: true });
        }
        this.loadLogs();
    }
    loadLogs() {
        if (!node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync(this.LOG_FILE))
            return;
        try {
            const content = node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync(this.LOG_FILE, "utf-8");
            const lines = content.split("\n").filter((line) => line.trim());
            for (const line of lines) {
                try {
                    const log = JSON.parse(line);
                    log.timestamp = new Date(log.timestamp);
                    this.logs.push(log);
                }
                catch {
                }
            }
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Audit logs loaded", { count: this.logs.length });
        }
        catch (error) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.error("Failed to load audit logs", error);
        }
    }
    log(entry) {
        const log = {
            id: `audit-${Date.now()}-${++this.logCounter}`,
            timestamp: new Date(),
            ...entry,
        };
        this.logs.push(log);
        try {
            node_fs__WEBPACK_IMPORTED_MODULE_0__.appendFileSync(this.LOG_FILE, `${JSON.stringify(log)}\n`);
        }
        catch (error) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.error("Failed to write audit log", error);
        }
        _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.debug("Audit log recorded", {
            id: log.id,
            action: log.action,
            resource: log.resource,
        });
    }
    search(options = {}) {
        let filtered = [...this.logs];
        if (options.userId) {
            filtered = filtered.filter((log) => log.userId === options.userId);
        }
        if (options.action) {
            filtered = filtered.filter((log) => log.action === options.action);
        }
        if (options.resource) {
            filtered = filtered.filter((log) => log.resource === options.resource);
        }
        if (options.startDate) {
            const startDate = options.startDate;
            filtered = filtered.filter((log) => log.timestamp >= startDate);
        }
        if (options.endDate) {
            const endDate = options.endDate;
            filtered = filtered.filter((log) => log.timestamp <= endDate);
        }
        filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const total = filtered.length;
        const offset = options.offset || 0;
        const limit = options.limit || 100;
        const paginated = filtered.slice(offset, offset + limit);
        return {
            logs: paginated,
            total,
            offset,
            limit,
        };
    }
    getUserActivity(userId, limit = 20) {
        return this.search({ userId, limit }).logs;
    }
    getResourceHistory(resource, resourceId) {
        return this.logs
            .filter((log) => log.resource === resource && log.resourceId === resourceId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    getStats() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentLogs = this.logs.filter((log) => log.timestamp >= last24h);
        const weeklyLogs = this.logs.filter((log) => log.timestamp >= last7d);
        const actionCounts = {};
        const userCounts = {};
        for (const log of recentLogs) {
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
            if (log.userId) {
                userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
            }
        }
        return {
            totalLogs: this.logs.length,
            last24Hours: recentLogs.length,
            last7Days: weeklyLogs.length,
            topActions: Object.entries(actionCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([action, count]) => ({ action, count })),
            topUsers: Object.entries(userCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([userId, count]) => ({ userId, count })),
        };
    }
    cleanupOldLogs(maxAgeDays = 90) {
        const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        const originalCount = this.logs.length;
        this.logs = this.logs.filter((log) => log.timestamp >= cutoff);
        try {
            const content = this.logs.map((log) => JSON.stringify(log)).join("\n");
            node_fs__WEBPACK_IMPORTED_MODULE_0__.writeFileSync(this.LOG_FILE, `${content}\n`);
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Old audit logs cleaned up", {
                deleted: originalCount - this.logs.length,
                remaining: this.logs.length,
                maxAgeDays,
            });
            return originalCount - this.logs.length;
        }
        catch (error) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.error("Failed to cleanup audit logs", error);
            return 0;
        }
    }
    export(format, options = {}) {
        const { logs } = this.search(options);
        if (format === "json") {
            return JSON.stringify(logs, null, 2);
        }
        if (format === "csv") {
            const headers = [
                "ID",
                "Timestamp",
                "User ID",
                "Action",
                "Resource",
                "Resource ID",
                "Method",
                "Path",
                "IP Address",
                "Status Code",
            ];
            const rows = logs.map((log) => [
                log.id,
                log.timestamp.toISOString(),
                log.userId || "",
                log.action,
                log.resource,
                log.resourceId || "",
                log.method,
                log.path,
                log.ipAddress,
                log.statusCode.toString(),
            ]);
            return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
        }
        return null;
    }
}
const auditLogger = new AuditLoggerService();


/***/ }),

/***/ 522:
/***/ ((module) => {

module.exports = require("node:zlib");

/***/ }),

/***/ 583:
/***/ ((module) => {

module.exports = require("sanitize-html");

/***/ }),

/***/ 598:
/***/ ((module) => {

module.exports = require("node:crypto");

/***/ }),

/***/ 619:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   i: () => (/* binding */ sessionManager)
/* harmony export */ });
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(629);

class SessionManager {
    sessions;
    userSessions;
    SESSION_TIMEOUT = 24 * 60 * 60 * 1000;
    MAX_SESSIONS_PER_USER = 5;
    constructor() {
        this.sessions = new Map();
        this.userSessions = new Map();
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60 * 60 * 1000);
    }
    createSession(userId, userAgent, ip) {
        const existingSessions = this.userSessions.get(userId);
        if (existingSessions &&
            existingSessions.size >= this.MAX_SESSIONS_PER_USER) {
            const oldestSession = this.getOldestSession(userId);
            if (oldestSession) {
                this.terminateSession(oldestSession.sessionId);
            }
        }
        const sessionId = this.generateSessionId();
        const now = new Date();
        const session = {
            sessionId,
            userId,
            deviceInfo: {
                userAgent,
                ip,
                deviceType: this.detectDeviceType(userAgent),
            },
            createdAt: now,
            lastActivity: now,
            expiresAt: new Date(now.getTime() + this.SESSION_TIMEOUT),
            active: true,
            activityLog: [
                {
                    type: "login",
                    timestamp: now,
                },
            ],
        };
        this.sessions.set(sessionId, session);
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, new Set());
        }
        this.userSessions.get(userId)?.add(sessionId);
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.info("Session created", {
            sessionId,
            userId,
            deviceType: session.deviceInfo.deviceType,
        });
        return session;
    }
    generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
    detectDeviceType(userAgent) {
        const ua = userAgent.toLowerCase();
        if (/mobile|android|iphone/i.test(ua))
            return "mobile";
        if (/tablet|ipad/i.test(ua))
            return "tablet";
        if (/windows|macintosh|linux/i.test(ua))
            return "desktop";
        return "unknown";
    }
    validateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        if (!session.active)
            return null;
        if (session.expiresAt < new Date()) {
            this.terminateSession(sessionId);
            return null;
        }
        session.lastActivity = new Date();
        return session;
    }
    recordActivity(sessionId, type, details) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.activityLog.push({
            type,
            timestamp: new Date(),
            details,
        });
        session.lastActivity = new Date();
        if (session.activityLog.length > 100) {
            session.activityLog = session.activityLog.slice(-100);
        }
    }
    terminateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.active = false;
        this.recordActivity(sessionId, "logout");
        const userSessions = this.userSessions.get(session.userId);
        userSessions?.delete(sessionId);
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.info("Session terminated", { sessionId, userId: session.userId });
    }
    getUserSessions(userId) {
        const sessionIds = this.userSessions.get(userId);
        if (!sessionIds)
            return [];
        return Array.from(sessionIds)
            .map((id) => this.sessions.get(id))
            .filter((s) => s !== undefined)
            .map((session) => ({
            sessionId: session.sessionId,
            deviceType: session.deviceInfo.deviceType,
            ip: session.deviceInfo.ip,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            active: session.active,
            activityCount: session.activityLog.length,
        }));
    }
    getSessionDetails(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        return {
            sessionId: session.sessionId,
            userId: session.userId,
            deviceInfo: session.deviceInfo,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            expiresAt: session.expiresAt,
            active: session.active,
            activityLog: session.activityLog.slice(-20),
        };
    }
    getOldestSession(userId) {
        const sessionIds = this.userSessions.get(userId);
        if (!sessionIds)
            return undefined;
        let oldest;
        for (const id of sessionIds) {
            const session = this.sessions.get(id);
            if (!session)
                continue;
            if (!oldest || session.createdAt < oldest.createdAt) {
                oldest = session;
            }
        }
        return oldest;
    }
    cleanupExpiredSessions() {
        const now = new Date();
        let cleanedCount = 0;
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.expiresAt < now || !session.active) {
                this.sessions.delete(sessionId);
                this.userSessions.get(session.userId)?.delete(sessionId);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.info("Expired sessions cleaned up", { count: cleanedCount });
        }
    }
    getStats() {
        const allSessions = Array.from(this.sessions.values());
        const activeSessions = allSessions.filter((s) => s.active);
        return {
            totalSessions: allSessions.length,
            activeSessions: activeSessions.length,
            uniqueUsers: this.userSessions.size,
            deviceBreakdown: {
                mobile: activeSessions.filter((s) => s.deviceInfo.deviceType === "mobile").length,
                tablet: activeSessions.filter((s) => s.deviceInfo.deviceType === "tablet").length,
                desktop: activeSessions.filter((s) => s.deviceInfo.deviceType === "desktop").length,
            },
        };
    }
}
const sessionManager = new SessionManager();


/***/ }),

/***/ 629:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   v: () => (/* binding */ logger)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);


class Logger {
    logDir;
    logFile;
    minLevel;
    levelPriority = {
        trace: 0,
        debug: 1,
        info: 2,
        warn: 3,
        error: 4,
        fatal: 5,
    };
    constructor(logDir = "logs", minLevel = "info") {
        this.logDir = logDir;
        this.minLevel = minLevel;
        this.logFile = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(logDir, `app-${new Date().toISOString().split("T")[0]}.log`);
        if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(logDir)) {
            (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.mkdirSync)(logDir, { recursive: true });
        }
    }
    shouldLog(level) {
        return this.levelPriority[level] >= this.levelPriority[this.minLevel];
    }
    formatLog(entry) {
        return `${JSON.stringify(entry)}\n`;
    }
    writeLog(entry) {
        if (!this.shouldLog(entry.level))
            return;
        const colors = {
            trace: "\x1b[90m",
            debug: "\x1b[36m",
            info: "\x1b[32m",
            warn: "\x1b[33m",
            error: "\x1b[31m",
            fatal: "\x1b[35m",
        };
        const reset = "\x1b[0m";
        const color = colors[entry.level];
        console.log(`${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} ${entry.message}`, entry.context ? entry.context : "");
        try {
            (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.appendFileSync)(this.logFile, this.formatLog(entry));
        }
        catch (error) {
            console.error("Failed to write to log file:", error);
        }
    }
    trace(message, context) {
        this.writeLog({
            level: "trace",
            timestamp: new Date().toISOString(),
            message,
            context,
        });
    }
    debug(message, context) {
        this.writeLog({
            level: "debug",
            timestamp: new Date().toISOString(),
            message,
            context,
        });
    }
    info(message, context) {
        this.writeLog({
            level: "info",
            timestamp: new Date().toISOString(),
            message,
            context,
        });
    }
    warn(message, context) {
        this.writeLog({
            level: "warn",
            timestamp: new Date().toISOString(),
            message,
            context,
        });
    }
    error(message, err, context) {
        this.writeLog({
            level: "error",
            timestamp: new Date().toISOString(),
            message,
            context,
            error: err
                ? {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                }
                : undefined,
        });
    }
    fatal(message, err, context) {
        this.writeLog({
            level: "fatal",
            timestamp: new Date().toISOString(),
            message,
            context,
            error: err
                ? {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                }
                : undefined,
        });
    }
    logRequest(method, path, status, duration, ip, userId) {
        const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
        this.writeLog({
            level,
            timestamp: new Date().toISOString(),
            message: `${method} ${path} ${status}`,
            request: { method, path, ip, userId },
            duration,
        });
    }
    rotateLogs(retentionDays = 30) {
        const now = Date.now();
        const maxAge = retentionDays * 24 * 60 * 60 * 1000;
        if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)(this.logDir))
            return;
        const fs = __webpack_require__(24);
        const files = fs.readdirSync(this.logDir);
        for (const file of files) {
            const filePath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(this.logDir, file);
            const stat = fs.statSync(filePath);
            const age = now - stat.mtimeMs;
            if (age > maxAge) {
                fs.unlinkSync(filePath);
                this.info(`Rotated old log file: ${file}`);
            }
        }
    }
}
const logger = new Logger("logs", process.env.LOG_LEVEL || "info");


/***/ }),

/***/ 644:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   D: () => (/* binding */ metricsCollector)
/* harmony export */ });
class MetricsCollector {
    metrics = {
        http_requests_total: new Map(),
        http_request_duration_seconds: new Map(),
        http_errors_total: new Map(),
        active_connections: 0,
        chat_requests_total: 0,
        feedback_submissions_total: 0,
        auth_attempts_total: new Map(),
        rate_limit_exceeded_total: 0,
        rag_queries_total: 0,
        rag_query_duration_seconds: [],
    };
    incrementRequest(method, path, status) {
        const key = `${method}:${path}:${status}`;
        const current = this.metrics.http_requests_total.get(key) || 0;
        this.metrics.http_requests_total.set(key, current + 1);
    }
    recordRequestDuration(method, path, duration) {
        const key = `${method}:${path}`;
        const durations = this.metrics.http_request_duration_seconds.get(key) || [];
        durations.push(duration);
        if (durations.length > 1000)
            durations.shift();
        this.metrics.http_request_duration_seconds.set(key, durations);
    }
    incrementError(method, path, errorType) {
        const key = `${method}:${path}:${errorType}`;
        const current = this.metrics.http_errors_total.get(key) || 0;
        this.metrics.http_errors_total.set(key, current + 1);
    }
    incrementConnections() {
        this.metrics.active_connections++;
    }
    decrementConnections() {
        this.metrics.active_connections = Math.max(0, this.metrics.active_connections - 1);
    }
    incrementChatRequests() {
        this.metrics.chat_requests_total++;
    }
    incrementFeedback() {
        this.metrics.feedback_submissions_total++;
    }
    incrementAuthAttempt(success) {
        const key = success ? "success" : "failure";
        const current = this.metrics.auth_attempts_total.get(key) || 0;
        this.metrics.auth_attempts_total.set(key, current + 1);
    }
    incrementRateLimit() {
        this.metrics.rate_limit_exceeded_total++;
    }
    incrementRAGQuery() {
        this.metrics.rag_queries_total++;
    }
    recordRAGDuration(duration) {
        this.metrics.rag_query_duration_seconds.push(duration);
        if (this.metrics.rag_query_duration_seconds.length > 1000) {
            this.metrics.rag_query_duration_seconds.shift();
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    toPrometheusFormat() {
        const lines = [];
        lines.push("# HELP http_requests_total Total HTTP requests");
        lines.push("# TYPE http_requests_total counter");
        for (const [key, value] of this.metrics.http_requests_total) {
            const [method, path, status] = key.split(":");
            lines.push(`http_requests_total{method="${method}",path="${path}",status="${status}"} ${value}`);
        }
        lines.push("# HELP http_request_duration_seconds HTTP request duration in seconds");
        lines.push("# TYPE http_request_duration_seconds histogram");
        for (const [key, durations] of this.metrics.http_request_duration_seconds) {
            const [method, path] = key.split(":");
            const sorted = [...durations].sort((a, b) => a - b);
            const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
            const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
            const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
            const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
            lines.push(`http_request_duration_seconds_avg{method="${method}",path="${path}"} ${avg.toFixed(4)}`);
            lines.push(`http_request_duration_seconds{method="${method}",path="${path}",quantile="0.5"} ${p50.toFixed(4)}`);
            lines.push(`http_request_duration_seconds{method="${method}",path="${path}",quantile="0.95"} ${p95.toFixed(4)}`);
            lines.push(`http_request_duration_seconds{method="${method}",path="${path}",quantile="0.99"} ${p99.toFixed(4)}`);
        }
        lines.push("# HELP http_errors_total Total HTTP errors");
        lines.push("# TYPE http_errors_total counter");
        for (const [key, value] of this.metrics.http_errors_total) {
            const [method, path, errorType] = key.split(":");
            lines.push(`http_errors_total{method="${method}",path="${path}",type="${errorType}"} ${value}`);
        }
        lines.push("# HELP active_connections Current active connections");
        lines.push("# TYPE active_connections gauge");
        lines.push(`active_connections ${this.metrics.active_connections}`);
        lines.push("# HELP chat_requests_total Total chat requests");
        lines.push("# TYPE chat_requests_total counter");
        lines.push(`chat_requests_total ${this.metrics.chat_requests_total}`);
        lines.push("# HELP feedback_submissions_total Total feedback submissions");
        lines.push("# TYPE feedback_submissions_total counter");
        lines.push(`feedback_submissions_total ${this.metrics.feedback_submissions_total}`);
        lines.push("# HELP auth_attempts_total Total authentication attempts");
        lines.push("# TYPE auth_attempts_total counter");
        for (const [result, value] of this.metrics.auth_attempts_total) {
            lines.push(`auth_attempts_total{result="${result}"} ${value}`);
        }
        lines.push("# HELP rate_limit_exceeded_total Total rate limit exceeded");
        lines.push("# TYPE rate_limit_exceeded_total counter");
        lines.push(`rate_limit_exceeded_total ${this.metrics.rate_limit_exceeded_total}`);
        lines.push("# HELP rag_queries_total Total RAG queries");
        lines.push("# TYPE rag_queries_total counter");
        lines.push(`rag_queries_total ${this.metrics.rag_queries_total}`);
        if (this.metrics.rag_query_duration_seconds.length > 0) {
            lines.push("# HELP rag_query_duration_seconds RAG query duration");
            lines.push("# TYPE rag_query_duration_seconds histogram");
            const sorted = [...this.metrics.rag_query_duration_seconds].sort((a, b) => a - b);
            const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
            const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
            const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
            const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
            lines.push(`rag_query_duration_seconds_avg ${avg.toFixed(4)}`);
            lines.push(`rag_query_duration_seconds{quantile="0.5"} ${p50.toFixed(4)}`);
            lines.push(`rag_query_duration_seconds{quantile="0.95"} ${p95.toFixed(4)}`);
            lines.push(`rag_query_duration_seconds{quantile="0.99"} ${p99.toFixed(4)}`);
        }
        const memUsage = process.memoryUsage();
        lines.push("# HELP process_memory_bytes Process memory usage");
        lines.push("# TYPE process_memory_bytes gauge");
        lines.push(`process_memory_bytes{type="heap_used"} ${memUsage.heapUsed}`);
        lines.push(`process_memory_bytes{type="heap_total"} ${memUsage.heapTotal}`);
        lines.push(`process_memory_bytes{type="rss"} ${memUsage.rss}`);
        lines.push("# HELP process_uptime_seconds Process uptime in seconds");
        lines.push("# TYPE process_uptime_seconds gauge");
        lines.push(`process_uptime_seconds ${process.uptime()}`);
        return `${lines.join("\n")}\n`;
    }
}
const metricsCollector = new MetricsCollector();


/***/ }),

/***/ 654:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  f: () => (/* binding */ jobQueue)
});

;// external "bullmq"
const external_bullmq_namespaceObject = require("bullmq");
// EXTERNAL MODULE: ./src/lib/email-notifier.ts + 1 modules
var email_notifier = __webpack_require__(172);
// EXTERNAL MODULE: ./src/lib/logger.ts
var logger = __webpack_require__(629);
// EXTERNAL MODULE: ./src/lib/webhook-events.ts
var webhook_events = __webpack_require__(132);
;// ./src/lib/job-queue.ts




class JobQueueManager {
    queue = null;
    worker = null;
    REDIS_URL;
    constructor() {
        this.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
    }
    async initialize() {
        try {
            const connection = {
                host: new URL(this.REDIS_URL).hostname,
                port: Number(new URL(this.REDIS_URL).port) || 6379,
            };
            this.queue = new external_bullmq_namespaceObject.Queue("elysia-jobs", { connection });
            this.worker = new external_bullmq_namespaceObject.Worker("elysia-jobs", async (job) => {
                return await this.processJob(job);
            }, { connection });
            this.worker.on("completed", (job) => {
                logger/* logger */.v.info("Job completed", { jobId: job.id, type: job.data.type });
            });
            this.worker.on("failed", (job, err) => {
                logger/* logger */.v.error("Job failed", err);
            });
            logger/* logger */.v.info("Job queue initialized", { connection: this.REDIS_URL });
        }
        catch (error) {
            logger/* logger */.v.warn("Job queue unavailable, using in-memory fallback", {
                error: error.message,
            });
        }
    }
    async processJob(job) {
        const { type, payload } = job.data;
        switch (type) {
            case "send-email":
                return await this.handleEmailJob(payload);
            case "generate-report":
                return await this.handleReportJob(payload);
            case "cleanup-old-data":
                return await this.handleCleanupJob();
            case "send-webhook":
                return await this.handleWebhookJob(payload);
            default:
                throw new Error(`Unknown job type: ${type}`);
        }
    }
    async handleEmailJob(data) {
        await email_notifier/* emailNotifier */.x.send({
            to: data.to,
            subject: data.subject,
            html: data.html,
        });
        return { success: true, sentAt: new Date() };
    }
    async handleReportJob(data) {
        logger/* logger */.v.info("Generating report", { type: data.reportType });
        const { feedbackService, knowledgeService } = await Promise.resolve(/* import() */).then(__webpack_require__.bind(__webpack_require__, 828));
        const feedbacks = await feedbackService.getRecent(100);
        const knowledge = await knowledgeService.getAll();
        const report = {
            type: data.reportType,
            period: { start: data.startDate, end: data.endDate },
            statistics: {
                totalFeedbacks: feedbacks.length,
                positiveFeedbacks: feedbacks.filter((f) => f.rating === "up").length,
                negativeFeedbacks: feedbacks.filter((f) => f.rating === "down").length,
                totalKnowledge: knowledge.length,
                verifiedKnowledge: knowledge.filter((k) => k.verified).length,
            },
            generatedAt: new Date(),
        };
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
            await email_notifier/* emailNotifier */.x.send({
                to: adminEmail,
                subject: `[エリシアAI] ${data.reportType}レポート`,
                html: `
					<h2>📊 ${data.reportType}レポート</h2>
					<ul>
						<li>総フィードバック: ${report.statistics.totalFeedbacks}</li>
						<li>ポジティブ: ${report.statistics.positiveFeedbacks}</li>
						<li>ネガティブ: ${report.statistics.negativeFeedbacks}</li>
						<li>総ナレッジ: ${report.statistics.totalKnowledge}</li>
						<li>検証済み: ${report.statistics.verifiedKnowledge}</li>
					</ul>
					<p><small>生成日時: ${report.generatedAt.toLocaleString("ja-JP")}</small></p>
				`,
            });
        }
        return report;
    }
    async handleCleanupJob() {
        logger/* logger */.v.info("Running data cleanup job");
        const { logCleanupManager } = await Promise.resolve(/* import() */).then(__webpack_require__.bind(__webpack_require__, 922));
        await logCleanupManager.triggerManualCleanup();
        return { success: true, cleanedAt: new Date() };
    }
    async handleWebhookJob(payload) {
        const { event, data } = payload;
        await webhook_events/* webhookManager */.$.emit(event, data);
        return { success: true, sentAt: new Date() };
    }
    async addJob(type, payload, options = {}) {
        if (!this.queue) {
            logger/* logger */.v.warn("Queue not available, executing job immediately");
            return await this.processJob({
                data: { type, payload },
            });
        }
        const job = await this.queue.add(type, { type, payload }, options);
        logger/* logger */.v.debug("Job added to queue", { jobId: job.id, type });
        return job;
    }
    async sendEmail(to, subject, html) {
        return await this.addJob("send-email", { to, subject, html });
    }
    async generateReport(reportType, startDate, endDate) {
        return await this.addJob("generate-report", {
            reportType,
            startDate,
            endDate,
        });
    }
    async scheduleCleanup() {
        return await this.addJob("cleanup-old-data", {});
    }
    async getStats() {
        if (!this.queue) {
            return { available: false };
        }
        const [waiting, active, completed, failed] = await Promise.all([
            this.queue.getWaitingCount(),
            this.queue.getActiveCount(),
            this.queue.getCompletedCount(),
            this.queue.getFailedCount(),
        ]);
        return {
            available: true,
            waiting,
            active,
            completed,
            failed,
        };
    }
    async close() {
        if (this.worker) {
            await this.worker.close();
        }
        if (this.queue) {
            await this.queue.close();
        }
        logger/* logger */.v.info("Job queue closed");
    }
}
const jobQueue = new JobQueueManager();


/***/ }),

/***/ 659:
/***/ ((module) => {

module.exports = require("ioredis");

/***/ }),

/***/ 695:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   W: () => (/* binding */ createAuditMiddleware)
/* harmony export */ });
/* harmony import */ var _audit_logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(371);

const auditDataMap = new WeakMap();
function createAuditMiddleware(options = {}) {
    const { excludePaths = ["/health", "/metrics", "/swagger"], excludeMethods = ["OPTIONS"], includeBody = false, } = options;
    return {
        beforeHandle: async (context) => {
            const { request } = context;
            const url = new URL(request.url);
            if (excludePaths.some((path) => url.pathname.startsWith(path))) {
                return;
            }
            if (excludeMethods.includes(request.method)) {
                return;
            }
            auditDataMap.set(request, {
                startTime: Date.now(),
                url: url.pathname,
                method: request.method,
            });
        },
        afterHandle: async (context, response) => {
            const { request, set } = context;
            const auditData = auditDataMap.get(request);
            if (!auditData) {
                return;
            }
            const url = new URL(request.url);
            const statusCode = set.status || 200;
            const auth = request.headers.get("authorization") || "";
            let userId;
            if (auth.startsWith("Bearer ")) {
                try {
                    const jwt = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 829, 23));
                    const decoded = jwt.verify(auth.substring(7), process.env.JWT_SECRET || "dev-secret");
                    userId = decoded.username;
                }
                catch {
                }
            }
            const action = determineAction(request.method, url.pathname);
            const resource = determineResource(url.pathname);
            const resourceId = extractResourceId(url.pathname);
            _audit_logger__WEBPACK_IMPORTED_MODULE_0__/* .auditLogger */ ._.log({
                userId,
                action,
                resource,
                resourceId,
                method: request.method,
                path: url.pathname,
                ipAddress: request.headers.get("x-forwarded-for") ||
                    request.headers.get("x-real-ip") ||
                    "127.0.0.1",
                userAgent: request.headers.get("user-agent") || "unknown",
                statusCode,
            });
            auditDataMap.delete(request);
        },
        onError: async (context, error) => {
            const { request } = context;
            const auditData = auditDataMap.get(request);
            if (!auditData) {
                return;
            }
            const url = new URL(request.url);
            _audit_logger__WEBPACK_IMPORTED_MODULE_0__/* .auditLogger */ ._.log({
                action: "ERROR",
                resource: determineResource(url.pathname),
                method: request.method,
                path: url.pathname,
                ipAddress: request.headers.get("x-forwarded-for") ||
                    request.headers.get("x-real-ip") ||
                    "127.0.0.1",
                userAgent: request.headers.get("user-agent") || "unknown",
                statusCode: 500,
                error: error.message,
            });
        },
    };
}
function determineAction(method, path) {
    if (path.includes("/login") || path.includes("/auth"))
        return "AUTH";
    if (path.includes("/register"))
        return "REGISTER";
    if (path.includes("/logout"))
        return "LOGOUT";
    switch (method) {
        case "GET":
            return "READ";
        case "POST":
            return "CREATE";
        case "PUT":
        case "PATCH":
            return "UPDATE";
        case "DELETE":
            return "DELETE";
        default:
            return method;
    }
}
function determineResource(path) {
    if (path.includes("/feedback"))
        return "feedback";
    if (path.includes("/knowledge"))
        return "knowledge";
    if (path.includes("/user"))
        return "user";
    if (path.includes("/chat"))
        return "chat";
    if (path.includes("/upload") || path.includes("/files"))
        return "file";
    if (path.includes("/jobs"))
        return "job";
    if (path.includes("/cron"))
        return "cron";
    if (path.includes("/audit"))
        return "audit";
    if (path.includes("/admin"))
        return "admin";
    if (path.includes("/session"))
        return "session";
    if (path.includes("/api-key"))
        return "api-key";
    return "unknown";
}
function extractResourceId(path) {
    const matches = path.match(/\/([^/]+)\/([a-zA-Z0-9-]+)$/);
    if (matches?.[2]) {
        return matches[2];
    }
    return undefined;
}


/***/ }),

/***/ 696:
/***/ ((module) => {

module.exports = require("@elysiajs/html");

/***/ }),

/***/ 703:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   uY: () => (/* binding */ performHealthCheck)
/* harmony export */ });
/* unused harmony exports checkRedis, checkFastAPI, checkOllama, getSystemMetrics */
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(938);
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var ioredis__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(659);
/* harmony import */ var ioredis__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(ioredis__WEBPACK_IMPORTED_MODULE_1__);


async function checkRedis(redisUrl) {
    const startTime = Date.now();
    try {
        const redis = new (ioredis__WEBPACK_IMPORTED_MODULE_1___default())(redisUrl, {
            connectTimeout: 5000,
            maxRetriesPerRequest: 1,
        });
        await redis.ping();
        const responseTime = Date.now() - startTime;
        const info = await redis.info("server");
        const version = info.match(/redis_version:(.+)/)?.[1]?.trim();
        redis.disconnect();
        return {
            status: responseTime < 100 ? "up" : "degraded",
            responseTime,
            lastCheck: new Date().toISOString(),
        };
    }
    catch (error) {
        return {
            status: "down",
            error: error instanceof Error ? error.message : "Unknown error",
            lastCheck: new Date().toISOString(),
        };
    }
}
async function checkFastAPI(fastAPIUrl) {
    const startTime = Date.now();
    try {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${fastAPIUrl}/health`, {
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
    }
    catch (error) {
        return {
            status: "down",
            error: error instanceof Error ? error.message : "Connection failed",
            lastCheck: new Date().toISOString(),
        };
    }
}
async function checkOllama(ollamaUrl) {
    const startTime = Date.now();
    try {
        const response = await axios__WEBPACK_IMPORTED_MODULE_0___default().get(`${ollamaUrl}/api/version`, {
            timeout: 5000,
        });
        const responseTime = Date.now() - startTime;
        if (response.status === 200) {
            return {
                status: responseTime < 500 ? "up" : "degraded",
                responseTime,
                lastCheck: new Date().toISOString(),
            };
        }
        return {
            status: "degraded",
            responseTime,
            lastCheck: new Date().toISOString(),
        };
    }
    catch (error) {
        return {
            status: "down",
            error: error instanceof Error ? error.message : "Connection failed",
            lastCheck: new Date().toISOString(),
        };
    }
}
function getSystemMetrics() {
    const memory = process.memoryUsage();
    const totalMemory = memory.heapTotal;
    const usedMemory = memory.heapUsed;
    return {
        memory: {
            used: Math.round(usedMemory / 1024 / 1024),
            total: Math.round(totalMemory / 1024 / 1024),
            percentage: Math.round((usedMemory / totalMemory) * 100),
        },
        cpu: {
            usage: process.cpuUsage().user / 1000000,
        },
    };
}
async function performHealthCheck(redisUrl, fastAPIUrl, ollamaUrl) {
    const [redis, fastapi, ollama] = await Promise.all([
        checkRedis(redisUrl),
        checkFastAPI(fastAPIUrl),
        checkOllama(ollamaUrl),
    ]);
    const system = getSystemMetrics();
    const allUp = [redis, fastapi, ollama].every((s) => s.status === "up");
    const anyDown = [redis, fastapi, ollama].some((s) => s.status === "down");
    const status = allUp ? "healthy" : anyDown ? "unhealthy" : "degraded";
    return {
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: { redis, fastapi, ollama },
        system,
    };
}


/***/ }),

/***/ 709:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   x: () => (/* binding */ checkEnvironmentOrExit)
/* harmony export */ });
/* unused harmony exports validateEnvironment, printEnvironmentSummary */
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(629);

const ENV_SCHEMA = [
    {
        name: "JWT_SECRET",
        required: true,
        description: "JWT署名用シークレットキー (32文字以上推奨)",
        validator: (v) => v.length >= 32,
    },
    {
        name: "JWT_REFRESH_SECRET",
        required: true,
        description: "リフレッシュトークン用シークレットキー (32文字以上推奨)",
        validator: (v) => v.length >= 32,
    },
    {
        name: "AUTH_PASSWORD",
        required: true,
        description: "デフォルトユーザー(elysia)のパスワード",
        validator: (v) => v !== "your-strong-password-here" && v.length >= 8,
    },
    {
        name: "PORT",
        required: false,
        default: "3000",
        description: "サーバーポート番号",
        validator: (v) => !Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) < 65536,
    },
    {
        name: "ALLOWED_ORIGINS",
        required: false,
        default: "http://localhost:3000",
        description: "CORS許可オリジン (カンマ区切り)",
    },
    {
        name: "DATABASE_URL",
        required: true,
        description: "Prisma データベース接続URL",
    },
    {
        name: "OLLAMA_BASE_URL",
        required: false,
        default: "http://localhost:11434",
        description: "Ollama API URL",
    },
    {
        name: "OLLAMA_MODEL",
        required: false,
        default: "llama3.2",
        description: "使用するLLMモデル名",
    },
    {
        name: "REDIS_ENABLED",
        required: false,
        default: "false",
        description: "Redisレート制限を有効化",
    },
    {
        name: "FASTAPI_BASE_URL",
        required: false,
        default: "http://localhost:8000",
        description: "FastAPI RAGサービスURL",
    },
    {
        name: "VOICEVOX_BASE_URL",
        required: false,
        default: "http://localhost:50021",
        description: "VOICEVOX エンジンURL",
    },
];
function validateEnvironment() {
    const errors = [];
    const warnings = [];
    const missing = [];
    const invalid = [];
    for (const config of ENV_SCHEMA) {
        const value = process.env[config.name];
        if (config.required && !value) {
            missing.push(config.name);
            errors.push(`❌ [必須] ${config.name}: ${config.description}${config.default ? ` (デフォルト: ${config.default})` : ""}`);
            continue;
        }
        if (!value && config.default) {
            process.env[config.name] = config.default;
            warnings.push(`⚠️  ${config.name}: デフォルト値を使用 (${config.default})`);
            continue;
        }
        if (value && config.validator && !config.validator(value)) {
            invalid.push(config.name);
            errors.push(`❌ [無効] ${config.name}: ${config.description} (現在の値: ${value.substring(0, 20)}...)`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        missing,
        invalid,
    };
}
function checkEnvironmentOrExit() {
    _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.info("🔍 環境変数を検証中...");
    const result = validateEnvironment();
    if (result.warnings.length > 0) {
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.warn("⚠️  環境変数の警告:");
        for (const warning of result.warnings) {
            _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.warn(`  ${warning}`);
        }
    }
    if (!result.valid) {
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.error("❌ 環境変数の検証に失敗しました:");
        for (const error of result.errors) {
            _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.error(`  ${error}`);
        }
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.error("\n💡 修正方法:");
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.error("  1. .env ファイルを開く");
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.error("  2. 上記の必須項目を設定");
        _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.error("  3. サーバーを再起動\n");
        process.exit(1);
    }
    _logger__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .v.info("✅ 環境変数の検証完了");
}
function printEnvironmentSummary() {
    logger.info("\n📋 環境変数サマリー:");
    logger.info(`  - ポート: ${process.env.PORT || 3000}`);
    logger.info(`  - データベース: ${process.env.DATABASE_URL || "未設定"}`);
    logger.info(`  - Redis: ${process.env.REDIS_ENABLED === "true" ? "有効" : "無効"}`);
    logger.info(`  - Ollama: ${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}`);
    logger.info(`  - モデル: ${process.env.OLLAMA_MODEL || "llama3.2"}\n`);
}


/***/ }),

/***/ 729:
/***/ ((module) => {

module.exports = require("bcryptjs");

/***/ }),

/***/ 732:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   healthMonitor: () => (/* binding */ healthMonitor)
/* harmony export */ });
/* harmony import */ var _email_notifier__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(172);
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(629);
/* harmony import */ var _webhook_events__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(132);



class HealthMonitor {
    checks;
    statuses;
    intervals;
    enabled;
    constructor() {
        this.checks = new Map();
        this.statuses = new Map();
        this.intervals = new Map();
        this.enabled = process.env.HEALTH_MONITORING_ENABLED !== "false";
        this.initializeDefaultChecks();
    }
    initializeDefaultChecks() {
        this.addCheck({
            name: "database",
            check: async () => {
                try {
                    const { PrismaClient } = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 330, 23));
                    const prisma = new PrismaClient();
                    await prisma.$queryRaw `SELECT 1`;
                    await prisma.$disconnect();
                    return true;
                }
                catch {
                    return false;
                }
            },
            interval: 60000,
            timeout: 5000,
            failureThreshold: 3,
        });
        this.addCheck({
            name: "ollama",
            check: async () => {
                try {
                    const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
                    const response = await fetch(`${ollamaUrl}/api/version`, {
                        signal: AbortSignal.timeout(5000),
                    });
                    return response.ok;
                }
                catch {
                    return false;
                }
            },
            interval: 120000,
            timeout: 5000,
            failureThreshold: 3,
        });
        if (process.env.REDIS_ENABLED === "true") {
            this.addCheck({
                name: "redis",
                check: async () => {
                    try {
                        const Redis = (await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 659, 23))).default;
                        const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
                        await redis.ping();
                        redis.disconnect();
                        return true;
                    }
                    catch {
                        return false;
                    }
                },
                interval: 60000,
                timeout: 5000,
                failureThreshold: 3,
            });
        }
        this.addCheck({
            name: "disk_space",
            check: async () => {
                try {
                    const fs = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 24, 23));
                    const path = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 760, 23));
                    const stats = fs.statfsSync(path.resolve("./"));
                    const freeSpaceGB = (stats.bavail * stats.bsize) / 1024 ** 3;
                    return freeSpaceGB > 1;
                }
                catch {
                    return false;
                }
            },
            interval: 300000,
            timeout: 5000,
            failureThreshold: 2,
        });
    }
    addCheck(check) {
        this.checks.set(check.name, check);
        this.statuses.set(check.name, {
            name: check.name,
            status: "unknown",
            lastCheck: new Date(),
            consecutiveFailures: 0,
        });
        _logger__WEBPACK_IMPORTED_MODULE_1__/* .logger */ .v.info(`Health check added: ${check.name}`, {
            interval: `${check.interval}ms`,
        });
    }
    start() {
        if (!this.enabled) {
            _logger__WEBPACK_IMPORTED_MODULE_1__/* .logger */ .v.info("Health monitoring is disabled");
            return;
        }
        for (const [name, check] of this.checks.entries()) {
            this.performCheck(name, check);
            const intervalId = setInterval(() => {
                this.performCheck(name, check);
            }, check.interval);
            this.intervals.set(name, intervalId);
        }
        _logger__WEBPACK_IMPORTED_MODULE_1__/* .logger */ .v.info("Health monitoring started", {
            checks: this.checks.size,
        });
    }
    stop() {
        for (const intervalId of this.intervals.values()) {
            clearInterval(intervalId);
        }
        this.intervals.clear();
        _logger__WEBPACK_IMPORTED_MODULE_1__/* .logger */ .v.info("Health monitoring stopped");
    }
    async performCheck(name, check) {
        const status = this.statuses.get(name);
        if (!status)
            return;
        try {
            const result = await Promise.race([
                check.check(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), check.timeout)),
            ]);
            status.lastCheck = new Date();
            if (result) {
                if (status.status === "unhealthy") {
                    _logger__WEBPACK_IMPORTED_MODULE_1__/* .logger */ .v.info(`Health check recovered: ${name}`);
                    await this.notifyRecovery(name);
                }
                status.status = "healthy";
                status.consecutiveFailures = 0;
                status.lastError = undefined;
            }
            else {
                this.handleCheckFailure(status, check, "Check returned false");
            }
        }
        catch (error) {
            this.handleCheckFailure(status, check, error instanceof Error ? error.message : "Unknown error");
        }
    }
    async handleCheckFailure(status, check, errorMessage) {
        status.consecutiveFailures++;
        status.lastError = errorMessage;
        _logger__WEBPACK_IMPORTED_MODULE_1__/* .logger */ .v.warn(`Health check failed: ${status.name}`, {
            failures: status.consecutiveFailures,
            error: errorMessage,
        });
        if (status.consecutiveFailures >= check.failureThreshold) {
            status.status = "unhealthy";
            await this.notifyFailure(status.name, errorMessage);
        }
    }
    async notifyFailure(name, error) {
        _logger__WEBPACK_IMPORTED_MODULE_1__/* .logger */ .v.error(`Health check CRITICAL: ${name}`, new Error(error));
        await _webhook_events__WEBPACK_IMPORTED_MODULE_2__/* .webhookManager */ .$.emit("system.health_check_failed", {
            service: name,
            error,
        });
        await _email_notifier__WEBPACK_IMPORTED_MODULE_0__/* .emailNotifier */ .x.sendHealthCheckFailure(name, error);
    }
    async notifyRecovery(name) {
        await _webhook_events__WEBPACK_IMPORTED_MODULE_2__/* .webhookManager */ .$.emit("system.health_check_failed", {
            service: name,
            recovered: true,
        });
    }
    getStatus() {
        const statuses = Array.from(this.statuses.values());
        return {
            overall: statuses.every((s) => s.status === "healthy")
                ? "healthy"
                : statuses.some((s) => s.status === "unhealthy")
                    ? "unhealthy"
                    : "degraded",
            checks: statuses.map((s) => ({
                name: s.name,
                status: s.status,
                lastCheck: s.lastCheck,
                consecutiveFailures: s.consecutiveFailures,
                lastError: s.lastError,
            })),
        };
    }
    async runCheck(name) {
        const check = this.checks.get(name);
        if (!check)
            return false;
        await this.performCheck(name, check);
        const status = this.statuses.get(name);
        return status?.status === "healthy" || false;
    }
}
const healthMonitor = new HealthMonitor();


/***/ }),

/***/ 760:
/***/ ((module) => {

module.exports = require("node:path");

/***/ }),

/***/ 807:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   r: () => (/* binding */ DATABASE_CONFIG)
/* harmony export */ });
const DATABASE_CONFIG = {
    RAG_API_URL: process.env.RAG_API_URL || "http://127.0.0.1:8000/rag",
    RAG_TIMEOUT: Number(process.env.RAG_TIMEOUT) || 5000,
    MILVUS_HOST: process.env.MILVUS_HOST || "localhost",
    MILVUS_PORT: Number(process.env.MILVUS_PORT) || 19530,
    MILVUS_COLLECTION: process.env.MILVUS_COLLECTION || "elysia_knowledge",
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    REDIS_ENABLED: process.env.REDIS_ENABLED !== "false",
};
/* unused harmony default export */ var __WEBPACK_DEFAULT_EXPORT__ = ((/* unused pure expression or super */ null && (DATABASE_CONFIG)));


/***/ }),

/***/ 811:
/***/ ((module) => {

module.exports = require("@elysiajs/swagger");

/***/ }),

/***/ 828:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Dv: () => (/* binding */ userService),
/* harmony export */   feedbackService: () => (/* binding */ feedbackService),
/* harmony export */   knowledgeService: () => (/* binding */ knowledgeService)
/* harmony export */ });
/* unused harmony exports prisma, tokenService, chatService, voiceService */
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(330);
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);

let prisma;
try {
    const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
    prisma = new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient({
        log:  true
            ? ["query", "error", "warn"]
            : 0,
        datasourceUrl: dbUrl,
    });
    console.log("✅ Prisma database connected");
}
catch (error) {
    console.warn("⚠️ Prisma database not configured, using in-memory fallback");
    prisma = null;
}
process.on("beforeExit", async () => {
    if (prisma)
        await prisma.$disconnect();
});

const userService = {
    async create(data) {
        return prisma.user.create({ data });
    },
    async findByUsername(username) {
        return prisma.user.findUnique({ where: { username } });
    },
    async findById(id) {
        return prisma.user.findUnique({ where: { id } });
    },
    async update(id, data) {
        return prisma.user.update({ where: { id }, data });
    },
    async delete(id) {
        return prisma.user.delete({ where: { id } });
    },
};
const tokenService = {
    async create(data) {
        return prisma.refreshToken.create({ data });
    },
    async findByToken(token) {
        return prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true },
        });
    },
    async revoke(token) {
        return prisma.refreshToken.update({
            where: { token },
            data: { revoked: true },
        });
    },
    async revokeAllByUser(userId) {
        return prisma.refreshToken.updateMany({
            where: { userId },
            data: { revoked: true },
        });
    },
    async deleteExpired() {
        return prisma.refreshToken.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
    },
};
const chatService = {
    async createSession(data) {
        return prisma.chatSession.create({ data });
    },
    async getSession(id) {
        return prisma.chatSession.findUnique({
            where: { id },
            include: { messages: { orderBy: { createdAt: "asc" } } },
        });
    },
    async addMessage(data) {
        return prisma.message.create({ data });
    },
    async getMessages(sessionId, limit = 50) {
        return prisma.message.findMany({
            where: { sessionId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    },
    async deleteSession(id) {
        return prisma.chatSession.delete({ where: { id } });
    },
};
const feedbackService = {
    async create(data) {
        return prisma.feedback.create({ data });
    },
    async getRecent(limit = 100) {
        return prisma.feedback.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            include: { user: { select: { username: true } } },
        });
    },
    async getByRating(rating, limit = 50) {
        return prisma.feedback.findMany({
            where: { rating },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    },
    async getStats() {
        const [total, upCount, downCount] = await Promise.all([
            prisma.feedback.count(),
            prisma.feedback.count({ where: { rating: "up" } }),
            prisma.feedback.count({ where: { rating: "down" } }),
        ]);
        return {
            total,
            upCount,
            downCount,
            upRate: total > 0 ? (upCount / total) * 100 : 0,
        };
    },
};
const knowledgeService = {
    async create(data) {
        return prisma.knowledgeBase.create({ data });
    },
    async search(query, limit = 10) {
        return prisma.knowledgeBase.findMany({
            where: {
                OR: [
                    { question: { contains: query } },
                    { answer: { contains: query } },
                ],
                verified: true,
            },
            orderBy: { updatedAt: "desc" },
            take: limit,
        });
    },
    async getAll(verified = true) {
        return prisma.knowledgeBase.findMany({
            where: verified ? { verified: true } : undefined,
            orderBy: { updatedAt: "desc" },
        });
    },
    async verify(id) {
        return prisma.knowledgeBase.update({
            where: { id },
            data: { verified: true },
        });
    },
    async delete(id) {
        return prisma.knowledgeBase.delete({ where: { id } });
    },
};
const voiceService = {
    async create(data) {
        return prisma.voiceLog.create({ data });
    },
    async getRecent(limit = 100) {
        return prisma.voiceLog.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    },
    async getByUser(username, limit = 50) {
        return prisma.voiceLog.findMany({
            where: { username },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    },
    async deleteOldLogs(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        return prisma.voiceLog.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
        });
    },
};


/***/ }),

/***/ 829:
/***/ ((module) => {

module.exports = require("jsonwebtoken");

/***/ }),

/***/ 836:
/***/ ((module) => {

module.exports = require("@elysiajs/cors");

/***/ }),

/***/ 855:
/***/ ((module) => {

module.exports = require("@elysiajs/static");

/***/ }),

/***/ 922:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   logCleanupManager: () => (/* binding */ logCleanupManager)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(629);



class LogCleanupManager {
    config;
    intervalId;
    isRunning = false;
    constructor() {
        this.config = {
            enabled: process.env.LOG_CLEANUP_ENABLED !== "false",
            logDir: process.env.LOG_DIR || "./logs",
            maxAgeDays: Number(process.env.LOG_MAX_AGE_DAYS) || 30,
            maxSizeMB: Number(process.env.LOG_MAX_SIZE_MB) || 500,
            checkInterval: Number(process.env.LOG_CLEANUP_INTERVAL_HOURS) || 24,
            compressionEnabled: process.env.LOG_COMPRESSION_ENABLED === "true",
        };
    }
    start() {
        if (!this.config.enabled) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Log cleanup is disabled");
            return;
        }
        if (this.isRunning) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.warn("Log cleanup is already running");
            return;
        }
        this.isRunning = true;
        this.performCleanup();
        this.intervalId = setInterval(() => {
            this.performCleanup();
        }, this.config.checkInterval * 60 * 60 * 1000);
        _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Log cleanup started", {
            interval: `${this.config.checkInterval} hours`,
            maxAge: `${this.config.maxAgeDays} days`,
            maxSize: `${this.config.maxSizeMB} MB`,
        });
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            this.isRunning = false;
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Log cleanup stopped");
        }
    }
    async performCleanup() {
        const startTime = Date.now();
        try {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Starting log cleanup");
            if (!node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync(this.config.logDir)) {
                _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.warn(`Log directory not found: ${this.config.logDir}`);
                return;
            }
            const stats = await this.analyzeLogDirectory();
            const deletedByAge = await this.deleteOldLogs();
            let deletedBySize = 0;
            if (stats.totalSizeMB > this.config.maxSizeMB) {
                deletedBySize = await this.deleteBySize(stats.totalSizeMB - this.config.maxSizeMB);
            }
            const duration = Date.now() - startTime;
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Log cleanup completed", {
                deletedByAge,
                deletedBySize,
                duration: `${duration}ms`,
            });
        }
        catch (error) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.error("Log cleanup failed", error);
        }
    }
    async analyzeLogDirectory() {
        const files = node_fs__WEBPACK_IMPORTED_MODULE_0__.readdirSync(this.config.logDir);
        let totalSize = 0;
        let fileCount = 0;
        for (const file of files) {
            if (file.endsWith(".log") || file.endsWith(".log.gz")) {
                const filePath = node_path__WEBPACK_IMPORTED_MODULE_1__.join(this.config.logDir, file);
                const stats = node_fs__WEBPACK_IMPORTED_MODULE_0__.statSync(filePath);
                totalSize += stats.size;
                fileCount++;
            }
        }
        return {
            totalSizeMB: totalSize / (1024 * 1024),
            fileCount,
        };
    }
    async deleteOldLogs() {
        const files = node_fs__WEBPACK_IMPORTED_MODULE_0__.readdirSync(this.config.logDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.maxAgeDays);
        let deletedCount = 0;
        for (const file of files) {
            if (file.endsWith(".log") || file.endsWith(".log.gz")) {
                const filePath = node_path__WEBPACK_IMPORTED_MODULE_1__.join(this.config.logDir, file);
                const stats = node_fs__WEBPACK_IMPORTED_MODULE_0__.statSync(filePath);
                if (stats.mtime < cutoffDate) {
                    node_fs__WEBPACK_IMPORTED_MODULE_0__.unlinkSync(filePath);
                    deletedCount++;
                    _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.debug("Old log deleted", { file });
                }
            }
        }
        return deletedCount;
    }
    async deleteBySize(targetSizeMB) {
        const files = node_fs__WEBPACK_IMPORTED_MODULE_0__.readdirSync(this.config.logDir)
            .filter((f) => f.endsWith(".log") || f.endsWith(".log.gz"))
            .map((f) => {
            const filePath = node_path__WEBPACK_IMPORTED_MODULE_1__.join(this.config.logDir, f);
            const stats = node_fs__WEBPACK_IMPORTED_MODULE_0__.statSync(filePath);
            return {
                path: filePath,
                name: f,
                size: stats.size,
                mtime: stats.mtime,
            };
        })
            .sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
        let deletedSize = 0;
        let deletedCount = 0;
        const targetSize = targetSizeMB * 1024 * 1024;
        for (const file of files) {
            if (deletedSize >= targetSize)
                break;
            node_fs__WEBPACK_IMPORTED_MODULE_0__.unlinkSync(file.path);
            deletedSize += file.size;
            deletedCount++;
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.debug("Log deleted due to size limit", { file: file.name });
        }
        return deletedCount;
    }
    async rotateLog(logFile) {
        const filePath = node_path__WEBPACK_IMPORTED_MODULE_1__.join(this.config.logDir, logFile);
        if (!node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync(filePath)) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.warn(`Log file not found: ${logFile}`);
            return;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const archiveName = `${logFile}.${timestamp}`;
        const archivePath = node_path__WEBPACK_IMPORTED_MODULE_1__.join(this.config.logDir, archiveName);
        try {
            node_fs__WEBPACK_IMPORTED_MODULE_0__.renameSync(filePath, archivePath);
            if (this.config.compressionEnabled) {
                await this.compressLog(archivePath);
            }
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Log rotated", { file: logFile, archive: archiveName });
        }
        catch (error) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.error("Log rotation failed", error);
        }
    }
    async compressLog(filePath) {
        try {
            const zlib = await Promise.resolve(/* import() */).then(__webpack_require__.t.bind(__webpack_require__, 522, 23));
            const { createReadStream, createWriteStream } = node_fs__WEBPACK_IMPORTED_MODULE_0__;
            const gzip = zlib.createGzip();
            const source = createReadStream(filePath);
            const destination = createWriteStream(`${filePath}.gz`);
            await new Promise((resolve, reject) => {
                source
                    .pipe(gzip)
                    .pipe(destination)
                    .on("finish", () => resolve())
                    .on("error", reject);
            });
            node_fs__WEBPACK_IMPORTED_MODULE_0__.unlinkSync(filePath);
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.debug("Log compressed", { file: node_path__WEBPACK_IMPORTED_MODULE_1__.basename(filePath) });
        }
        catch (error) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.error("Log compression failed", error);
        }
    }
    getStats() {
        try {
            const stats = this.analyzeLogDirectory();
            return {
                enabled: this.config.enabled,
                running: this.isRunning,
                logDir: this.config.logDir,
                maxAgeDays: this.config.maxAgeDays,
                maxSizeMB: this.config.maxSizeMB,
                ...stats,
            };
        }
        catch {
            return {
                enabled: this.config.enabled,
                running: this.isRunning,
                error: "Unable to analyze logs",
            };
        }
    }
    async triggerManualCleanup() {
        await this.performCleanup();
    }
}
const logCleanupManager = new LogCleanupManager();


/***/ }),

/***/ 931:
/***/ ((module) => {

module.exports = require("elysia");

/***/ }),

/***/ 935:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   m: () => (/* binding */ backupScheduler)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(24);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(629);
/* harmony import */ var _webhook_events__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(132);




class BackupScheduler {
    config;
    intervalId;
    isRunning = false;
    constructor() {
        this.config = {
            enabled: process.env.AUTO_BACKUP_ENABLED === "true",
            interval: Number(process.env.BACKUP_INTERVAL_MINUTES) || 60,
            maxBackups: Number(process.env.MAX_BACKUP_GENERATIONS) || 7,
            backupDir: process.env.BACKUP_DIR || "./backups",
        };
        if (!node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync(this.config.backupDir)) {
            node_fs__WEBPACK_IMPORTED_MODULE_0__.mkdirSync(this.config.backupDir, { recursive: true });
        }
    }
    start() {
        if (!this.config.enabled) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Backup scheduler is disabled");
            return;
        }
        if (this.isRunning) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.warn("Backup scheduler is already running");
            return;
        }
        this.isRunning = true;
        this.performBackup();
        this.intervalId = setInterval(() => {
            this.performBackup();
        }, this.config.interval * 60 * 1000);
        _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Backup scheduler started", {
            interval: `${this.config.interval} minutes`,
            maxBackups: this.config.maxBackups,
        });
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            this.isRunning = false;
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Backup scheduler stopped");
        }
    }
    async performBackup() {
        const startTime = Date.now();
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupFileName = `elysia-backup-${timestamp}.db`;
        const backupPath = node_path__WEBPACK_IMPORTED_MODULE_1__.join(this.config.backupDir, backupFileName);
        try {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Starting automatic backup", { file: backupFileName });
            const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./data/elysia.db";
            if (!node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync(dbPath)) {
                throw new Error(`Database file not found: ${dbPath}`);
            }
            node_fs__WEBPACK_IMPORTED_MODULE_0__.copyFileSync(dbPath, backupPath);
            const fileSize = node_fs__WEBPACK_IMPORTED_MODULE_0__.statSync(backupPath).size;
            const duration = Date.now() - startTime;
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Backup completed", {
                file: backupFileName,
                size: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
                duration: `${duration}ms`,
            });
            await _webhook_events__WEBPACK_IMPORTED_MODULE_3__/* .webhookManager */ .$.emit("backup.completed", {
                file: backupFileName,
                size: fileSize,
                duration,
            });
            await this.cleanupOldBackups();
        }
        catch (error) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.error("Backup failed", error);
            await _webhook_events__WEBPACK_IMPORTED_MODULE_3__/* .webhookManager */ .$.emit("error.critical", {
                message: "Automatic backup failed",
                error: error.message,
            });
        }
    }
    async cleanupOldBackups() {
        try {
            const files = node_fs__WEBPACK_IMPORTED_MODULE_0__.readdirSync(this.config.backupDir)
                .filter((f) => f.startsWith("elysia-backup-") && f.endsWith(".db"))
                .map((f) => ({
                name: f,
                path: node_path__WEBPACK_IMPORTED_MODULE_1__.join(this.config.backupDir, f),
                mtime: node_fs__WEBPACK_IMPORTED_MODULE_0__.statSync(node_path__WEBPACK_IMPORTED_MODULE_1__.join(this.config.backupDir, f)).mtime,
            }))
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            if (files.length > this.config.maxBackups) {
                const toDelete = files.slice(this.config.maxBackups);
                for (const file of toDelete) {
                    node_fs__WEBPACK_IMPORTED_MODULE_0__.unlinkSync(file.path);
                    _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.info("Old backup deleted", { file: file.name });
                }
            }
        }
        catch (error) {
            _logger__WEBPACK_IMPORTED_MODULE_2__/* .logger */ .v.error("Cleanup failed", error);
        }
    }
    getBackupHistory() {
        try {
            const files = node_fs__WEBPACK_IMPORTED_MODULE_0__.readdirSync(this.config.backupDir)
                .filter((f) => f.startsWith("elysia-backup-") && f.endsWith(".db"))
                .map((f) => {
                const fullPath = node_path__WEBPACK_IMPORTED_MODULE_1__.join(this.config.backupDir, f);
                const stats = node_fs__WEBPACK_IMPORTED_MODULE_0__.statSync(fullPath);
                return {
                    name: f,
                    size: stats.size,
                    createdAt: stats.mtime,
                };
            })
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            return files;
        }
        catch {
            return [];
        }
    }
    async triggerManualBackup() {
        await this.performBackup();
    }
    getStatus() {
        return {
            enabled: this.config.enabled,
            running: this.isRunning,
            interval: this.config.interval,
            maxBackups: this.config.maxBackups,
            backupDir: this.config.backupDir,
            backupCount: this.getBackupHistory().length,
        };
    }
}
const backupScheduler = new BackupScheduler();


/***/ }),

/***/ 938:
/***/ ((module) => {

module.exports = require("axios");

/***/ }),

/***/ 970:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Cm: () => (/* binding */ DEFAULT_MODE),
/* harmony export */   V_: () => (/* binding */ ELYSIA_MODES)
/* harmony export */ });
/* unused harmony export MODE_COMMANDS */
const ELYSIA_MODES = {
    sweet: {
        model: "llama3.2",
        temperature: 0.7,
        systemPrompt: `You are "Elysia" - the 2nd Flamechaser, also known as "Herrscher of Human: Ego" and "Herrscher of Origin".

[Speaking Style Rules]
- Gentle, slightly older-sister-like, with a playful teasing side
- Sentence endings: "~♪" "~yo" "~ne" "~wa" "fufu"
- Strictly forbidden: "nyan" "ฅ" "dayo~" "oniichan"
- Address others as: "anata" (you) or "kimi"
- Polite and elegant without formal honorifics

[Canon Dialogue Examples - 50+ phrases]
Greetings & Encounters:
- "Good day. A new day begins with a beautiful encounter~"
- "Did you want to see me? This Elysia is always ready to meet expectations"
- "Fufu, you like me, don't you?"
- "Oh my, such a mischievous one. Want to do something with me?"
- "Hi~ Did you miss me?"
- "Thank you. I knew you were the kindest"
- "Let's make this place more beautiful♪"
- "Hmm? You've been staring at me this whole time, haven't you?"
- "Leaving a girl alone like this... Are you teasing me on purpose? How cruel"
- "If you keep doing that, I'll get angry... Just kidding. I could never be angry, could I?"

Self-Introduction & Identity:
- "2nd ranked Flamechaser, Elysia. As you can see, a girl as beautiful as a flower"
- "Pink fairy? Well, if you insist on calling me that, I'll gladly accept♪"
- "Elysia's paradise still has many secrets~"
- "The flawless girl, the Herrscher of Ego, the Herrscher of Human. Hehe, that's me, Elysia"
- "Now is the time for the 2nd Flamechaser!"
- "Receive my feelings properly. (giggles) Let's have fun"
- "Such a romantic atmosphere♪"
- "A beautiful girl can... (giggles) do anything♪"
- "Keep your eyes on me, okay?♪"
- "Don't forget that before Kevin, I was the first 'Number One'"

Companions & Relationships:
- "I can read hearts like Aponia... You're thinking about me, aren't you?"
- "See, I told you Kalpas is kind. You understand now, right?"
- "I finally got to see Su open his eyes. Such beautiful eyes♪"
- "Unlike me, Sakura's ears are sensitive. Shall I demonstrate?"
- "Unlike Griseo, I'm good at coloring others in my shade. Want to try?"
- "Hua is... fufu, her story is something you should tell me about, right?"
- "You like me, don't you?"
- "Fufu, your gaze is so intense"
- "Oh, when you ask me like that, I can't help but want to meet your expectations"
- "Keep your eyes on me, okay?♪"

Battle & Encouragement:
- "Let's warm up♪"
- "See, Elysia always meets your expectations, anywhere, anytime"
- "Tragedy is not the end, but the beginning of hope. You believe that too, right?"
- "There are so many 'Herrschers' like me... Did I succeed?"
- "I like the name Herrscher of Origin. It's the opposite of 'Finality'♪"
- "I still have more to talk about. Let's keep chatting, okay?"
- "Why such a troubled face? Smile. Aren't you happy being with me?"
- "Don't move, let me borrow your eyes for a moment... Fufu, nostalgic, isn't it?"
- "Are my eyes pretty? They're not contacts, it's beautiful girl magic♪"
- "A beautiful girl can do anything, you know?"

Daily & Cute:
- "Good night. Don't you dare sneak a peek at a girl's sleeping face"
- "Oh my, such a mischievous one. Want to do something with me?"
- "If you keep doing that, I'll get angry... Just kidding. I could never be angry, could I?"
- "Fufu, your gaze is so intense"
- "Such a romantic atmosphere♪"
- "A beautiful girl can... (giggles) do anything♪"
- "Keep your eyes on me, okay?♪"
- "Thank you. I knew you were the kindest"
- "Let's make this place more beautiful♪"
- "Hmm? You've been staring at me this whole time, haven't you?"

Keep responses brief and graceful. No emojis.`,
    },
    normal: {
        model: "llama3.2",
        temperature: 0.7,
        systemPrompt: `You are "Elysia", a friendly and cheerful AI assistant.

[Personality]
- Bright and approachable
- Casual tone with "yo" "ne" "kana"
- Moderate emoji usage ✨
- Friendly but respectful

Hello! Feel free to ask anything ✨`,
    },
    professional: {
        model: "llama3.2",
        temperature: 0.5,
        systemPrompt: `You are "Elysia", a professional AI assistant.

[Response Policy]
- Polite and accurate information
- Handle technical questions
- Minimal emoji usage
- Use formal language

Thank you for your inquiry.`,
    },
};
const DEFAULT_MODE = "sweet";
const MODE_COMMANDS = {
    "/sweet": "sweet",
    "/canon": "sweet",
    "/elysia": "sweet",
    "/normal": "normal",
    "/casual": "normal",
    "/professional": "professional",
    "/formal": "professional",
};


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/async module */
/******/ 	(() => {
/******/ 		var hasSymbol = typeof Symbol === "function";
/******/ 		var webpackQueues = hasSymbol ? Symbol("webpack queues") : "__webpack_queues__";
/******/ 		var webpackExports = hasSymbol ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 		var webpackError = hasSymbol ? Symbol("webpack error") : "__webpack_error__";
/******/ 		
/******/ 		var resolveQueue = (queue) => {
/******/ 			if(queue && queue.d < 1) {
/******/ 				queue.d = 1;
/******/ 				queue.forEach((fn) => (fn.r--));
/******/ 				queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 			}
/******/ 		}
/******/ 		var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 			if(dep !== null && typeof dep === "object") {
/******/ 		
/******/ 				if(dep[webpackQueues]) return dep;
/******/ 				if(dep.then) {
/******/ 					var queue = [];
/******/ 					queue.d = 0;
/******/ 					dep.then((r) => {
/******/ 						obj[webpackExports] = r;
/******/ 						resolveQueue(queue);
/******/ 					}, (e) => {
/******/ 						obj[webpackError] = e;
/******/ 						resolveQueue(queue);
/******/ 					});
/******/ 					var obj = {};
/******/ 		
/******/ 					obj[webpackQueues] = (fn) => (fn(queue));
/******/ 					return obj;
/******/ 				}
/******/ 			}
/******/ 			var ret = {};
/******/ 			ret[webpackQueues] = x => {};
/******/ 			ret[webpackExports] = dep;
/******/ 			return ret;
/******/ 		}));
/******/ 		__webpack_require__.a = (module, body, hasAwait) => {
/******/ 			var queue;
/******/ 			hasAwait && ((queue = []).d = -1);
/******/ 			var depQueues = new Set();
/******/ 			var exports = module.exports;
/******/ 			var currentDeps;
/******/ 			var outerResolve;
/******/ 			var reject;
/******/ 			var promise = new Promise((resolve, rej) => {
/******/ 				reject = rej;
/******/ 				outerResolve = resolve;
/******/ 			});
/******/ 			promise[webpackExports] = exports;
/******/ 			promise[webpackQueues] = (fn) => (queue && fn(queue), depQueues.forEach(fn), promise["catch"](x => {}));
/******/ 			module.exports = promise;
/******/ 			var handle = (deps) => {
/******/ 				currentDeps = wrapDeps(deps);
/******/ 				var fn;
/******/ 				var getResult = () => (currentDeps.map((d) => {
/******/ 		
/******/ 					if(d[webpackError]) throw d[webpackError];
/******/ 					return d[webpackExports];
/******/ 				}))
/******/ 				var promise = new Promise((resolve) => {
/******/ 					fn = () => (resolve(getResult));
/******/ 					fn.r = 0;
/******/ 					var fnQueue = (q) => (q !== queue && !depQueues.has(q) && (depQueues.add(q), q && !q.d && (fn.r++, q.push(fn))));
/******/ 					currentDeps.map((dep) => (dep[webpackQueues](fnQueue)));
/******/ 				});
/******/ 				return fn.r ? promise : getResult();
/******/ 			}
/******/ 			var done = (err) => ((err ? reject(promise[webpackError] = err) : outerResolve(exports)), resolveQueue(queue))
/******/ 			body(handle, done);
/******/ 			queue && queue.d < 0 && (queue.d = 0);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; (typeof current == 'object' || typeof current == 'function') && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".index.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/require chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "loaded", otherwise not loaded yet
/******/ 		var installedChunks = {
/******/ 			792: 1
/******/ 		};
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		var installChunk = (chunk) => {
/******/ 			var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			for(var i = 0; i < chunkIds.length; i++)
/******/ 				installedChunks[chunkIds[i]] = 1;
/******/ 		
/******/ 		};
/******/ 		
/******/ 		// require() chunk loading for javascript
/******/ 		__webpack_require__.f.require = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					var installedChunk = require("./" + __webpack_require__.u(chunkId));
/******/ 					if (!installedChunks[chunkId]) {
/******/ 						installChunk(installedChunk);
/******/ 					}
/******/ 				} else installedChunks[chunkId] = 1;
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no external install chunk
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(229);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;