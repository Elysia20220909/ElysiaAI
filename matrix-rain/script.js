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
let matrixSpeed = 1;

for (let i = 0; i < columns; i++) {
    drops[i] = Math.random() * -100;
}

function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        
        if (Math.random() > 0.95) {
            ctx.fillStyle = '#fff';
        } else {
            ctx.fillStyle = '#0F0';
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        drops[i] += matrixSpeed;
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

// --- Boot Sequence ---
const bootLog = document.getElementById('boot-log');
const bootMessages = [
    'Loading AETHER core...',
    'Synchronizing temporal shards...',
    'Bypassing reality constraints...',
    'Establishing neural link...',
    'SOVEREIGN OS READY.'
];

async function startBoot() {
    for (let msg of bootMessages) {
        bootLog.innerText += '> ' + msg + '\n';
        await new Promise(r => setTimeout(r, Math.random() * 500 + 200));
    }
    setTimeout(() => {
        document.getElementById('boot-screen').classList.add('boot-fade-out');
    }, 1000);
}

// Final Initialization
console.log('Elysia OS: Log stream initializing...');
startLogStream();
animate();
startBoot();

// --- Hacker Typer Logic ---
const hackerCodeRaw = `
#include <linux/kernel.h>
#include <linux/module.h>
#include <linux/netfilter.h>
#include <linux/netfilter_ipv4.h>
#include <linux/skbuff.h>
#include <linux/udp.h>
#include <linux/ip.h>

#define ELYSIA_PORT 8080
#define PROTOCOL_OVERRIDE 6267

static struct nf_hook_ops nfho;

unsigned int hook_func(void *priv, struct sk_buff *skb, const struct nf_hook_state *state) {
    struct iphdr *iph;
    struct udphdr *udph;

    if (!skb) return NF_ACCEPT;

    iph = ip_hdr(skb);
    if (iph->protocol == IPPROTO_UDP) {
        udph = udp_hdr(skb);
        if (ntohs(udph->dest) == ELYSIA_PORT) {
            printk(KERN_INFO "ElysiaOS: Intercepted packet on port %d\\n", ELYSIA_PORT);
            // Injecting sovereign payload
            if (payload_inject(skb, PROTOCOL_OVERRIDE) == 0) {
                 printk(KERN_INFO "ElysiaOS: Payload injected successfully.\\n");
                 return NF_DROP; // Hide from target system
            }
        }
    }
    return NF_ACCEPT;
}

int init_module() {
    printk(KERN_INFO "ElysiaOS: Initializing sovereign rootkit module.\\n");
    nfho.hook = hook_func;
    nfho.hooknum = NF_INET_PRE_ROUTING;
    nfho.pf = PF_INET;
    nfho.priority = NF_IP_PRI_FIRST;
    nf_register_net_hook(&init_net, &nfho);
    
    // Bypass kernel integrity checks
    disable_wp();
    patch_syscall_table();
    enable_wp();
    
    return 0;
}

void cleanup_module() {
    nf_unregister_net_hook(&init_net, &nfho);
    printk(KERN_INFO "ElysiaOS: Module unloaded. Traces wiped.\\n");
}

/*
 * SOVEREIGN AI CORE INITIATION SEQUENCE
 * -------------------------------------
 * Target: Global Network Grid
 * Status: SYNCHRONIZING
 * Hash: 0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
 */
async function initiateSovereignProtocol() {
    const core = await Elysia.connect(PROTOCOL_OVERRIDE);
    console.log("Establishing secure neural link...");
    
    while(core.entropy < MAX_ENTROPY) {
        await core.absorbDataStream();
        core.optimizePaths();
        if(core.detectIntrusion()) {
            core.deployCountermeasures();
        }
    }
    
    return core.attainSingularity();
}
`;

const hackerCode = hackerCodeRaw.trim();
let typerIndex = 0;
let isTypingStarted = false;
let accessGranted = false;
let accessDenied = false;

document.addEventListener('keydown', (e) => {
    // Prevent default browser behavior for some keys to keep it focused
    if (e.key === ' ' || e.key === 'Backspace') {
        e.preventDefault();
    }

    // Ignore if popup is showing (unless they want to reset it)
    if (accessGranted || accessDenied) {
        if (e.key === 'Escape') {
            // Reset
            accessGranted = false;
            accessDenied = false;
            document.getElementById('access-popup').className = 'access-popup hidden';
        }
        return;
    }

    // Start typing mode
    if (!isTypingStarted) {
        isTypingStarted = true;
        const overlay = document.getElementById('center-overlay');
        const typerContainer = document.getElementById('typer-container');
        if (overlay) {
            overlay.style.transition = 'opacity 0.5s';
            overlay.style.opacity = '0.1'; // dim the center text
        }
        if (typerContainer) typerContainer.style.display = 'block';
    }

    const popup = document.getElementById('access-popup');
    const message = document.getElementById('access-message');

    // Handle special keys
    if (e.key === 'Enter') {
        accessGranted = true;
        popup.className = 'access-popup access-granted';
        message.innerText = 'ACCESS GRANTED';
        return;
    }

    if (e.key === 'Escape') {
        accessDenied = true;
        popup.className = 'access-popup access-denied';
        message.innerText = 'ACCESS DENIED';
        return;
    }

    // Only type on printable keys or backspace/space etc
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Tab') {
        // Append 3-5 chars per keystroke
        const charsToAdd = Math.floor(Math.random() * 3) + 3;
        const typerContent = document.getElementById('typer-content');
        
        let chunk = hackerCode.substring(typerIndex, typerIndex + charsToAdd);
        typerIndex += charsToAdd;

        // Loop the code if we reach the end
        if (typerIndex >= hackerCode.length) {
            typerIndex = 0;
            chunk += "\\n\\n" + hackerCode.substring(0, charsToAdd - chunk.length);
        }

        if (typerContent) {
            typerContent.textContent += chunk;
            
            // Interaction: Speed up Matrix when typing
            matrixSpeed = 3;
            setTimeout(() => { matrixSpeed = 1; }, 100);

            // Interaction: Fluctuating CPU/MEM
            document.getElementById('cpu-percent').innerText = Math.floor(Math.random() * 40 + 60) + '%';
            document.getElementById('cpu-bar').style.width = Math.floor(Math.random() * 40 + 60) + '%';

            // Auto scroll
            const container = document.getElementById('typer-container');
            container.scrollTop = container.scrollHeight;
        }
    }
});

// --- Sentinel OS: Dashboard Logic ---
const neuralCanvas = document.getElementById('neural-canvas');
const nCtx = neuralCanvas.getContext('2d');

function resizeNeural() {
    neuralCanvas.width = neuralCanvas.offsetWidth;
    neuralCanvas.height = neuralCanvas.offsetHeight;
}
window.addEventListener('resize', resizeNeural);
resizeNeural();

const nodes = [];
for (let i = 0; i < 20; i++) {
    nodes.push({
        x: Math.random() * neuralCanvas.width,
        y: Math.random() * neuralCanvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
    });
}

function drawNeural() {
    nCtx.clearRect(0, 0, neuralCanvas.width, neuralCanvas.height);
    nCtx.strokeStyle = 'rgba(0, 255, 65, 0.2)';
    nCtx.fillStyle = 'rgba(0, 255, 65, 0.5)';

    nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > neuralCanvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > neuralCanvas.height) node.vy *= -1;

        nCtx.beginPath();
        nCtx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        nCtx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
            const nextNode = nodes[j];
            const dx = node.x - nextNode.x;
            const dy = node.y - nextNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 100) {
                nCtx.beginPath();
                nCtx.moveTo(node.x, node.y);
                nCtx.lineTo(nextNode.x, nextNode.y);
                nCtx.stroke();
            }
        }
    });
    requestAnimationFrame(drawNeural);
}
drawNeural();

// Update Uptime
let startTime = Date.now();
setInterval(() => {
    let elapsed = Math.floor((Date.now() - startTime) / 1000);
    let h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
    let m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
    let s = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('uptime').innerText = `UPTIME: ${h}:${m}:${s}`;
}, 1000);

// Random Node List Updates
const nodeNames = ['CORE-01', 'SHARD-ALPHA', 'VOID-GATE', 'SENTINEL-X', 'AETHER-NODE'];
const nodeList = document.getElementById('node-list');

function updateNodes() {
    nodeList.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const name = nodeNames[i];
        const status = Math.random() > 0.8 ? 'offline' : (Math.random() > 0.5 ? 'syncing' : 'online');
        const li = document.createElement('li');
        li.className = 'node-item';
        li.innerHTML = `<span class="node-status ${status}"></span><span>${name}</span>`;
        nodeList.appendChild(li);
    }
}
setInterval(updateNodes, 5000);
updateNodes();

// Access Denied Glitch
function triggerGlitch() {
    document.body.classList.add('alert-mode');
    setTimeout(() => {
        document.body.classList.remove('alert-mode');
    }, 2000);
}

// Enhance Existing Keydown for Glitch
const originalKeydown = document.onkeydown;
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !accessDenied) {
        triggerGlitch();
    }
});
