/**
 * Elysia OS - Quantum Neural Core Orchestrator
 * This script handles the complex real-time visualization and logic for the Swarm Nucleus.
 */

class NeuralNucleus {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.connections = [];
        this.numNodes = 60;
        this.maxDistance = 150;
        this.mouse = { x: null, y: null };
        this.hoveredNode = null;

        this.init();
        this.animate();
        this.setupListeners();
    }

    init() {
        this.resize();
        for (let i = 0; i < this.numNodes; i++) {
            this.nodes.push({
                id: Math.random().toString(16).slice(2, 8).toUpperCase(),
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                radius: Math.random() * 3 + 2,
                potential: Math.random(),
                pulse: 0
            });
        }
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    setupListeners() {
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw connections
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dx = this.nodes[i].x - this.nodes[j].x;
                const dy = this.nodes[i].y - this.nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.maxDistance) {
                    const alpha = 1 - (dist / this.maxDistance);
                    this.ctx.strokeStyle = `rgba(0, 242, 255, ${alpha * 0.2})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
                    this.ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
                    this.ctx.stroke();
                }
            }
        }

        // Update and draw nodes
        this.hoveredNode = null;
        this.nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;

            // Boundary bounce
            if (node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.canvas.height) node.vy *= -1;

            // Mouse interaction
            if (this.mouse.x) {
                const mdx = node.x - this.mouse.x;
                const mdy = node.y - this.mouse.y;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < 30) {
                    this.hoveredNode = node;
                }
            }

            // Pulse effect
            node.pulse += 0.05;
            const pulseRadius = node.radius + Math.sin(node.pulse) * 2;

            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = 'rgba(0, 242, 255, 0.5)';
            this.ctx.fillStyle = node === this.hoveredNode ? '#ff00c8' : '#00f2ff';
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });

        this.updateNodeInfo();
    }

    updateNodeInfo() {
        const infoPanel = document.getElementById('node-info');
        if (this.hoveredNode) {
            document.getElementById('node-id').textContent = this.hoveredNode.id;
            document.getElementById('node-pot').textContent = this.hoveredNode.potential.toFixed(4);
            infoPanel.style.opacity = '1';
        } else {
            infoPanel.style.opacity = '0';
        }
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

class TransmissionEngine {
    constructor(feedId) {
        this.feed = document.getElementById(feedId);
        this.messages = [
            "Synchronizing Ghost Protocol layers...",
            "Encrypting soul shard hash: 0x82...FA",
            "Swarm Nucleus expansion detected.",
            "Handshaking with Agent 'Guardian-7'.",
            "Latency jitter at 0.04ms. Stabilizing.",
            "Intercepting rogue data packet...",
            "Aegis Ledger updated successfully.",
            "Neural synaptic pathway re-routed.",
            "Quantum entanglement verified at Sector 7.",
            "DeepMind heuristic audit complete: 99.8% match."
        ];
        this.types = ['info', 'info', 'info', 'warn', 'info', 'error', 'info', 'info', 'info', 'info'];
        this.start();
    }

    addLog(text, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const time = new Date().toLocaleTimeString('ja-JP', { hour12: false });
        const ms = String(new Date().getMilliseconds()).padStart(3, '0');
        entry.innerHTML = `<span class="timestamp">[${time}.${ms}]</span> ${text}`;
        
        this.feed.insertBefore(entry, this.feed.firstChild);
        if (this.feed.childNodes.length > 50) {
            this.feed.removeChild(this.feed.lastChild);
        }
    }

    start() {
        setInterval(() => {
            if (Math.random() > 0.7) {
                const idx = Math.floor(Math.random() * this.messages.length);
                this.addLog(this.messages[idx], this.types[idx]);
            }
        }, 800);
    }
}

class SystemVitals {
    constructor() {
        this.loadBar = document.getElementById('load-bar');
        this.entropyBar = document.getElementById('entropy-bar');
        this.cohesionBar = document.getElementById('cohesion-bar');
        this.agentList = document.getElementById('agent-list');
        this.agents = ['Guardian-7', 'Shield-X', 'Observer-Alpha', 'Harbinger', 'Nexus-Prime'];
        
        this.init();
        this.update();
    }

    init() {
        this.agents.forEach(agent => {
            const div = document.createElement('div');
            div.className = 'log-entry info';
            div.style.fontSize = '0.7rem';
            div.innerHTML = `<span class="accent-cyan">●</span> ${agent} - <span class="accent-purple">ACTIVE</span>`;
            this.agentList.appendChild(div);
        });
    }

    update() {
        setInterval(() => {
            const load = 70 + Math.random() * 20;
            const entropy = 30 + Math.random() * 15;
            const cohesion = 90 + Math.random() * 8;

            this.loadBar.style.width = `${load}%`;
            this.entropyBar.style.width = `${entropy}%`;
            this.cohesionBar.style.width = `${cohesion}%`;
        }, 2000);
    }
}

class TerminalOrchestrator {
    constructor() {
        this.input = document.getElementById('cmd-input');
        this.output = document.getElementById('terminal-output');
        this.setupListeners();
    }

    setupListeners() {
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const cmd = this.input.value;
                this.execute(cmd);
                this.input.value = '';
            }
        });
    }

    print(text, type = 'SYSTEM') {
        const line = document.createElement('div');
        line.innerHTML = `<span class="accent-purple">[${type}]</span> ${text}`;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    }

    execute(cmd) {
        this.print(cmd, 'USER');
        
        setTimeout(() => {
            const cleanCmd = cmd.toLowerCase().trim();
            if (cleanCmd === 'help') {
                this.print('Available: status, swarm, ghost, purge, clear');
            } else if (cleanCmd === 'status') {
                this.print('All systems operational. Neural Core at 89% capacity.');
            } else if (cleanCmd === 'swarm') {
                this.print('Syncing 4,096 distributed agents across mesh network...');
            } else if (cleanCmd === 'clear') {
                this.output.innerHTML = '';
            } else {
                this.print(`Command not found: ${cmd}`, 'ERROR');
            }
        }, 300);
    }
}

// Global Clock
function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString('ja-JP', { hour12: false });
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    document.getElementById('clock').textContent = `${time}.${ms}`;
    requestAnimationFrame(updateClock);
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log("%c ELYSIA QUANTUM CORE INITIALIZED ", "background: #00f2ff; color: #000; font-weight: bold;");
    
    const nucleus = new NeuralNucleus('neural-canvas');
    const transmissions = new TransmissionEngine('log-feed');
    const vitals = new SystemVitals();
    const terminal = new TerminalOrchestrator();
    
    updateClock();
});
