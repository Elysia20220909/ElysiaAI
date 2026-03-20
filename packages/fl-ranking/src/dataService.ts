import type { PlayerStats } from "./data/mockData";
import { mockPlayers } from "./data/mockData";

export class LocalStorageDataService {
	private storageKey = "elysia-fl-players";
	private initPromise: Promise<void>;

	constructor() {
		this.initPromise = this.init();
	}

	private async init() {
		const existing = localStorage.getItem(this.storageKey);
		if (!existing) {
			localStorage.setItem(this.storageKey, JSON.stringify(mockPlayers));
		} else {
			// Merge missing mock players and update existing ones with new fields (for dev/updates)
			const currentPlayers: PlayerStats[] = JSON.parse(existing);
			let updated = false;
			for (const mp of mockPlayers) {
				const existingIndex = currentPlayers.findIndex((p) => p.id === mp.id);
				if (existingIndex === -1) {
					currentPlayers.push(mp);
					updated = true;
				} else {
					// Check for new fields in mock data and update existing record
					let playerUpdated = false;
					for (const key of Object.keys(mp) as (keyof PlayerStats)[]) {
						if (
							!(key in currentPlayers[existingIndex]) ||
							currentPlayers[existingIndex][key] !== mp[key]
						) {
							(currentPlayers[existingIndex] as any)[key] = mp[key];
							playerUpdated = true;
						}
					}
					if (playerUpdated) updated = true;
				}
			}
			if (updated) {
				localStorage.setItem(this.storageKey, JSON.stringify(currentPlayers));
			}
		}
	}

	async getPlayers(): Promise<PlayerStats[]> {
		await this.initPromise;
		const data = localStorage.getItem(this.storageKey);
		return data ? JSON.parse(data) : [];
	}

	async searchPlayers(term: string): Promise<PlayerStats[]> {
		await this.initPromise;
		const players = await this.getPlayers();
		if (!term) return players;
		const lowTerm = term.toLowerCase();
		return players.filter(
			(p) =>
				p.name.toLowerCase().includes(lowTerm) ||
				p.job.toLowerCase().includes(lowTerm) ||
				p.world.toLowerCase().includes(lowTerm),
		);
	}

	async addPlayer(player: PlayerStats): Promise<void> {
		await this.initPromise;
		const players = await this.getPlayers();
		players.push(player);
		localStorage.setItem(this.storageKey, JSON.stringify(players));
	}

	async deletePlayer(id: string): Promise<void> {
		await this.initPromise;
		const players = await this.getPlayers();
		const filtered = players.filter((p) => p.id !== id);
		localStorage.setItem(this.storageKey, JSON.stringify(filtered));
	}
}
