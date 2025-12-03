/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
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
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

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
;// external "fs"
const external_fs_namespaceObject = require("fs");
;// external "fs/promises"
const promises_namespaceObject = require("fs/promises");
;// external "jsonwebtoken"
const external_jsonwebtoken_namespaceObject = require("jsonwebtoken");
var external_jsonwebtoken_default = /*#__PURE__*/__webpack_require__.n(external_jsonwebtoken_namespaceObject);
;// external "sanitize-html"
const external_sanitize_html_namespaceObject = require("sanitize-html");
var external_sanitize_html_default = /*#__PURE__*/__webpack_require__.n(external_sanitize_html_namespaceObject);
;// ./src/config/internal/llm-config.ts
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

;// ./src/core/security/jwt.ts

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
;// ./src/core/security/redis.ts

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
/* harmony default export */ const security_redis = ((/* unused pure expression or super */ null && (redis)));

;// ./src/core/security/index.ts



;// ./src/database/config/index.ts
const DATABASE_CONFIG = {
    RAG_API_URL: process.env.RAG_API_URL || "http://127.0.0.1:8000/rag",
    RAG_TIMEOUT: Number(process.env.RAG_TIMEOUT) || 5000,
    MILVUS_HOST: process.env.MILVUS_HOST || "localhost",
    MILVUS_PORT: Number(process.env.MILVUS_PORT) || 19530,
    MILVUS_COLLECTION: process.env.MILVUS_COLLECTION || "elysia_knowledge",
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    REDIS_ENABLED: process.env.REDIS_ENABLED !== "false",
};
/* harmony default export */ const config = ((/* unused pure expression or super */ null && (DATABASE_CONFIG)));

;// ./src/index.ts













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
    .onError(({ error, code }) => {
    console.error(`[ERROR] ${code}:`, error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonError(500, message);
})
    .onAfterHandle(({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
})
    .get("/ping", () => ({ ok: true }), {
    detail: {
        tags: ["health"],
        summary: "Health check endpoint",
        description: "Returns a simple OK response to verify server is running",
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
    if (!(0,external_fs_namespaceObject.existsSync)("data"))
        (0,external_fs_namespaceObject.mkdirSync)("data", { recursive: true });
    const ip = request.headers.get("x-forwarded-for") || "anon";
    const userId = payload.userId || "anon";
    const rec = {
        userId,
        ip,
        query: body.query,
        answer: body.answer,
        rating: body.rating,
        reason: body.reason || null,
        timestamp: new Date().toISOString(),
    };
    try {
        await (0,promises_namespaceObject.appendFile)("data/feedback.jsonl", JSON.stringify(rec) + "\n");
    }
    catch {
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
    if (!(0,external_fs_namespaceObject.existsSync)("data"))
        (0,external_fs_namespaceObject.mkdirSync)("data", { recursive: true });
    const item = {
        summary: body.summary,
        sourceUrl: body.sourceUrl || null,
        tags: body.tags || [],
        confidence: body.confidence,
        timestamp: new Date().toISOString(),
    };
    try {
        await (0,promises_namespaceObject.appendFile)("data/knowledge.jsonl", JSON.stringify(item) + "\n");
    }
    catch {
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
        if (!(0,external_fs_namespaceObject.existsSync)("data/knowledge.jsonl"))
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
}));
const server = Bun.serve({
    port: src_CONFIG.PORT,
    fetch: app.fetch.bind(app),
});
console.log(`
🚀 Elysia server is running!
📡 Port: ${server.port}
🌐 URL: http://${server.hostname}:${server.port}
📚 Docs: http://${server.hostname}:${server.port}/swagger
`);
process.stdin.resume();

module.exports = __webpack_exports__;
/******/ })()
;