/**
 * ELYSIA // SWARM NUCLEUS (PHASE 19)
 * CORE ORCHESTRATOR & VISUALIZER
 */

class SwarmNucleus {
    constructor() {
        this.canvas = document.getElementById('nucleus-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 400;
        this.coherence = 0.0;
        this.targetCoherence = 0.9984;
        
        this.resize();
        this.initParticles();
        this.bindEvents();
        this.animate();
        this.startTelemetry();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
    }

    initParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 2 + 1,
                life: Math.random(),
                hue: Math.random() > 0.8 ? 280 : 160 // Violet or Emerald
            });
        }
    }

    drawNucleus() {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const time = Date.now() * 0.001;

        // Draw central orb (The Nucleus)
        const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
        grad.addColorStop(0, 'rgba(0, 255, 170, 0.2)');
        grad.addColorStop(0.5, 'rgba(188, 0, 255, 0.05)');
        grad.addColorStop(1, 'transparent');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 250 + Math.sin(time * 2) * 20, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw Swarm Particles
        this.particles.forEach((p, i) => {
            // Attraction to center (Nucleus)
            const dx = cx - p.x;
            const dy = cy - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const force = (200 - dist) * 0.0001;

            if (dist < 300) {
                p.vx += dx * force;
                p.vy += dy * force;
            } else {
                p.vx += (Math.random() - 0.5) * 0.2;
                p.vy += (Math.random() - 0.5) * 0.2;
            }

            // Resistance
            p.vx *= 0.98;
            p.vy *= 0.98;

            p.x += p.vx;
            p.y += p.vy;

            // Draw particle
            this.ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${0.3 + p.life * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();

            // Connections (Neural Lattice)
            if (i % 10 === 0) {
                this.particles.slice(i + 1, i + 5).forEach(p2 => {
                    const d = Math.sqrt((p.x - p2.x)**2 + (p.y - p2.y)**2);
                    if (d < 100) {
                        this.ctx.strokeStyle = `rgba(0, 255, 170, ${0.1 * (1 - d/100)})`;
                        this.ctx.beginPath();
                        this.ctx.moveTo(p.x, p.y);
                        this.ctx.lineTo(p2.x, p2.y);
                        this.ctx.stroke();
                    }
                });
            }
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawNucleus();
        
        // Update Coherence Progress
        if (this.coherence < this.targetCoherence) {
            this.coherence += 0.0005;
            document.getElementById('sync-progress').style.width = (this.coherence * 100) + '%';
            document.getElementById('coherence-value').textContent = this.coherence.toFixed(4);
        } else {
            document.getElementById('nucleus-status').textContent = 'SWARM_SYNCHRONIZED';
            document.getElementById('nucleus-status').style.color = 'var(--neon-emerald)';
        }

        requestAnimationFrame(() => this.animate());
    }

    startTelemetry() {
        const stream = document.getElementById('signal-stream');
        const nodes = document.getElementById('node-count');
        let count = 0;

        setInterval(() => {
            const line = document.createElement('div');
            line.className = 'signal-line';
            const hex = Math.random().toString(16).slice(2, 10).toUpperCase();
            line.textContent = `[GHOST_${hex}] SYNC_STABLE // POS_${Math.floor(Math.random()*999)}`;
            stream.prepend(line);
            if (stream.children.length > 20) stream.removeChild(stream.lastChild);
            
            count += Math.floor(Math.random() * 10);
            nodes.textContent = count.toLocaleString();
            
            document.getElementById('void-density').textContent = (Math.random() * 100).toFixed(1) + '%';
        }, 800);

        // Clock
        setInterval(() => {
            const now = new Date();
            const ms = now.getMilliseconds().toString().padStart(3, '0');
            document.getElementById('clock').textContent = `${now.toLocaleTimeString('ja-JP', {hour12:false})}.${ms}`;
        }, 10);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new SwarmNucleus();
});
