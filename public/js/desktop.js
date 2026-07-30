function elysiaOS() {
    return {
        currentTime: '',
        kernelAlive: true,
        ollamaErrorOpen: false,
        // AI Settings configuration properties
        aiConfigOpen: false,
        ollamaHost: 'http://127.0.0.1:11434',
        ollamaModel: 'llama3.2',
        availableModels: [],
        configSaving: false,
        configSuccess: false,
        configError: '',
        loading: false,
        chatInput: '',
        messages: JSON.parse(localStorage.getItem('elysia_chat_history') || '[]'),
        stats: { security: { lockdown: { active: false } } },
        logHistory: [],
        terminalOutput: [],
        maxZ: 100,
        dragApp: null,
        offsetX: 0,
        offsetY: 0,
        kernelHost: 'http://localhost:8000',

        appContents: {},
        appsRegistry: {},
        apps: {}, // { id: {open: boolean, zIndex: number} }
        activeApp: null,
        blackwallActive: false,
        visualLock: false, // New Phase 20
        userEmotion: 'neutral', // New Phase 21
        userRole: 'guest', // New Phase 24
        currentTheme: 'cyberpunk', // New Phase 23
        maintenanceMode: false, // New Phase 25
        netDepth: 0,
        systemHealth: { brain: false, voice: false, net: false },
        securityStatus: { secure_boot: 'PENDING', panic: false, sip_active: true },
        privacyStatus: { camera_active: false, mic_active: false, session_sealed: false },
        diagnostics: { open: false, report: '' },
        visionMode: false, // Phase 39
        isSubmerged: true, // Phase 23: Abyssal Submersion
        pendingEntitlements: [], // Phase 28
        toasts: [],

        init() {
            this.updateTime();
            setInterval(() => this.updateTime(), 1000);
            setInterval(() => this.fetchMonitor(), 5000); // UI Symmetry Refresh
            this.fetchStats();
            setInterval(() => this.fetchStats(), 5000);
            this.fetchApps();
            setInterval(() => this.fetchApps(), 10000);
            this.addLog("Elysia OS Neural Singularity Core Initialised.");

            // Listen for system messages
            window.addEventListener('message', async (e) => {
                if (e.data && e.data.type === 'execute_aegis') {
                    this.addLog(`Aegis Trigger: ${e.data.influence}`);
                    // Trigger Tauri command
                    if (window.__TAURI__) {
                        try {
                            const res = await window.__TAURI__.core.invoke('execute_signed_influence', {
                                influence: e.data.influence,
                                signature: '0xDEFIANT_SOVEREIGN'
                            });
                            this.addLog(`Tauri Kernel Response: ${res}`);
                        } catch (err) {
                            this.addLog(`Aegis Execution Failed: ${err}`);
                        }
                    }
                }
            });
        },

        addLog(msg) {
            this.logHistory.unshift({ id: Date.now(), time: new Date().toLocaleTimeString(), msg });
            if (this.logHistory.length > 20) this.logHistory.pop();
            this.terminalOutput.push(`[SYSTEM] ${msg}`);
            if (this.terminalOutput.length > 50) this.terminalOutput.shift();
        },

        async fetchMonitor() {
            try {
                const res = await fetch("http://127.0.0.1:8000/system/monitor");
                if (res.ok) {
                    const data = await res.json();
                    this.systemHealth.brain = data.elysia.voice_active;
                    this.systemHealth.voice = data.elysia.voice_active;
                    this.systemHealth.net = data.elysia.soul_resonance > 0.5;
                }
            } catch(e) {}
        },

        async fetchApps() {
            try {
                const res = await fetch("http://127.0.0.1:8000/system/apps/list");
                if (res.ok) {
                    this.appsRegistry = await res.json();
                }
            } catch(e) {}
        },

        async openApp(appId) {
            if (!this.apps[appId]) {
                const openCount = Object.values(this.apps).filter(app => app.open).length;
                this.apps[appId] = {
                    open: false,
                    zIndex: 10,
                    x: 80 + openCount * 28,
                    y: 96 + openCount * 24
                };
            }
            if (typeof this.apps[appId].x !== 'number') this.apps[appId].x = 80;
            if (typeof this.apps[appId].y !== 'number') this.apps[appId].y = 96;
            this.maxZ++;
            this.apps[appId].open = true;
            this.apps[appId].zIndex = this.maxZ;
            this.activeApp = appId;

            await this.loadApp(appId);
            this.addLog(`Mounted virtual node: ${appId}`);
        },

        toggleApp(appId) {
            if (this.apps[appId]?.open) {
                this.closeApp(appId);
                return;
            }
            this.openApp(appId);
        },

        closeApp(appId) {
            if (this.apps[appId]) {
                this.apps[appId].open = false;
                this.addLog(`Unmounted virtual node: ${appId}`);
            }
        },

        focusApp(appId) {
            if (this.apps[appId] && this.apps[appId].open) {
                this.maxZ++;
                this.apps[appId].zIndex = this.maxZ;
                this.activeApp = appId;
            }
        },

        async loadApp(appId) {
            if (this.appContents[appId]) return;
            try {
                const res = await fetch(`http://127.0.0.1:8000/system/apps/${appId}.component.html`);
                if (res.ok) {
                    this.appContents[appId] = await res.text();
                }
            } catch (e) {
                console.error(`Failed to load app ${appId}`, e);
            }
        },

        updateTime() {
            const now = new Date();
            this.currentTime = now.toLocaleString('ja-JP', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        },

        async fetchStats() {
            try {
                const res = await fetch("http://127.0.0.1:8000/system/monitor");
                if (res.ok) {
                    this.stats = await res.json();
                    this.kernelAlive = true;
                    // Add to history
                    this.logHistory.unshift({
                        id: Date.now(),
                        time: new Date().toLocaleTimeString(),
                        msg: `Heartbeat: CPU ${this.stats.system.cpu}% | RAM ${this.stats.system.ram}%`
                    });
                    if (this.logHistory.length > 20) this.logHistory.pop();
                } else {
                    this.kernelAlive = false;
                    this.ollamaErrorOpen = true;
                }
            } catch (e) {
                this.kernelAlive = false;
                this.ollamaErrorOpen = true;
            }
        },

        async openAiConfig() {
            this.aiConfigOpen = true;
            this.configSuccess = false;
            this.configError = '';
            try {
                const configRes = await fetch(`${this.kernelHost}/system/ollama/config`);
                if (configRes.ok) {
                    const configData = await configRes.json();
                    this.ollamaHost = configData.host;
                    this.ollamaModel = configData.model;
                }

                const modelsRes = await fetch(`${this.ollamaHost}/api/tags`).catch(() => null);
                if (modelsRes && modelsRes.ok) {
                    const modelsData = await modelsRes.json();
                    this.availableModels = modelsData.models.map(m => m.name);
                } else {
                    this.availableModels = [this.ollamaModel];
                }
            } catch (e) {
                this.configError = 'Failed to connect to kernel or retrieve config.';
            }
        },

        async saveAiConfig() {
            this.configSaving = true;
            this.configSuccess = false;
            this.configError = '';
            try {
                const res = await fetch(`${this.kernelHost}/system/ollama/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        host: this.ollamaHost,
                        model: this.ollamaModel
                    })
                });
                if (res.ok) {
                    this.configSuccess = true;
                    this.addLog(`AI Configuration saved: ${this.ollamaModel} on ${this.ollamaHost}`);
                    setTimeout(() => {
                        this.aiConfigOpen = false;
                    }, 1000);
                } else {
                    throw new Error("Failed to save configuration");
                }
            } catch (e) {
                this.configError = e.message || 'Failed to sync config with kernel.';
            } finally {
                this.configSaving = false;
            }
        },

        // Settings Persistence (Resonance Sync)
        async saveConfig(newConfig) {
            this.addLog("Synchronizing system resonance...");
            try {
                const res = await fetch("http://127.0.0.1:8000/system/config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newConfig)
                });
                if (res.ok) {
                    this.addLog("Config synced to etc/elysia/config.json");
                    this.stats.config = { ...this.stats.config, ...newConfig };
                }
            } catch (e) {
                this.addLog("Synchronized Failed: Abyssal Desync.");
            }
        },

        async triggerBlackwall() {
            this.blackwallActive = !this.blackwallActive;
            this.addLog(`Sovereign Net State: ${this.blackwallActive ? 'SHIELDED (BLACKWALL)' : 'UNSHIELDED'}`);
            if (window.__TAURI__) {
                await window.__TAURI__.core.invoke('emergency_purge');
            }
        },

        async sendMessage() {
            if (!this.chatInput.trim()) return;
            const userMsg = this.chatInput;
            this.chatInput = '';
            this.loading = true;

            this.messages.push({ role: 'user', content: userMsg });
            this.saveChatHistory();

            try {
                const response = await fetch("http://127.0.0.1:3000/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        mode: "sovereign",
                        messages: this.messages
                    })
                });

                if (response.ok) {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let aiMessage = { role: 'assistant', content: '' };
                    this.messages.push(aiMessage);

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');
                        for(let line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.substring(6);
                                if (dataStr === '[DONE]') continue;
                                try {
                                    const parsed = JSON.parse(dataStr);
                                    if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                                        aiMessage.content += parsed.choices[0].delta.content;
                                    }
                                } catch(e) {}
                            }
                        }
                    }
                    this.saveChatHistory();
                    this.triggerVoicevox(aiMessage.content);
                } else {
                    this.messages.push({ role: 'assistant', content: 'Connection to local cognitive kernel compromised.' });
                    this.ollamaErrorOpen = true;
                }
            } catch (e) {
                this.messages.push({ role: 'assistant', content: 'Cognitive Gateway Desync.' });
                this.ollamaErrorOpen = true;
            } finally {
                this.loading = false;
            }
        },

        async triggerVoicevox(text) {
            try {
                await fetch("http://127.0.0.1:3000/api/voice/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text })
                });
            } catch(e) {}
        },

        saveChatHistory() {
            localStorage.setItem('elysia_chat_history', JSON.stringify(this.messages));
        },

        clearChatHistory() {
            this.messages = [];
            localStorage.removeItem('elysia_chat_history');
            this.addLog("Memory registers purged.");
        },

        // Dragging helpers
        startDrag(appId, event) {
            this.dragApp = appId;
            this.focusApp(appId);
            const appEl = document.getElementById(`window-${appId}`);
            if (appEl) {
                const rect = appEl.getBoundingClientRect();
                this.offsetX = event.clientX - rect.left;
                this.offsetY = event.clientY - rect.top;
            }
        },

        drag(event) {
            if (this.dragApp) {
                const appEl = document.getElementById(`window-${this.dragApp}`);
                if (appEl) {
                    const nextX = event.clientX - this.offsetX;
                    const nextY = event.clientY - this.offsetY;
                    appEl.style.left = `${nextX}px`;
                    appEl.style.top = `${nextY}px`;
                    if (this.apps[this.dragApp]) {
                        this.apps[this.dragApp].x = nextX;
                        this.apps[this.dragApp].y = nextY;
                    }
                }
            }
        },

        handleDrag(event) {
            this.drag(event);
        },

        stopDrag() {
            this.dragApp = null;
        },

        toggleVisionMode() {
            this.visionMode = !this.visionMode;
            this.addLog(`Vision Calibration: ${this.visionMode ? 'ACTIVE' : 'DEACTIVATED'}`);
        },

        showToast(msg, icon = '🌌') {
            const id = Date.now();
            this.toasts.push({ id, msg, icon, visible: true });
            setTimeout(() => {
                const t = this.toasts.find(t => t.id === id);
                if(t) t.visible = false;
                setTimeout(() => {
                    this.toasts = this.toasts.filter(t => t.id !== id);
                }, 500);
            }, 5000);
        }
    }
}
