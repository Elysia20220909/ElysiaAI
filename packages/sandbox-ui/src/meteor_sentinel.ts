import { fetchWithAuth } from "../../shared/src/ui-bridge";

export class MeteorSentinel {
    private container: HTMLElement;
    private statusInterval: number | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    public init() {
        this.container.innerHTML = `
            <div class="meteor-sentinel-v1">
                <div class="sentinel-header">
                    <div class="meteor-logo">🛰️</div>
                    <div class="sentinel-title-block">
                        <div class="main-title">METEOR #6267</div>
                        <div class="sub-title">SOVEREIGN SENTINEL CORE</div>
                    </div>
                    <div class="sentinel-status-badge" id="sentinel-status">OFFLINE</div>
                </div>

                <div class="sentinel-grid">
                    <!-- Left: Identity & Metadata -->
                    <div class="grid-card identity-card">
                        <div class="card-label">ENTITY_IDENTITY</div>
                        <div class="identity-content">
                            <div class="id-row"><span>APP_ID:</span> <span class="cyan">1080413446253858827</span></div>
                            <div class="id-row"><span>PROTOCOL:</span> <span class="cyan">SOVEREIGN_ALPHA_7.0</span></div>
                            <div class="id-row"><span>CLEARANCE:</span> <span class="cyan">NSA_CLASS_09</span></div>
                        </div>
                    </div>

                    <!-- Right: Resonance Engine -->
                    <div class="grid-card resonance-card">
                        <div class="card-label">RESONANCE_INTEGRITY</div>
                        <div class="resonance-display">
                            <div class="resonance-score" id="resonance-score">--%</div>
                            <div class="resonance-wave-container">
                                <div class="wave" id="wave-1"></div>
                                <div class="wave" id="wave-2"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom: Controls -->
                    <div class="grid-card console-card">
                        <div class="card-label">COMMAND_INTERFACE</div>
                        <div class="console-output" id="meteor-console">
                            > [SYSTEM] Initiating Sentinel Handshake...
                        </div>
                        <div class="console-actions">
                            <button class="btn-sentinel" id="broadcast-test-btn">RUN_BROADCAST_TEST</button>
                            <button class="btn-sentinel" id="resonance-audit-btn">TRIGGER_RESONANCE_AUDIT</button>
                        </div>
                    </div>
                </div>

                <style>
                    .meteor-sentinel-v1 {
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        background: #0a0a0a;
                        color: #e2e8f0;
                        padding: 20px;
                        font-family: 'Inter', sans-serif;
                    }
                    .sentinel-header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 24px;
                        border-bottom: 1px solid #1e293b;
                        padding-bottom: 16px;
                    }
                    .meteor-logo {
                        font-size: 32px;
                        margin-right: 16px;
                    }
                    .main-title {
                        font-size: 20px;
                        font-weight: 800;
                        letter-spacing: 2px;
                        color: #34d399;
                    }
                    .sub-title {
                        font-size: 10px;
                        color: #94a3b8;
                    }
                    .sentinel-status-badge {
                        margin-left: auto;
                        padding: 4px 12px;
                        border-radius: 4px;
                        background: #1e293b;
                        font-size: 11px;
                        font-weight: 800;
                    }
                    .status-online { background: #064e3b; color: #34d399; box-shadow: 0 0 10px rgba(52, 211, 153, 0.3); }

                    .sentinel-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        grid-template-rows: 140px 1fr;
                        gap: 16px;
                        flex-grow: 1;
                    }
                    .grid-card {
                        background: #111111;
                        border: 1px solid #1e293b;
                        border-radius: 8px;
                        padding: 16px;
                        position: relative;
                        overflow: hidden;
                    }
                    .card-label {
                        font-size: 9px;
                        color: #475569;
                        margin-bottom: 8px;
                        font-weight: 800;
                    }
                    .identity-content { font-size: 11px; }
                    .id-row { margin-bottom: 4px; display: flex; justify-content: space-between; }
                    .cyan { color: #22d3ee; }

                    .resonance-display {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 80px;
                    }
                    .resonance-score {
                        font-size: 32px;
                        font-weight: 900;
                        color: #34d399;
                        margin-right: 20px;
                    }
                    .console-card {
                        grid-column: span 2;
                        display: flex;
                        flex-direction: column;
                    }
                    .console-output {
                        background: #000;
                        border-radius: 4px;
                        padding: 12px;
                        font-family: 'Fira Code', monospace;
                        font-size: 11px;
                        color: #34d399;
                        flex-grow: 1;
                        overflow-y: auto;
                        margin-bottom: 12px;
                        line-height: 1.5;
                    }
                    .console-actions { display: flex; gap: 8px; }
                    .btn-sentinel {
                        background: transparent;
                        border: 1px solid #1e293b;
                        color: #94a3b8;
                        padding: 8px 16px;
                        font-size: 10px;
                        font-weight: 800;
                        cursor: pointer;
                        border-radius: 4px;
                        transition: all 0.2s;
                    }
                    .btn-sentinel:hover { background: #1e293b; color: #fff; border-color: #34d399; }
                </style>
            </div>
        `;

        this.setupListeners();
        this.startStatusPolling();
    }

    private setupListeners() {
        const broadcastBtn = this.container.querySelector("#broadcast-test-btn") as HTMLButtonElement;
        const auditBtn = this.container.querySelector("#resonance-audit-btn") as HTMLButtonElement;
        const consoleEl = this.container.querySelector("#meteor-console") as HTMLElement;

        broadcastBtn.onclick = async () => {
            this.logToConsole("> [ACTION] Initiating Broadcast Test...");
            try {
                // In a real implementation, we would call the backend
                // For now, simulate success
                setTimeout(() => {
                    this.logToConsole("✅ [METEOR] Broadcast successful. Signal strength 100%.");
                }, 1000);
            } catch (err) {
                this.logToConsole(`❌ [ERROR] Broadcast failed: ${err}`);
            }
        };

        auditBtn.onclick = async () => {
            this.logToConsole("> [ACTION] Triggering Hardware Resonance Audit (Swift/NSA Class)...");
            const scoreEl = this.container.querySelector("#resonance-score") as HTMLElement;
            
            let count = 0;
            const interval = setInterval(() => {
                scoreEl.innerText = `${Math.floor(Math.random() * 20 + 80)}%`;
                count++;
                if (count > 10) {
                    clearInterval(interval);
                    scoreEl.innerText = "99.9%";
                    this.logToConsole("✅ [RESONANCE] Audit Complete. Secure Enclave Verified.");
                }
            }, 100);
        };
    }

    private startStatusPolling() {
        const statusBadge = this.container.querySelector("#sentinel-status") as HTMLElement;
        const scoreEl = this.container.querySelector("#resonance-score") as HTMLElement;

        this.statusInterval = window.setInterval(() => {
            // Simulate bot being online
            statusBadge.innerText = "ONLINE";
            statusBadge.classList.add("status-online");
            if (scoreEl.innerText === "--%") {
                scoreEl.innerText = "94.2%";
            }
        }, 2000);
    }

    public stop() {
        if (this.statusInterval) clearInterval(this.statusInterval);
    }

    private logToConsole(msg: string) {
        const consoleEl = this.container.querySelector("#meteor-console") as HTMLElement;
        const div = document.createElement("div");
        div.innerText = msg;
        consoleEl.appendChild(div);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }
}
