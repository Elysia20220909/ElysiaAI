/**
 * Hot Reload Feature
 * Automatic reload on file changes
 */

import { watch } from "node:fs";
import { join } from "node:path";
import devConfig from "./dev-config";

export class HotReloadManager {
	private watchers: Map<string, ReturnType<typeof watch>> = new Map();
	private callbacks: Set<(file: string) => void> = new Set();
	private debounceTimer: NodeJS.Timeout | null = null;
	private debounceDelay = 100; // ms

	constructor() {
		if (!devConfig.hotReload) {
			console.log("[Hot Reload] Disabled");
			return;
		}
		this.setupWatchers();
	}

	private setupWatchers(): void {
		console.log("[Hot Reload] Enabled");

		for (const watchPath of devConfig.watchPaths) {
			try {
				const absolutePath = join(process.cwd(), watchPath);
				console.log(`[Hot Reload] Watching: ${watchPath}`);

				const watcher = watch(
					absolutePath,
					{ recursive: true, persistent: true },
					(eventType, filename) => {
						if (!filename) return;

						// Exclude specific files
						if (
							filename.includes("node_modules") ||
							filename.includes(".git") ||
							filename.includes(".env") ||
							filename.includes("dev.db")
						) {
							return;
						}

						// File extension filter
						if (!filename.match(/\.(ts|js|tsx|jsx|json|html|css)$/)) {
							return;
						}

						this.triggerReload(filename);
					},
				);

				this.watchers.set(watchPath, watcher);
			} catch (error) {
				console.error(`[Hot Reload] Watch setup error (${watchPath}):`, error);
			}
		}
	}

	private triggerReload(file: string): void {
		// Debounce: Merge multiple changes within 100ms into one
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			console.log(`\n[Hot Reload] File change detected: ${file}`);
			console.log("[Hot Reload] Reloading...\n");

			for (const callback of this.callbacks) {
				try {
					callback(file);
				} catch (error) {
					console.error("[Hot Reload] Reload error:", error);
				}
			}
		}, this.debounceDelay);
	}

	public onReload(callback: (file: string) => void): void {
		this.callbacks.add(callback);
	}

	public stop(): void {
		for (const [path, watcher] of this.watchers) {
			watcher.close();
			console.log(`[Hot Reload] Stopped watching: ${path}`);
		}
		this.watchers.clear();
		this.callbacks.clear();
	}
}

// Global instance
export const hotReloadManager = new HotReloadManager();
