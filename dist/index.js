/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 24:
/***/ ((module) => {

module.exports = require("node:fs");

/***/ }),

/***/ 729:
/***/ ((module) => {

module.exports = require("bcryptjs");

/***/ }),

/***/ 800:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  Dn: () => (/* binding */ feedbackService),
  ME: () => (/* binding */ knowledgeService),
  Dv: () => (/* binding */ userService)
});

// UNUSED EXPORTS: chatService, prisma, tokenService, voiceService

;// external "@prisma/client"
const client_namespaceObject = require("@prisma/client");
;// ./src/lib/database.ts

const prisma = new client_namespaceObject.PrismaClient({
    log:  true ? ["query", "error", "warn"] : 0,
});
process.on("beforeExit", async () => {
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

/***/ 911:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  v: () => (/* binding */ logger)
});

// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __webpack_require__(24);
;// external "node:path"
const external_node_path_namespaceObject = require("node:path");
;// ./src/lib/logger.ts


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
        this.logFile = (0,external_node_path_namespaceObject.join)(logDir, `app-${new Date().toISOString().split("T")[0]}.log`);
        if (!(0,external_node_fs_.existsSync)(logDir)) {
            (0,external_node_fs_.mkdirSync)(logDir, { recursive: true });
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
            (0,external_node_fs_.appendFileSync)(this.logFile, this.formatLog(entry));
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
        if (!(0,external_node_fs_.existsSync)(this.logDir))
            return;
        const fs = __webpack_require__(24);
        const files = fs.readdirSync(this.logDir);
        for (const file of files) {
            const filePath = (0,external_node_path_namespaceObject.join)(this.logDir, file);
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
var __webpack_exports__ = {};
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ src)
});

// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __webpack_require__(24);
;// external "@elysiajs/cors"
const cors_namespaceObject = require("@elysiajs/cors");
;// external "@elysiajs/html"
const html_namespaceObject = require("@elysiajs/html");
;// external "@elysiajs/static"
const static_namespaceObject = require("@elysiajs/static");
;// external "@elysiajs/swagger"
const swagger_namespaceObject = require("@elysiajs/swagger");
;// external "axios"
const external_axios_namespaceObject = require("axios");
var external_axios_default = /*#__PURE__*/__webpack_require__.n(external_axios_namespaceObject);
;// external "elysia"
const external_elysia_namespaceObject = require("elysia");
;// external "jsonwebtoken"
const external_jsonwebtoken_namespaceObject = require("jsonwebtoken");
var external_jsonwebtoken_default = /*#__PURE__*/__webpack_require__.n(external_jsonwebtoken_namespaceObject);
;// external "sanitize-html"
const external_sanitize_html_namespaceObject = require("sanitize-html");
var external_sanitize_html_default = /*#__PURE__*/__webpack_require__.n(external_sanitize_html_namespaceObject);
;// ./.internal/app/llm/llm-config.ts
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

;// external "ioredis"
const external_ioredis_namespaceObject = require("ioredis");
var external_ioredis_default = /*#__PURE__*/__webpack_require__.n(external_ioredis_namespaceObject);
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



;// ./.internal/secure/db/index.ts
const DATABASE_CONFIG = {
    RAG_API_URL: process.env.RAG_API_URL || "http://127.0.0.1:8000/rag",
    RAG_TIMEOUT: Number(process.env.RAG_TIMEOUT) || 5000,
    MILVUS_HOST: process.env.MILVUS_HOST || "localhost",
    MILVUS_PORT: Number(process.env.MILVUS_PORT) || 19530,
    MILVUS_COLLECTION: process.env.MILVUS_COLLECTION || "elysia_knowledge",
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    REDIS_ENABLED: process.env.REDIS_ENABLED !== "false",
};
/* harmony default export */ const db = ((/* unused pure expression or super */ null && (DATABASE_CONFIG)));

;// ./src/lib/health.ts


async function checkRedis(redisUrl) {
    const startTime = Date.now();
    try {
        const redis = new (external_ioredis_default())(redisUrl, {
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
        const response = await external_axios_default().get(`${fastAPIUrl}/health`, {
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
        const response = await external_axios_default().get(`${ollamaUrl}/api/tags`, {
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

;// ./src/lib/metrics.ts
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

// EXTERNAL MODULE: ./src/lib/logger.ts + 1 modules
var lib_logger = __webpack_require__(911);
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
            const name = spanName || `${target.constructor.name}.${propertyKey}`;
            return telemetry.trace(name, async (span) => {
                span.attributes.method = propertyKey;
                return originalMethod.apply(this, args);
            });
        };
        return descriptor;
    };
}

// EXTERNAL MODULE: ./src/lib/database.ts + 1 modules
var database = __webpack_require__(800);
;// ./src/lib/env-validator.ts

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
        validator: (v) => !isNaN(Number(v)) && Number(v) > 0 && Number(v) < 65536,
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
    lib_logger/* logger */.v.info("🔍 環境変数を検証中...");
    const result = validateEnvironment();
    if (result.warnings.length > 0) {
        lib_logger/* logger */.v.warn("⚠️  環境変数の警告:");
        for (const warning of result.warnings) {
            lib_logger/* logger */.v.warn(`  ${warning}`);
        }
    }
    if (!result.valid) {
        lib_logger/* logger */.v.error("❌ 環境変数の検証に失敗しました:");
        for (const error of result.errors) {
            lib_logger/* logger */.v.error(`  ${error}`);
        }
        lib_logger/* logger */.v.error("\n💡 修正方法:");
        lib_logger/* logger */.v.error("  1. .env ファイルを開く");
        lib_logger/* logger */.v.error("  2. 上記の必須項目を設定");
        lib_logger/* logger */.v.error("  3. サーバーを再起動\n");
        process.exit(1);
    }
    lib_logger/* logger */.v.info("✅ 環境変数の検証完了");
}
function printEnvironmentSummary() {
    logger.info("\n📋 環境変数サマリー:");
    logger.info(`  - ポート: ${process.env.PORT || 3000}`);
    logger.info(`  - データベース: ${process.env.DATABASE_URL || "未設定"}`);
    logger.info(`  - Redis: ${process.env.REDIS_ENABLED === "true" ? "有効" : "無効"}`);
    logger.info(`  - Ollama: ${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}`);
    logger.info(`  - モデル: ${process.env.OLLAMA_MODEL || "llama3.2"}\n`);
}

;// ./src/index.ts


















checkEnvironmentOrExit();
const src_CONFIG = {
    PORT: Number(process.env.PORT) || 3000,
    RAG_API_URL: DATABASE_CONFIG.RAG_API_URL,
    RAG_TIMEOUT: DATABASE_CONFIG.RAG_TIMEOUT,
    MODEL_NAME: process.env.MODEL_NAME || "llama3.2",
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
        return await checkRateLimitRedis(key, src_CONFIG.MAX_REQUESTS_PER_MINUTE);
    }
    catch {
        return true;
    }
}
function containsDangerousKeywords(text) {
    const bad = [/\b(drop|delete)\b/i, /<script/i];
    return bad.some((r) => r.test(text));
}
const app = new external_elysia_namespaceObject.Elysia()
    .use((0,cors_namespaceObject.cors)({ origin: src_CONFIG.ALLOWED_ORIGINS }))
    .use((0,html_namespaceObject.html)())
    .use((0,static_namespaceObject.staticPlugin)({ assets: "public" }))
    .use((0,swagger_namespaceObject.swagger)({ path: "/swagger" }))
    .onBeforeHandle(({ request }) => {
    const url = new URL(request.url);
    const path = url.pathname;
    const traceContext = getTraceContextFromRequest(request);
    const span = telemetry.startSpan(`HTTP ${request.method} ${path}`, {
        parentContext: traceContext || undefined,
        attributes: {
            "http.method": request.method,
            "http.url": request.url,
            "http.route": path,
        },
    });
    request.__span = span;
    request.__startTime = Date.now();
    metricsCollector.incrementRequest(request.method, path, 200);
})
    .onError(({ error, code, request }) => {
    const url = new URL(request.url);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorLog = `${String(code)}: ${errorMsg} at ${url.pathname}`;
    lib_logger/* logger */.v.error(errorLog);
    metricsCollector.incrementError(request.method, url.pathname, String(code));
    const span = request.__span;
    if (span) {
        telemetry.endSpan(span.spanId, {
            code: "ERROR",
            message: errorMsg,
        });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonError(500, message);
})
    .onAfterHandle(({ set, request }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    const extReq = request;
    const span = extReq.__span;
    if (span) {
        set.headers.traceparent = telemetry.createTraceContext(span.traceId, span.spanId);
        telemetry.endSpan(span.spanId);
    }
    const startTime = extReq.__startTime;
    if (startTime) {
        const duration = (Date.now() - startTime) / 1000;
        const url = new URL(request.url);
        metricsCollector.recordRequestDuration(request.method, url.pathname, duration);
    }
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
        const health = await performHealthCheck(redisUrl, src_CONFIG.RAG_API_URL, src_CONFIG.MODEL_NAME);
        const status = health.status === "healthy" ? 200 : 503;
        return new Response(JSON.stringify(health), {
            status,
            headers: { "content-type": "application/json" },
        });
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        lib_logger/* logger */.v.error(`Health check failed: ${errorMsg}`);
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
    const metrics = metricsCollector.toPrometheusFormat();
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
        payload = external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    if (!(0,external_node_fs_.existsSync)("data"))
        (0,external_node_fs_.mkdirSync)("data", { recursive: true });
    const ip = request.headers.get("x-forwarded-for") || "anon";
    const userId = payload.userId || undefined;
    try {
        await database/* feedbackService */.Dn.create({
            userId,
            query: body.query,
            answer: body.answer,
            rating: body.rating,
            reason: body.reason || undefined,
        });
    }
    catch (err) {
        lib_logger/* logger */.v.error("Failed to store feedback", err instanceof Error ? err : undefined);
        return jsonError(500, "Failed to store feedback");
    }
    return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
    });
}, {
    body: external_elysia_namespaceObject.t.Object({
        query: external_elysia_namespaceObject.t.String({ minLength: 1, maxLength: 400 }),
        answer: external_elysia_namespaceObject.t.String({ minLength: 1, maxLength: 4000 }),
        rating: external_elysia_namespaceObject.t.Union([external_elysia_namespaceObject.t.Literal("up"), external_elysia_namespaceObject.t.Literal("down")]),
        reason: external_elysia_namespaceObject.t.Optional(external_elysia_namespaceObject.t.String({ maxLength: 256 })),
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
        external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    try {
        await database/* knowledgeService */.ME.create({
            question: body.summary,
            answer: body.sourceUrl || "No source provided",
            source: "api",
            verified: body.confidence > 0.8,
        });
    }
    catch (err) {
        lib_logger/* logger */.v.error("Failed to store knowledge", err instanceof Error ? err : undefined);
        return jsonError(500, "Failed to store knowledge");
    }
    return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
    });
}, {
    body: external_elysia_namespaceObject.t.Object({
        summary: external_elysia_namespaceObject.t.String({ minLength: 10, maxLength: 2000 }),
        sourceUrl: external_elysia_namespaceObject.t.Optional(external_elysia_namespaceObject.t.String()),
        tags: external_elysia_namespaceObject.t.Optional(external_elysia_namespaceObject.t.Array(external_elysia_namespaceObject.t.String({ maxLength: 32 }), { maxItems: 8 })),
        confidence: external_elysia_namespaceObject.t.Number({ minimum: 0, maximum: 1 }),
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
        external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const n = Number(query?.n ?? 20) || 20;
    try {
        if (!(0,external_node_fs_.existsSync)("data/knowledge.jsonl"))
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
    query: external_elysia_namespaceObject.t.Object({ n: external_elysia_namespaceObject.t.Optional(external_elysia_namespaceObject.t.Number()) }),
    detail: {
        tags: ["knowledge"],
        summary: "Get recent knowledge entries",
        description: "Retrieve the last N knowledge entries from the knowledge base. Requires JWT.",
        security: [{ bearerAuth: [] }],
    },
})
    .post("/auth/token", async ({ body }) => {
    const { username, password } = body;
    if (username !== src_CONFIG.AUTH_USERNAME ||
        password !== src_CONFIG.AUTH_PASSWORD)
        return jsonError(401, "Invalid credentials");
    const userId = username;
    const accessToken = external_jsonwebtoken_default().sign({ iss: "elysia-ai", userId, iat: Math.floor(Date.now() / 1000) }, src_CONFIG.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = external_jsonwebtoken_default().sign({
        iss: "elysia-ai-refresh",
        userId,
        iat: Math.floor(Date.now() / 1000),
    }, src_CONFIG.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    await storeRefreshToken(userId, refreshToken, 7 * 24 * 60 * 60);
    return new Response(JSON.stringify({ accessToken, refreshToken, expiresIn: 900 }), { headers: { "content-type": "application/json" } });
}, {
    body: external_elysia_namespaceObject.t.Object({
        username: external_elysia_namespaceObject.t.String({ minLength: 1, maxLength: 128 }),
        password: external_elysia_namespaceObject.t.String({ minLength: 1, maxLength: 128 }),
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
        payload = external_jsonwebtoken_default().verify(refreshToken, src_CONFIG.JWT_REFRESH_SECRET);
    }
    catch {
        return jsonError(401, "Invalid or expired refresh token");
    }
    const userId = payload.userId || "default-user";
    const isValid = await verifyStoredRefreshToken(userId, refreshToken);
    if (!isValid)
        return jsonError(401, "Refresh token not found or revoked");
    const newAccessToken = external_jsonwebtoken_default().sign({ iss: "elysia-ai", userId, iat: Math.floor(Date.now() / 1000) }, src_CONFIG.JWT_SECRET, { expiresIn: "15m" });
    return new Response(JSON.stringify({ accessToken: newAccessToken, expiresIn: 900 }), { headers: { "content-type": "application/json" } });
}, {
    body: external_elysia_namespaceObject.t.Object({ refreshToken: external_elysia_namespaceObject.t.String({ minLength: 20 }) }),
    detail: {
        tags: ["auth"],
        summary: "Refresh access token",
        description: "Exchange a valid refresh token for a new access token without re-authentication",
    },
})
    .post("/auth/logout", async ({ body }) => {
    const { refreshToken } = body;
    try {
        const payload = external_jsonwebtoken_default().verify(refreshToken, src_CONFIG.JWT_REFRESH_SECRET);
        const userId = payload.userId || "default-user";
        await revokeRefreshToken(userId);
        return new Response(JSON.stringify({ message: "Logged out successfully" }), {
            headers: { "content-type": "application/json" },
        });
    }
    catch {
        return jsonError(400, "Invalid refresh token");
    }
}, {
    body: external_elysia_namespaceObject.t.Object({ refreshToken: external_elysia_namespaceObject.t.String({ minLength: 20 }) }),
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
            external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
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
            const payload = external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
            userId = payload.userId || "anon";
        }
    }
    catch { }
    const clientKey = `${userId}:${ip}`;
    const rateLimitOk = await checkRateLimit(clientKey);
    if (!rateLimitOk)
        return jsonError(429, "Rate limit exceeded");
    const mode = body.mode || DEFAULT_MODE;
    const llmConfig = ELYSIA_MODES[mode];
    const sanitizedMessages = body.messages.map((m) => {
        const cleaned = external_sanitize_html_default()(m.content, {
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
        const upstream = await external_axios_default().post(src_CONFIG.RAG_API_URL, {
            messages: messagesWithSystem,
            temperature: llmConfig.temperature,
            model: llmConfig.model,
        }, { responseType: "stream", timeout: src_CONFIG.RAG_TIMEOUT });
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
        if (external_axios_default().isAxiosError(error) && error.response?.status === 503)
            return jsonError(503, "Upstream unavailable");
        return jsonError(500, "Internal chat error");
    }
}, {
    body: external_elysia_namespaceObject.t.Object({
        messages: external_elysia_namespaceObject.t.Array(external_elysia_namespaceObject.t.Object({
            role: external_elysia_namespaceObject.t.Union([
                external_elysia_namespaceObject.t.Literal("user"),
                external_elysia_namespaceObject.t.Literal("assistant"),
                external_elysia_namespaceObject.t.Literal("system"),
            ]),
            content: external_elysia_namespaceObject.t.String({
                maxLength: 400,
                minLength: 1,
            }),
        }), { maxItems: 8 }),
        mode: external_elysia_namespaceObject.t.Optional(external_elysia_namespaceObject.t.Union([
            external_elysia_namespaceObject.t.Literal("sweet"),
            external_elysia_namespaceObject.t.Literal("normal"),
            external_elysia_namespaceObject.t.Literal("professional"),
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
        external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const stats = await database/* feedbackService */.Dn.getStats();
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
        external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const feedbacks = await database/* feedbackService */.Dn.getRecent(100);
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
        external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    const knowledge = await database/* knowledgeService */.ME.getAll(false);
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
        external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    await database/* knowledgeService */.ME.verify(params.id);
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
        external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
    }
    catch {
        return jsonError(401, "Invalid token");
    }
    await database/* knowledgeService */.ME.delete(params.id);
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
    const existing = await database/* userService */.Dv.findByUsername(username);
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
        lib_logger/* logger */.v.error("Registration failed", error instanceof Error ? error : undefined);
        return jsonError(500, "Registration failed");
    }
}, {
    body: external_elysia_namespaceObject.t.Object({
        username: external_elysia_namespaceObject.t.String({ minLength: 3, maxLength: 32 }),
        password: external_elysia_namespaceObject.t.String({ minLength: 8, maxLength: 128 }),
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
        external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
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
        external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
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
        external_jsonwebtoken_default().verify(auth.substring(7), src_CONFIG.JWT_SECRET);
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
if (false) // removed by dead control flow
{}
/* harmony default export */ const src = (app);

module.exports = __webpack_exports__;
/******/ })()
;