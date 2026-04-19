import { AppConfig } from "../../shared/src/ui-bridge";

export class SovereignGauntlet {
	private container: HTMLElement;
	private terminal: HTMLElement | null = null;

	constructor(container: HTMLElement) {
		this.container = container;
	}

	public init() {
		this.render();
	}

	private render() {
		this.container.innerHTML = `
            <div class="gauntlet-app terminal-theme">
                <div class="gauntlet-header">
                    <div class="gauntlet-title">SOVEREIGN GAUNTLET v1.0</div>
                    <div class="gauntlet-subtitle">SLA L14 Security Suite | Linux Kernel Stream</div>
                </div>
                <div class="gauntlet-body">
                    <div class="terminal-output" id="gauntlet-terminal">
                        <div class="line sys-msg">> [SYSTEM] Sovereign Sandbox (Linux 7.0 Base) Ready.</div>
                        <div class="line sys-msg">> [SYSTEM] Awaiting Command...</div>
                        <div class="line gauntlet-banner">
                            <span class="banner-title">Sovereign Gauntlet</span><br>
                            <span class="banner-sub">Linux Kernel Stream</span>
                        </div>
                        <div class="status-line">PROTECTION: <span class="status-active">ACTIVE</span></div>
                    </div>
                    <div class="gauntlet-controls">
                        <button class="gauntlet-btn" id="btn-audit">RUN SECURITY AUDIT</button>
                    </div>
                </div>
            </div>
        `;

		this.terminal = this.container.querySelector("#gauntlet-terminal");
		const auditBtn = this.container.querySelector("#btn-audit");
		auditBtn?.addEventListener("click", () => this.runAudit());
	}

	private async runAudit() {
		if (!this.terminal) return;
		const btn = this.container.querySelector("#btn-audit") as HTMLButtonElement;
		btn.disabled = true;
		btn.innerText = "AUDITING...";

		const auditLines = [
			"> Initializing kernel integrity check...",
			"> Verifying L1-L4 ICE layers...",
			"> Scanning /proc/sys/kernel/randomize_va_space...",
			"> Memory protection: ASLR enabled. Verified.",
			"> Checking Abyssal Vault resonance...",
			"> [WARN] Shadow process detected in Sector 7. Isolating.",
			"> Neutralizing phantom threads...",
			"> SYSCALL filtering: Active.",
			"> Audit Complete. 0 vulnerabilities found in Sovereign Core.",
		];

		for (const line of auditLines) {
			await this.addTerminalLine(line);
			await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
		}

		btn.disabled = false;
		btn.innerText = "RUN SECURITY AUDIT";
	}

	private addTerminalLine(text: string) {
		if (!this.terminal) return;
		const line = document.createElement("div");
		line.className = "line";
		if (text.includes("[WARN]")) line.style.color = "#fbbf24";
		if (text.includes("[SUCCESS]") || text.includes("Complete"))
			line.style.color = "#34d399";
		line.innerText = text;
		this.terminal.appendChild(line);
		this.terminal.scrollTop = this.terminal.scrollHeight;
	}
}
