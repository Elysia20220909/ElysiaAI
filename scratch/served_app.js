/**
 * ELYSIA // NEURAL LINK AUTH
 * CALIBRATION & TOKEN ACQUISITION
 */

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const errorMsg = document.getElementById('error-msg');
    const coreStatus = document.querySelector('.core-status');

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
            localStorage.setItem('elysia_access_token', data.accessToken);
            localStorage.setItem('elysia_refresh_token', data.refreshToken);
            localStorage.setItem('elysia_chat_user', username);

            // Redirect after delay
            setTimeout(() => {
                window.location.href = '/desktop.html';
            }, 1500);
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
