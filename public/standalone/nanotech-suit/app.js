/**
 * ELYSIA OS | NANOTECH SOVEREIGN SUIT (NSS-01)
 * API-synchronized pilot interface and safe nanite orchestrator.
 */

class NaniteSystem {
    constructor() {
        this.token = localStorage.getItem('elysia_access_token');
        this.csrfToken = this.readCookie('elysia_csrf_token');
        this.neuralLinked = false;
        this.unitCount = 1400000000;
        this.energyLevel = 99.2;
        this.vitals = {
            heartRate: 72,
            oxygen: 98.4,
            stability: 0.9997,
            temp: 36.5,
            shield: 97.5,
        };
        this.targets = [];

        this.init();
    }

    init() {
        this.initScanner();
        this.initParticleBackground();
        this.startClock();
        this.initTerminal();
        this.initCommandButtons();
        this.syncAuthAndSuit();
        setInterval(() => this.syncTelemetry(), 2500);
        setInterval(() => this.syncDistributedOs(), 5000);
    }

    readCookie(name) {
        const cookie = document.cookie
            .split(';')
            .map((part) => part.trim())
            .find((part) => part.startsWith(`${name}=`));
        return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
    }

    headers(method = 'GET') {
        this.csrfToken = this.readCookie('elysia_csrf_token') || this.csrfToken;
        const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
        return {
            'Content-Type': 'application/json',
            ...(unsafe && this.csrfToken ? { 'x-csrf-token': this.csrfToken } : {}),
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        };
    }

    appendTerminal(text, tone = 'cyan') {
        const output = document.getElementById('terminal-output');
        const line = document.createElement('div');
        line.textContent = text;
        if (tone === 'gold') line.style.color = 'var(--suit-gold)';
        if (tone === 'danger') line.style.color = 'var(--suit-red)';
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    async syncAuthAndSuit() {
        try {
            const authResponse = await fetch('/api/neural-auth/status', {
                credentials: 'same-origin',
                headers: this.headers(),
            });
            if (!authResponse.ok) throw new Error(`auth ${authResponse.status}`);
            const auth = await authResponse.json();
            this.neuralLinked = true;
            document.getElementById('auth-status').textContent =
                `GHOST_PROTOCOL: ${auth.session.username.toUpperCase()} LINKED`;
            this.appendTerminal(`[AUTH] ${auth.session.neuralSignature} verified.`, 'gold');

            const suitResponse = await fetch('/api/suit/status', {
                credentials: 'same-origin',
                headers: this.headers(),
            });
            if (!suitResponse.ok) throw new Error(`suit ${suitResponse.status}`);
            const suit = await suitResponse.json();
            const status = suit.status || suit;
            this.applyTelemetry(status.telemetry);
            this.appendTerminal(`[NSS-01] ${status.suggestedAction}`);
            await this.syncDistributedOs(true);
        } catch (error) {
            this.neuralLinked = false;
            document.getElementById('auth-status').textContent = 'GHOST_PROTOCOL: LINK_FAILED';
            this.appendTerminal(`[LINK] ${error.message}. Use ?autologin=test on Neural Auth.`, 'danger');
        }
    }

    async syncTelemetry() {
        if (!this.neuralLinked) {
            this.localDrift();
            return;
        }

        try {
            const response = await fetch('/api/suit/telemetry', {
                credentials: 'same-origin',
                headers: this.headers(),
            });
            if (!response.ok) throw new Error(`telemetry ${response.status}`);
            const data = await response.json();
            this.applyTelemetry(data.telemetry);
        } catch {
            this.localDrift();
        }
    }

    async syncDistributedOs(announce = false) {
        if (!this.neuralLinked) {
            if (announce) this.appendTerminal('[AUTH] OS sync requires Neural Auth.', 'danger');
            return;
        }

        try {
            const response = await fetch('/api/suit/os/status', {
                credentials: 'same-origin',
                headers: this.headers(),
            });
            if (!response.ok) throw new Error(`os ${response.status}`);
            const data = await response.json();
            this.applyDistributedOs(data.os);
            if (announce) this.appendTerminal(`[OS] ${data.os.summary}`, 'gold');
        } catch (error) {
            if (announce) this.appendTerminal(`[OS] ${error.message}`, 'danger');
        }
    }

    applyDistributedOs(os) {
        if (!os) return;

        const rtosCount = os.domains.filter((domain) => domain.runtime === 'rtos_mcu').length;
        const lockCount = os.domains.filter((domain) => domain.status === 'locked').length;
        document.getElementById('os-posture').textContent = os.posture.toUpperCase();
        document.getElementById('os-status-line').textContent = `OS_POSTURE: ${os.posture.toUpperCase()}`;
        document.getElementById('os-domain-count').textContent = String(os.domains.length);
        document.getElementById('os-bus-count').textContent = String(os.edge.buses.length);
        document.getElementById('os-rtos-count').textContent = String(rtosCount);
        document.getElementById('os-lock-count').textContent = String(lockCount);

        const domainList = document.getElementById('os-domain-list');
        domainList.innerHTML = os.domains
            .slice(0, 4)
            .map((domain) => `
                <div class="domain-pill">
                    <div>
                        <strong>${this.escapeHtml(domain.label)}</strong>
                        <span>${this.escapeHtml(domain.runtime)} / ${domain.updateBudgetMs}ms</span>
                    </div>
                    <div class="domain-status">${this.escapeHtml(domain.status)}</div>
                </div>
            `)
            .join('');
    }

    async planDistributedOs(request) {
        if (!this.neuralLinked) {
            this.appendTerminal('[AUTH] OS plan rejected. Neural Auth required.', 'danger');
            return;
        }

        try {
            const response = await fetch('/api/suit/os/plan', {
                method: 'POST',
                credentials: 'same-origin',
                headers: this.headers('POST'),
                body: JSON.stringify({ request }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `os-plan ${response.status}`);
            const plan = data.plan;
            this.appendTerminal(`[OS] ${plan.matchedRequest} -> ${plan.decision}`, plan.ok ? 'gold' : 'cyan');
            for (const reason of plan.reasons.slice(0, 3)) {
                this.appendTerminal(`[OS] ${reason}`);
            }
            this.applyDistributedOs(data.os);
        } catch (error) {
            this.appendTerminal(`[OS] ${error.message}`, 'danger');
        }
    }

    applyTelemetry(telemetry) {
        this.unitCount = telemetry.naniteUnits;
        this.energyLevel = telemetry.energyLevel;
        this.vitals = {
            heartRate: telemetry.heartRate,
            oxygen: telemetry.oxygen,
            stability: telemetry.neuralStability,
            temp: telemetry.internalTemp,
            shield: telemetry.shieldIntegrity,
        };
        document.getElementById('nanite-formation').textContent = telemetry.naniteFormation.toUpperCase();
        this.updateUI();
    }

    localDrift() {
        const drift = Math.sin(Date.now() / 1800);
        this.vitals.heartRate = Math.round(72 + drift * 4);
        this.vitals.stability = Number((0.9995 + Math.random() * 0.0005).toFixed(4));
        this.vitals.temp = Number((36.4 + Math.random() * 0.4).toFixed(1));
        this.energyLevel = Math.max(0, this.energyLevel - 0.02);
        this.updateUI();
    }

    initTerminal() {
        const input = document.getElementById('terminal-input');
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            const command = input.value.trim().toLowerCase();
            input.value = '';
            this.handleCommand(command);
        });
    }

    initCommandButtons() {
        for (const button of document.querySelectorAll('[data-command]')) {
            button.addEventListener('click', () => {
                this.handleCommand(button.getAttribute('data-command'));
            });
        }
        for (const button of document.querySelectorAll('[data-plan-request]')) {
            button.addEventListener('click', () => {
                this.planDistributedOs(button.getAttribute('data-plan-request'));
            });
        }
    }

    async handleCommand(command) {
        if (!command) return;
        this.appendTerminal(`> ${command}`);

        const localCommands = new Set(['help', 'clear']);
        if (localCommands.has(command)) {
            if (command === 'clear') {
                document.getElementById('terminal-output').innerHTML = '';
                return;
            }
            this.appendTerminal('[SYSTEM] Commands: status, os, plan flight route, scan, repair, shield, cloak, calibrate, standby, clear', 'gold');
            return;
        }

        if (command === 'os') {
            await this.syncDistributedOs(true);
            return;
        }

        if (command.startsWith('plan ')) {
            await this.planDistributedOs(command.slice(5));
            return;
        }

        if (!this.neuralLinked) {
            this.appendTerminal('[AUTH] Command rejected. Neural Auth required.', 'danger');
            return;
        }

        try {
            const response = await fetch('/api/suit/command', {
                method: 'POST',
                credentials: 'same-origin',
                headers: this.headers('POST'),
                body: JSON.stringify({ command }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `command ${response.status}`);
            this.applyTelemetry(data.telemetry);
            this.appendTerminal(`[NSS-01] ${data.result}`, 'gold');
            await this.syncDistributedOs();
        } catch (error) {
            this.appendTerminal(`[NSS-01] ${error.message}`, 'danger');
        }
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    startClock() {
        const clockEl = document.getElementById('real-time-clock');
        setInterval(() => {
            clockEl.textContent = new Date().toLocaleTimeString('ja-JP', { hour12: false });
        }, 1000);
    }

    updateUI() {
        document.getElementById('heart-rate').textContent = `${this.vitals.heartRate} BPM`;
        document.getElementById('oxygen').textContent = `${this.vitals.oxygen.toFixed(1)}%`;
        document.getElementById('stability').textContent = Number(this.vitals.stability).toFixed(4);
        document.getElementById('shield-integrity').textContent = `${this.vitals.shield.toFixed(1)}%`;
        document.getElementById('energy-level').textContent = `AEGIS_ENERGY: ${this.energyLevel.toFixed(1)}%`;

        const tempEl = document.getElementById('temp');
        tempEl.textContent = `${this.vitals.temp.toFixed(1)}°C`;
        tempEl.classList.toggle('text-danger', this.vitals.temp > 36.8);

        document.getElementById('nano-wave').style.height = `${this.energyLevel.toFixed(1)}%`;
        document.getElementById('nano-count').textContent =
            `${(this.unitCount / 1000000000).toFixed(3)}B UNITS`;
    }

    initScanner() {
        const canvas = document.getElementById('scanner-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 320;
        canvas.height = 320;

        this.targets = Array.from({ length: 6 }, () => ({
            angle: Math.random() * Math.PI * 2,
            dist: 40 + Math.random() * 100,
            speed: (Math.random() - 0.5) * 0.015,
            label: `OBJ_${Math.floor(Math.random() * 9999)}`,
        }));

        let scanAngle = 0;
        const drawScanner = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const cx = 160;
            const cy = 160;

            ctx.strokeStyle = 'rgba(0, 242, 255, 0.08)';
            ctx.lineWidth = 1;
            for (let radius = 40; radius <= 140; radius += 40) {
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.moveTo(cx - 150, cy);
            ctx.lineTo(cx + 150, cy);
            ctx.moveTo(cx, cy - 150);
            ctx.lineTo(cx, cy + 150);
            ctx.stroke();

            scanAngle += 0.04;
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, 'rgba(0, 242, 255, 0.15)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, 150, scanAngle, scanAngle + 0.6);
            ctx.fill();

            for (const target of this.targets) {
                target.angle += target.speed;
                const tx = cx + Math.cos(target.angle) * target.dist;
                const ty = cy + Math.sin(target.angle) * target.dist;
                const pulse = Math.sin(Date.now() * 0.005) * 2 + 3;

                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                ctx.arc(tx, ty, pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = '600 9px Outfit';
                ctx.fillText(target.label, tx + 12, ty + 3);
            }

            requestAnimationFrame(drawScanner);
        };
        drawScanner();
    }

    initParticleBackground() {
        for (let index = 0; index < 80; index++) {
            const particle = document.createElement('div');
            particle.className = 'nanite-particle';
            this.resetParticle(particle);
            document.body.appendChild(particle);
            this.animateParticle(particle);
        }
    }

    resetParticle(particle) {
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = Math.random() * 100 + 'vh';
        particle.style.opacity = Math.random() * 0.6;
        particle.speedX = (Math.random() - 0.5) * 1.5;
        particle.speedY = (Math.random() - 0.5) * 1.5;
        const size = Math.random() * 3 + 1;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
    }

    animateParticle(particle) {
        let x = parseFloat(particle.style.left);
        let y = parseFloat(particle.style.top);

        const move = () => {
            x += particle.speedX;
            y += particle.speedY;
            if (x < 0) x = 100;
            if (x > 100) x = 0;
            if (y < 0) y = 100;
            if (y > 100) y = 0;
            particle.style.left = x + 'vw';
            particle.style.top = y + 'vh';
            requestAnimationFrame(move);
        };
        move();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('%cElysia OS | Nanotech Suit NSS-01 online', 'color: #00f2ff; font-weight: 900;');
    new NaniteSystem();
});
