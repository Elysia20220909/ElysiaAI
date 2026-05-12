(() => {
    const cookieNames = {
        csrf: "elysia_csrf_token",
    };

    const loginForm = requireElement("login-form", HTMLFormElement);
    const usernameInput = requireElement("username", HTMLInputElement);
    const passwordInput = requireElement("password", HTMLInputElement);
    const button = requireElement("login-btn", HTMLButtonElement);
    const errorMessage = requireElement("error-msg", HTMLDivElement);
    const coreStatus = document.querySelector(".core-status");
    const tokenLattice = requireElement("token-lattice", HTMLElement);
    const intrusionSentinel = requireElement("intrusion-sentinel", HTMLElement);
    const signatureHash = requireElement("signature-hash", HTMLElement);
    const buttonText = button.querySelector(".btn-text");

    let csrfToken = readCookie(cookieNames.csrf);

    function requireElement(id, expectedType) {
        const element = document.getElementById(id);
        if (!(element instanceof expectedType)) {
            throw new Error(`Missing element: ${id}`);
        }
        return element;
    }

    function readCookie(name) {
        const cookie = document.cookie
            .split(";")
            .map((part) => part.trim())
            .find((part) => part.startsWith(`${name}=`));
        if (!cookie) return null;
        return decodeURIComponent(cookie.slice(name.length + 1));
    }

    function csrfHeaders() {
        csrfToken = readCookie(cookieNames.csrf) || csrfToken;
        return csrfToken ? { "x-csrf-token": csrfToken } : {};
    }

    async function requestJson(url, init = {}) {
        const method = init.method || "GET";
        const headers = new Headers(init.headers || {});
        if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
            for (const [key, value] of Object.entries(csrfHeaders())) {
                headers.set(key, value);
            }
        }

        const response = await fetch(url, {
            ...init,
            method,
            credentials: "same-origin",
            headers,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || "認証に失敗しました");
        }
        if (typeof data.csrfToken === "string") {
            csrfToken = data.csrfToken;
        }
        return data;
    }

    function setButtonLabel(label) {
        if (buttonText) buttonText.textContent = label;
    }

    function setStatus(text, linked = false) {
        if (!coreStatus) return;
        coreStatus.textContent = text;
        coreStatus.classList.toggle("is-linked", linked);
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.hidden = false;
        setStatus("接続できませんでした。入力を確かめてください。");
    }

    function clearError() {
        errorMessage.textContent = "";
        errorMessage.hidden = true;
    }

    function clearLegacyTokenStorage() {
        localStorage.removeItem("elysia_access_token");
        localStorage.removeItem("elysia_refresh_token");
    }

    function markLinkEstablished(username) {
        tokenLattice.textContent = "保護中";
        intrusionSentinel.textContent = "静穏";
        setButtonLabel("接続しました");
        setStatus(`${username} として接続しました。`, true);
        localStorage.setItem("elysia_chat_user", username);
        clearLegacyTokenStorage();
    }

    async function refreshNeuralStatus() {
        const session = await requestJson("/auth/session");
        if (!session.authenticated) return;

        const status = await requestJson("/api/neural-auth/status");
        tokenLattice.textContent = status.status || "linked";
        intrusionSentinel.textContent =
            status.intrusionDetection?.status || "watching";
        signatureHash.textContent =
            status.session?.neuralSignature ||
            localStorage.getItem("elysia_neural_signature") ||
            "sealed";
        if (typeof status.session?.username === "string") {
            setStatus(`${status.session.username} として接続中です。`, true);
        }
    }

    function redirectToDesktop(delay = 900) {
        window.setTimeout(() => {
            window.location.href = "/desktop.html";
        }, delay);
    }

    async function runDevAutoLogin() {
        const params = new URLSearchParams(window.location.search);
        if (params.get("autologin") !== "test") return;

        button.disabled = true;
        setButtonLabel("接続中");
        clearError();
        setStatus("開発用セッションを確認しています。");

        try {
            const data = await requestJson("/auth/dev-login", {
                method: "POST",
                headers: { "content-type": "application/json" },
            });
            const username = data.username || "admin";
            usernameInput.value = username;
            markLinkEstablished(username);
            await refreshNeuralStatus();
            redirectToDesktop();
        } catch (error) {
            button.disabled = false;
            setButtonLabel("再試行");
            showError(error instanceof Error ? error.message : "接続できませんでした");
        }
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearError();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) {
            showError("ユーザー名とパスワードを入力してください");
            return;
        }

        button.disabled = true;
        setButtonLabel("確認中");
        setStatus("合鍵を照合しています。");

        try {
            const data = await requestJson("/auth/token", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            markLinkEstablished(data.username || username);
            await refreshNeuralStatus();
            redirectToDesktop();
        } catch (error) {
            button.disabled = false;
            setButtonLabel("ログイン");
            showError(error instanceof Error ? error.message : "認証に失敗しました");
        }
    });

    refreshNeuralStatus().catch(() => {
        tokenLattice.textContent = "待機中";
    });
    runDevAutoLogin();
})();
