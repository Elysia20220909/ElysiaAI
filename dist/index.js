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
/************************************************************************/
var __webpack_exports__ = {};
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ src)
});

;// external "@elysiajs/cors"
const cors_namespaceObject = require("@elysiajs/cors");
;// external "@elysiajs/html"
const html_namespaceObject = require("@elysiajs/html");
;// external "@elysiajs/static"
const static_namespaceObject = require("@elysiajs/static");
;// external "axios"
const external_axios_namespaceObject = require("axios");
var external_axios_default = /*#__PURE__*/__webpack_require__.n(external_axios_namespaceObject);
;// external "elysia"
const external_elysia_namespaceObject = require("elysia");
;// external "sanitize-html"
const external_sanitize_html_namespaceObject = require("sanitize-html");
var external_sanitize_html_default = /*#__PURE__*/__webpack_require__.n(external_sanitize_html_namespaceObject);
;// ./src/index.ts






// ==================== 定数定義 ====================
const CONFIG = {
    PORT: 3000,
    RAG_API_URL: "http://127.0.0.1:8000/rag",
    RAG_TIMEOUT: 5000,
    MODEL_NAME: "llama3.2",
    MAX_REQUESTS_PER_MINUTE: 60,
    ALLOWED_ORIGINS: ["http://localhost:3000"],
    DANGEROUS_KEYWORDS: ["eval", "exec", "system", "drop", "delete", "<script"],
};
// レート制限用マップ（簡易実装）
const requestCounts = new Map();
// ==================== ヘルパー関数 ====================
/**
 * 簡易レート制限チェック（IP/識別子ベース）
 */
function checkRateLimit(identifier) {
    const now = Date.now();
    const record = requestCounts.get(identifier);
    if (!record || now > record.resetTime) {
        requestCounts.set(identifier, { count: 1, resetTime: now + 60000 });
        return true;
    }
    if (record.count >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
        return false;
    }
    record.count++;
    return true;
}
/**
 * 危険キーワード検出
 */
function containsDangerousKeywords(text) {
    const lowerText = text.toLowerCase();
    return CONFIG.DANGEROUS_KEYWORDS.some((kw) => lowerText.includes(kw));
}
// ==================== Elysiaアプリ ====================
const app = new external_elysia_namespaceObject.Elysia()
    .use((0,cors_namespaceObject.cors)({
    origin: CONFIG.ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
}))
    .use((0,html_namespaceObject.html)())
    .use((0,static_namespaceObject.staticPlugin)({ assets: "public", prefix: "" }))
    // ロギングミドルウェア
    .onRequest(({ request }) => {
    const timestamp = new Date().toISOString();
    const method = request.method;
    const url = new URL(request.url).pathname;
    console.log(`[${timestamp}] ${method} ${url}`);
})
    // ルート: メインHTML配信
    .get("/", () => Bun.file("public/index.html"))
    // エンドポイント: Elysiaとのチャット(ストリーミング)
    .post("/elysia-love", async ({ body, request }) => {
    const { messages } = body;
    // レート制限チェック（簡易：IP取得困難なのでタイムスタンプベース）
    const clientId = request.headers.get("x-forwarded-for") || "anonymous";
    if (!checkRateLimit(clientId)) {
        console.warn(`[Security] Rate limit exceeded: ${clientId}`);
        throw new Error("にゃん♡ おにいちゃん、ちょっと急ぎすぎだよぉ〜？ 少し休憩しよ？");
    }
    // メッセージ内容をサニタイズ
    const sanitizedMessages = messages.map((m) => {
        const cleaned = external_sanitize_html_default()(m.content, {
            allowedTags: [],
            allowedAttributes: {},
        });
        // 危険キーワードチェック
        if (containsDangerousKeywords(cleaned)) {
            console.warn(`[Security] Dangerous keyword detected: ${cleaned}`);
            throw new Error("にゃん♡ いたずらはダメだよぉ〜？ エリシアちゃん怒るよ？");
        }
        return { role: m.role, content: cleaned };
    });
    // FastAPI /chat エンドポイントを直接呼び出し（Ollama統合済み）
    try {
        const response = await external_axios_default().post("http://127.0.0.1:8000/chat", {
            messages: sanitizedMessages,
            stream: true,
        }, {
            responseType: "stream",
            timeout: 60000,
        });
        // ストリーミングレスポンスをそのまま返す
        return new Response(response.data, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    }
    catch (error) {
        console.error("[Chat] Error:", error);
        if (external_axios_default().isAxiosError(error) && error.response?.status === 503) {
            throw new Error("Ollama service is not available. Please start Ollama: ollama serve");
        }
        throw error;
    }
}, {
    body: external_elysia_namespaceObject.t.Object({
        messages: external_elysia_namespaceObject.t.Array(external_elysia_namespaceObject.t.Object({
            role: external_elysia_namespaceObject.t.Union([external_elysia_namespaceObject.t.Literal("user"), external_elysia_namespaceObject.t.Literal("assistant")]),
            content: external_elysia_namespaceObject.t.String({
                maxLength: 500,
                minLength: 1,
                // 安全な文字のみ許可（英数字、日本語、基本記号、絵文字）
                pattern: "^[a-zA-Z0-9\\s\\p{L}\\p{N}\\p{P}\\p{S}♡♪〜！？。、]+$",
            }),
        }), { maxItems: 10 }),
    }),
})
    .listen(CONFIG.PORT);
// ==================== サーバー起動メッセージ ====================
console.log(`
${"+".repeat(60)}
✨ Elysia AI Server Started! ✨
${"+".repeat(60)}
🌸 ฅ(՞៸៸> ᗜ <៸៸՞)ฅ エリシアちゃんRAG-Milvus完成♡

📡 Server: http://localhost:${CONFIG.PORT}
🔮 RAG API: ${CONFIG.RAG_API_URL}
🤖 LLM Model: ${CONFIG.MODEL_NAME}

💡 Usage:
   1. FastAPI起動 → python python/fastapi_server.py
   2. このサーバー起動 → bun run src/index.ts
   3. ブラウザアクセス → http://localhost:${CONFIG.PORT}
${"+".repeat(60)}
`);
/* harmony default export */ const src = (app);

module.exports = __webpack_exports__;
/******/ })()
;