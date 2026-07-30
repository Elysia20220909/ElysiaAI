function oobe() {
    return {
        step: 0,
        progress: 0,
        decryptStatus: 'AWAITING_INPUT',
        logs: [],
        statusMessages: ["SYSTEM_INIT", "CORE_SYNC", "ABYSS_RESURRECTED", "OMEGA_LOCK_ACTIVE"],

        // Ollama / Model properties
        kernelHost: 'http://localhost:8000',
        ollamaErrorMsg: '',
        pullProgress: 0,
        pullStatus: 'idle', // 'idle', 'pulling', 'completed', 'error'
        recommendedModel: 'llama3.2',
        totalRamGb: 16,

        init() {
            this.startDecryption();
            let interval = setInterval(() => {
                this.progress += Math.random() * 2.5;
                if (this.progress >= 100) {
                    this.progress = 100;
                    clearInterval(interval);
                    this.detectHardwareAndProceed();
                }
            }, 50);
        },

        async startDecryption() {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%#!$*";
            for(let msg of this.statusMessages) {
                for(let i=0; i<8; i++) {
                    this.decryptStatus = msg.split('').map(() => chars[Math.floor(Math.random()*chars.length)]).join('');
                    await new Promise(r => setTimeout(r, 50));
                }
                this.decryptStatus = msg;
                await new Promise(r => setTimeout(r, 600));
            }
        },

        async detectHardwareAndProceed() {
            let recommendedModel = 'llama3.2';
            let ramGb = 16;
            try {
                if (window.__TAURI__ && window.__TAURI__.core) {
                    const specs = await window.__TAURI__.core.invoke('get_system_specs');
                    if (specs && specs.total_ram_gb) {
                        ramGb = specs.total_ram_gb;
                        if (ramGb < 8) {
                            recommendedModel = 'llama3.2:1b';
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to retrieve system specs via Tauri", e);
            }
            this.recommendedModel = recommendedModel;
            this.totalRamGb = ramGb;

            await this.checkOllamaAndProceed();
        },

        async checkOllamaAndProceed() {
            try {
                const res = await fetch(`${this.kernelHost}/system/ollama/check?model=${this.recommendedModel}`);
                if (!res.ok) throw new Error("HTTP connection failed");
                const data = await res.json();

                if (data.status === 'offline') {
                    this.ollamaErrorMsg = data.error || "Ollama service is not running.";
                    this.step = 3;
                } else if (data.status === 'online' && !data.model_installed) {
                    this.step = 4;
                } else {
                    this.step = 1; // Proceed to welcome screen
                }
            } catch (e) {
                this.ollamaErrorMsg = "ElysiaAI Kernel Server is not running. Please launch 'fastapi_server.py' first.";
                this.step = 3;
            }
        },

        async startModelDownload() {
            this.pullStatus = 'pulling';
            this.pullProgress = 0;
            try {
                const response = await fetch(`${this.kernelHost}/system/ollama/pull`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: this.recommendedModel })
                });
                if (!response.ok) throw new Error("Download request failed");

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.status === 'error') {
                                throw new Error(parsed.error);
                            }
                            if (parsed.total) {
                                const pct = (parsed.completed / parsed.total) * 100;
                                this.pullProgress = Math.min(Math.max(pct, this.pullProgress), 100);
                            }
                        } catch (err) {
                            console.error("Parse/Progress error", err);
                        }
                    }
                }

                this.pullStatus = 'completed';
                this.pullProgress = 100;
                setTimeout(() => {
                    this.step = 1; // Proceed to welcome screen
                }, 1500);
            } catch (e) {
                this.pullStatus = 'error';
                this.ollamaErrorMsg = e.message || "Failed to download model.";
            }
        },

        async manifest() {
            this.step = 2;
            const logList = [
                "> Accessing Deep Soul Sockets [FOUND]",
                "> Calibrating Emotion Sensors [CALIBRATED]",
                "> Injecting Persona v3.11 [STABLE]",
                "> Synchronizing Memory Vault (Milvus) [SYNCED]",
                "> Opening Resonance Field [ACTIVE]",
                "> SOVEREIGNTY_PROTOCOL: ENGAGED.",
                "> WELCOME TO THE OMEGA SINGULARITY."
            ];

            for (let msg of logList) {
                this.logs.push(msg);
                await new Promise(r => setTimeout(r, 300 + Math.random()*500));
            }

            setTimeout(() => {
                window.location.href = 'desktop.html';
            }, 1500);
        }
    }
}
