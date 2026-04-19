import { fetchWithAuth } from "../../shared/src/ui-bridge";

export class SecurityHub {
	private container: HTMLElement;
	private timer: any;

	constructor(container: HTMLElement) {
		this.container = container;
	}

	public init() {
		this.render();
		this.startTelemetry();
	}

	private render() {
		this.container.innerHTML = `
            <div class="aegis-sentinel-hub">
                <div class="aegis-main-view">
                    <div class="aegis-hero">
                        <div class="aegis-shield-animation">
                            <div class="shield-core"></div>
                            <div class="shield-ring ring-1"></div>
                            <div class="shield-ring ring-2"></div>
                            <div class="shield-ring ring-3"></div>
                        </div>
                        <div class="aegis-status-overlay">
                            <div class="aegis-big-status">SECURE</div>
                            <div class="aegis-subtitle">SOVEREIGN CORE PROTECTED</div>
                        </div>
                    </div>

                    <div class="aegis-grid">
                        <div class="aegis-card ice-layers">
                            <h4>ICE LAYER STATUS</h4>
                            <div class="ice-list" id="ice-list">
                                <!-- Dynamic layers -->
                            </div>
                        </div>
                        <div class="aegis-card threat-map">
                            <h4>THREAT INTELLIGENCE</h4>
                            <div class="threat-log" id="threat-log">
                                <div>> [SYSTEM] Monitoring Quantum Abyss...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="aegis-sidebar">
                    <div class="sidebar-section">
                        <h4>DEFENSE PROTOCOLS</h4>
                        <button class="aegis-btn" id="btn-omega">OMEGA PROTOCOL</button>
                        <button class="aegis-btn" id="btn-mesh">MESH SYNC</button>
                    </div>
                    <div class="sidebar-section">
                        <h4>SYSTEM INTEGRITY</h4>
                        <div class="integrity-stat">QUANTUM OBSERVER: <span id="stat-observer">NEGATIVE</span></div>
                        <div class="integrity-stat">POLYMORPHIC SYNC: <span id="stat-sync">STABLE</span></div>
                        <div class="integrity-stat">HEARTBEAT: <span id="stat-heartbeat">72ms</span></div>
                    </div>
                </div>
            </div>
        `;

		this.setupEventListeners();
	}

	private setupEventListeners() {
		const omegaBtn = this.container.querySelector("#btn-omega");
		const meshBtn = this.container.querySelector("#btn-mesh");

		omegaBtn?.addEventListener("click", () => this.executeOmega());
		meshBtn?.addEventListener("click", () => this.syncMesh());
	}

	private async startTelemetry() {
		const layers = [
			{ name: "L1 White ICE", status: "ACTIVE" },
			{ name: "L3 Black ICE", status: "VIGILANT" },
			{ name: "L4 Blackwall", status: "REINFORCED" },
			{ name: "L9 Quantum Abyss", status: "ALIVE" },
			{ name: "L38 Synaptic Ctx", status: "AWAKENED" },
		];

		const iceList = this.container.querySelector("#ice-list");
		if (iceList) {
			iceList.innerHTML = layers
				.map(
					(l) => `
                <div class="ice-item">
                    <span class="ice-name">${l.name}</span>
                    <span class="ice-status status-${l.status.toLowerCase()}">${l.status}</span>
                </div>
            `,
				)
				.join("");
		}

		this.timer = setInterval(() => {
			const threatLog = this.container.querySelector("#threat-log");
			if (threatLog) {
				const logEntry = document.createElement("div");
				logEntry.innerText = `> [${new Date().toLocaleTimeString()}] PING: Node ${Math.floor(Math.random() * 255)} verified.`;
				threatLog.prepend(logEntry);
				if (threatLog.children.length > 10)
					threatLog.lastElementChild?.remove();
			}

			const heartbeat = this.container.querySelector("#stat-heartbeat");
			if (heartbeat) {
				heartbeat.innerText = `${Math.floor(Math.random() * 20 + 60)}ms`;
			}
		}, 3000);
	}

	private async executeOmega() {
		const log = this.container.querySelector("#threat-log");
		if (!log) return;

		const entry = document.createElement("div");
		entry.style.color = "var(--elysia-magenta)";
		entry.innerText = "> [CRITICAL] Initiating OMEGA PROTOCOL...";
		log.prepend(entry);

		// Simulation
		setTimeout(() => {
			const finish = document.createElement("div");
			finish.style.color = "var(--elysia-cyan)";
			finish.innerText =
				"> [SUCCESS] Omega Protocol Complete. All nodes purged.";
			log.prepend(finish);
		}, 2000);
	}

	private async syncMesh() {
		const syncStatus = this.container.querySelector("#stat-sync");
		if (syncStatus) {
			syncStatus.innerText = "SYNCING...";
			syncStatus.style.color = "var(--elysia-cyan)";
		}

		try {
			// Mock call to the new server method
			// await fetchWithAuth("/api/security/mesh/sync", { method: "POST" });

			setTimeout(() => {
				if (syncStatus) {
					syncStatus.innerText = "SYNCHRONIZED";
					syncStatus.style.color = "#34d399";
				}
			}, 1500);
		} catch (e) {
			if (syncStatus) syncStatus.innerText = "FAILED";
		}
	}

	public stop() {
		if (this.timer) clearInterval(this.timer);
	}
}
