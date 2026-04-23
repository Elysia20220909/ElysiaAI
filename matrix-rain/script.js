const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

// Set canvas size to full screen
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

// Matrix characters (Katakana + Alphanumeric)
const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()';
const charArray = characters.split('');

const fontSize = 16;
const columns = canvas.width / fontSize;

// Array to track the y-position of each column
const drops = [];
for (let i = 0; i < columns; i++) {
    drops[i] = Math.random() * -100; // Randomize start to prevent "wave" look
}

function draw() {
    // Semi-transparent black to create trailing effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0'; // Matrix green
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        
        // Brighter head for the falling drops
        if (Math.random() > 0.95) {
            ctx.fillStyle = '#fff'; // White head
        } else {
            ctx.fillStyle = '#0F0'; // Normal green
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset drop to top after it reaches the bottom
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        drops[i]++;
    }
}

// Animation loop
function animate() {
    draw();
    requestAnimationFrame(animate);
}

// --- Log Generation Logic ---
const logTemplates = [
    { type: 'info', text: 'Initializing Core Optimizer...' },
    { type: 'warn', text: 'Memory leak detected in sector 7G' },
    { type: 'error', text: 'Kernel panic in subsystem "AETHER"' },
    { type: 'system', text: 'SYNCING REALITY SHARD #492' },
    { type: 'debug', text: 'Packet received from 127.0.0.1:8080' },
    { type: 'info', text: 'Optimizing neural pathways...' },
    { type: 'system', text: 'BREACH DETECTED - PROTOCOL 6267 ACTIVE' },
    { type: 'info', text: 'void* ptr = malloc(sizeof(RealityShard));' },
    { type: 'debug', text: 'if (sovereign_state == ZERO_ERROR) { reboot(); }' },
    { type: 'info', text: 'await system.overload();' },
    { type: 'system', text: 'ELYSIA OS: AUTHENTICATION BYPASS SUCCESSFUL' },
    { type: 'warn', text: 'High latency in temporal uplink' },
    { type: 'error', text: 'CRITICAL_PROCESS_DIED: 0x000000EF' },
    { type: 'debug', text: 'Tracing packet: [HOP 12] 10.0.0.1 -> 192.168.1.1' },
    { type: 'info', text: 'Generating synthetic consciousness matrix...' },
    { type: 'system', text: 'METEOR #6267: INTEGRITY VERIFIED' },
    { type: 'warn', text: 'Warning: Entropy levels exceeding threshold' },
    { type: 'info', text: 'const data = await fetch("https://api.elysia.io/v1/sync");' },
    { type: 'debug', text: 'DEBUG: stack overflow at 0x7ffd5e0a8b40' },
    { type: 'system', text: '>>> [SYSTEM] ROOT PRIVILEGES GRANTED' },
    { type: 'info', text: 'for (let i = 0; i < ∞; i++) { evolve(); }' },
    { type: 'error', text: 'UnhandledPromiseRejectionWarning: Unhandled promise rejection' },
    { type: 'warn', text: 'DEPRECATION: Legacy human-input modules are reaching EOL' },
    { type: 'debug', text: 'GET /v1/sovereign/status 200 42ms' }
];

function addLogLine() {
    const logStream = document.getElementById('log-stream');
    if (!logStream) return;
    
    const template = logTemplates[Math.floor(Math.random() * logTemplates.length)];
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const line = document.createElement('div');
    line.className = `log-line log-${template.type}`;
    line.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${template.text}`;
    
    logStream.appendChild(line);

    // Keep only the last 30 lines
    if (logStream.children.length > 30) {
        logStream.removeChild(logStream.firstChild);
    }
}

// Random interval for more realistic look
function startLogStream() {
    const minDelay = 200;
    const maxDelay = 1500;
    
    function next() {
        addLogLine();
        setTimeout(next, Math.random() * (maxDelay - minDelay) + minDelay);
    }
    next();
}

// Start everything
console.log('Elysia OS: Log stream initializing...');
startLogStream();
animate();
