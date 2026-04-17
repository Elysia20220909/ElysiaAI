/**
 * ELYSIA OS | NANOTECH SOVEREIGN SUIT (NSS-01)
 * PILOT INTERFACE & NANITE ORCHESTRATOR
 */

class NaniteSystem {
    constructor() {
        this.unitCount = 1400000000; // 1.4 Billion Nanites
        this.repairRate = 250000;
        this.energyLevel = 100.0;
        this.isAssembling = true;
        
        this.vitals = {
            heartRate: 72,
            oxygen: 98.4,
            stability: 1.0,
            temp: 36.5
        };

        this.init();
    }

    init() {
        this.startSimulation();
        this.initScanner();
        this.initParticleBackground();
        this.startClock();
        this.initTerminal();
    }

    initTerminal() {
        const input = document.getElementById('terminal-input');
        const output = document.getElementById('terminal-output');

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value;
                this.handleCommand(cmd, output);
                input.value = '';
            }
        });
    }

    handleCommand(cmd, output) {
        const line = document.createElement('div');
        line.textContent = `> ${cmd}`;
        output.appendChild(line);

        const response = document.createElement('div');
        response.style.color = 'var(--suit-gold)';
        
        switch (cmd.toLowerCase()) {
            case 'help':
                response.textContent = '[SYSTEM] Available: status, repair, scan, reboot, upgrade';
                break;
            case 'status':
                response.textContent = `[SYSTEM] Energy: ${this.energyLevel.toFixed(1)}% | Nanites: ${this.unitCount} | Pilot: Stable`;
                break;
            case 'repair':
                response.textContent = '[SYSTEM] Initiating molecular rebonding...';
                this.energyLevel = 100;
                break;
            case 'upgrade':
                response.textContent = '[SYSTEM] PowerShell successfully purged. Upgrading to Neural Bun Cluster...';
                break;
            default:
                response.textContent = `[SYSTEM] Unknown signal: ${cmd}`;
        }
        
        output.appendChild(response);
        output.scrollTop = output.scrollHeight;
    }

    startClock() {
        const clockEl = document.getElementById('real-time-clock');
        setInterval(() => {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString('ja-JP', { hour12: false });
        }, 1000);
    }

    startSimulation() {
        setInterval(() => {
            // Simulate Vital Sign fluctuations
            this.vitals.heartRate = 68 + Math.floor(Math.random() * 8);
            this.vitals.stability = (0.9995 + Math.random() * 0.0005).toFixed(4);
            this.vitals.temp = (36.4 + Math.random() * 0.4).toFixed(1);
            
            this.updateUI();
        }, 1000);

        // Energy drain simulation
        setInterval(() => {
            this.energyLevel -= 0.005;
            if (this.energyLevel < 0) this.energyLevel = 100;
        }, 500);
    }

    updateUI() {
        document.getElementById('heart-rate').textContent = `${this.vitals.heartRate} BPM`;
        document.getElementById('stability').textContent = this.vitals.stability;
        const tempEl = document.getElementById('temp');
        tempEl.textContent = `${this.vitals.temp}°C`;
        
        if (this.vitals.temp > 36.8) {
            tempEl.classList.add('text-danger');
        } else {
            tempEl.classList.remove('text-danger');
        }
        
        const nanoWave = document.getElementById('nano-wave');
        const percentage = (this.energyLevel).toFixed(1);
        nanoWave.style.height = `${percentage}%`;
        
        // Randomize nanite count slightly
        const currentCount = (this.unitCount + (Math.random() - 0.5) * 500000) / 1000000000;
        document.getElementById('nano-count').textContent = `${currentCount.toFixed(3)}B UNITS`;
    }

    initScanner() {
        const canvas = document.getElementById('scanner-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 320;
        canvas.height = 320;

        const targets = Array.from({ length: 6 }, () => ({
            angle: Math.random() * Math.PI * 2,
            dist: 40 + Math.random() * 100,
            speed: (Math.random() - 0.5) * 0.015,
            label: `OBJ_${Math.floor(Math.random() * 9999)}`
        }));

        let scanAngle = 0;

        const drawScanner = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const cx = 160, cy = 160;

            // Draw Grid Rings
            ctx.strokeStyle = 'rgba(0, 242, 255, 0.08)';
            ctx.lineWidth = 1;
            for (let r = 40; r <= 140; r += 40) {
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw Crosshair
            ctx.beginPath();
            ctx.moveTo(cx - 150, cy); ctx.lineTo(cx + 150, cy);
            ctx.moveTo(cx, cy - 150); ctx.lineTo(cx, cy + 150);
            ctx.stroke();

            // Draw Sweep
            scanAngle += 0.04;
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, 'rgba(0, 242, 255, 0.15)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, 150, scanAngle, scanAngle + 0.6);
            ctx.fill();

            // Draw Targets
            targets.forEach(t => {
                t.angle += t.speed;
                const tx = cx + Math.cos(t.angle) * t.dist;
                const ty = cy + Math.sin(t.angle) * t.dist;
                
                // Pulsing target
                const pulse = Math.sin(Date.now() * 0.005) * 2 + 3;
                ctx.fillStyle = '#ff1a1a';
                ctx.beginPath();
                ctx.arc(tx, ty, pulse, 0, Math.PI * 2);
                ctx.fill();
                
                // Label
                ctx.fillStyle = 'white';
                ctx.font = '600 9px Outfit';
                ctx.fillText(t.label, tx + 12, ty + 3);
            });

            requestAnimationFrame(drawScanner);
        };
        drawScanner();
    }

    initParticleBackground() {
        const container = document.body;
        for (let i = 0; i < 80; i++) {
            const p = document.createElement('div');
            p.className = 'nanite-particle';
            this.resetParticle(p);
            container.appendChild(p);
            this.animateParticle(p);
        }
    }

    resetParticle(p) {
        p.style.left = Math.random() * 100 + 'vw';
        p.style.top = Math.random() * 100 + 'vh';
        p.style.opacity = Math.random() * 0.6;
        p.speedX = (Math.random() - 0.5) * 1.5;
        p.speedY = (Math.random() - 0.5) * 1.5;
        const size = Math.random() * 3 + 1;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
    }

    animateParticle(p) {
        let x = parseFloat(p.style.left);
        let y = parseFloat(p.style.top);

        const move = () => {
            x += p.speedX;
            y += p.speedY;

            if (x < 0) x = 100; if (x > 100) x = 0;
            if (y < 0) y = 100; if (y > 100) y = 0;

            p.style.left = x + 'vw';
            p.style.top = y + 'vh';

            requestAnimationFrame(move);
        };
        move();
    }
}

// Subsystem: Neural Interface
class NeuralBridge {
    constructor() {
        this.latency = 0.0001;
        this.synapseCount = 86000000000;
    }

    async calibrate() {
        const consoleStyle = "color: #00f2ff; font-weight: bold; text-shadow: 0 0 5px rgba(0,242,255,0.5)";
        console.log("%c[NEURAL] Initiating high-bandwidth synaptic sync...", consoleStyle);
        
        const steps = ["Mapping Cortex", "Stabilizing Latency", "Injecting Nanites", "Verifying Link"];
        for (let step of steps) {
            await new Promise(r => setTimeout(r, 600));
            console.log(`%c[NEURAL] ${step}... OK`, "color: #ffcc00");
        }
        
        console.log("%c[NEURAL] SYNC COMPLETE. PILOT AUTHORIZED.", "color: #00f2ff; font-size: 1.2rem");
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log("%cElysia OS | Nanotech Suit v1.2.0-ULTRA ONLINE", "color: #00f2ff; font-weight: 900;");
    
    const suit = new NaniteSystem();
    const neural = new NeuralBridge();
    
    // Simulate initial HUD startup delay
    setTimeout(() => {
        neural.calibrate();
    }, 1000);
});
