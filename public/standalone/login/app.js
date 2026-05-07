/**
 * ELYSIA // NEURAL LINK AUTH
 * CALIBRATION & TOKEN ACQUISITION
 */

const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const btn = document.getElementById('login-btn');
const errorMsg = document.getElementById('error-msg');
const coreStatus = document.querySelector('.core-status');
const tokenLattice = document.getElementById('token-lattice');
const intrusionSentinel = document.getElementById('intrusion-sentinel');
const signatureHash = document.getElementById('signature-hash');

function storeTokens(data, username) {
    localStorage.setItem('elysia_access_token', data.accessToken);
    localStorage.setItem('elysia_refresh_token', data.refreshToken);
    localStorage.setItem('elysia_chat_user', username);
    if (data.neuralSignature) {
        localStorage.setItem('elysia_neural_signature', data.neuralSignature);
    }
}

function markLinkEstablished(username) {
    coreStatus.textContent = `NEURAL_ID: ${username.toUpperCase()} VERIFIED`;
    coreStatus.style.color = '#34d399';
    btn.querySelector('.btn-text').textContent = 'LINK_ESTABLISHED';
    btn.style.background = '#34d399';
}

async function refreshNeuralStatus() {
    const accessToken = localStorage.getItem('elysia_access_token');
    if (!accessToken) return;

    const response = await fetch('/api/neural-auth/status', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return;

    const data = await response.json();
    tokenLattice.textContent = data.status?.toUpperCase?.() || 'LINKED';
    intrusionSentinel.textContent = data.intrusionDetection?.status?.toUpperCase?.() || 'WATCHING';
    signatureHash.textContent = data.session?.neuralSignature || localStorage.getItem('elysia_neural_signature') || 'SEALED';
}

function redirectToDesktop(delay = 900) {
    setTimeout(() => {
        window.location.href = '/desktop.html';
    }, delay);
}

async function runDevAutoLogin() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autologin') !== 'test') return;

    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'TEST_LINKING...';
    errorMsg.classList.add('hidden');
    coreStatus.textContent = 'NEURAL_ID: TEST_ENV_SCANNING...';

    try {
        const response = await fetch('/auth/dev-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Dev auto-login unavailable');
        }

        const username = data.username || 'admin';
        usernameInput.value = username;
        storeTokens(data, username);
        markLinkEstablished(username);
        await refreshNeuralStatus();
        redirectToDesktop();
    } catch (err) {
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'RETRY_LINK';
        errorMsg.textContent = `ERROR: ${err.message.toUpperCase()}`;
        errorMsg.classList.remove('hidden');
        coreStatus.textContent = 'NEURAL_ID: TEST_AUTOLOGIN_DENIED';
        coreStatus.style.color = '#ff4d4d';
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value;
    const password = passwordInput.value;

    // Start Calibration Effect
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'CALIBRATING...';
    errorMsg.classList.add('hidden');
    coreStatus.textContent = 'NEURAL_ID: SCANNING...';
    coreStatus.style.color = 'var(--core-magenta)';

    try {
        const response = await fetch('/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // SUCCESS
            coreStatus.textContent = 'NEURAL_ID: VERIFIED';
            coreStatus.style.color = '#34d399';
            btn.querySelector('.btn-text').textContent = 'LINK_ESTABLISHED';
            btn.style.background = '#34d399';

            // Store Tokens
            storeTokens(data, username);
            await refreshNeuralStatus();

            // Redirect after delay
            redirectToDesktop(1500);
        } else {
            // FAILURE
            throw new Error(data.error || 'Authentication Failed');
        }
    } catch (err) {
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'RETRY_LINK';
        errorMsg.textContent = `ERROR: ${err.message.toUpperCase()}`;
        errorMsg.classList.remove('hidden');
        coreStatus.textContent = 'NEURAL_ID: ACCESS_DENIED';
        coreStatus.style.color = '#ff4d4d';
    }
});

refreshNeuralStatus();
runDevAutoLogin();
