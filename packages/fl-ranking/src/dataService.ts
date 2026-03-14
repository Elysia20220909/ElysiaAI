import type { PlayerStats } from "./data/mockData";
import { mockPlayers } from "./data/mockData";

export interface DataService {
	getPlayers(): Promise<PlayerStats[]>;
	searchPlayers(query: string): Promise<PlayerStats[]>;
	addPlayer(player: PlayerStats): Promise<void>;
	updatePlayer(player: PlayerStats): Promise<void>;
	deletePlayer(id: string): Promise<void>;
}

export class LocalStorageDataService implements DataService {
	private STORAGE_KEY = "elysia_ff14_ranking";

	private async loadData(): Promise<PlayerStats[]> {
		const stored = localStorage.getItem(this.STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
		return [...mockPlayers];
	}

	private async saveData(data: PlayerStats[]): Promise<void> {
		localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
	}

	async getPlayers(): Promise<PlayerStats[]> {
		return this.loadData();
	}

	async searchPlayers(query: string): Promise<PlayerStats[]> {
		const players = await this.loadData();
		const term = query.toLowerCase();
		return players.filter(
			(p) =>
				p.name.toLowerCase().includes(term) ||
				p.world.toLowerCase().includes(term) ||
				p.grandCompany.toLowerCase().includes(term),
		);
	}

	async addPlayer(player: PlayerStats): Promise<void> {
		const players = await this.loadData();
		players.push(player);
		await this.saveData(players);
	}

	async updatePlayer(player: PlayerStats): Promise<void> {
		const players = await this.loadData();
		const index = players.findIndex((p) => p.id === player.id);
		if (index !== -1) {
			players[index] = player;
			await this.saveData(players);
		}
	}

	async deletePlayer(id: string): Promise<void> {
		const players = await this.loadData();
		const filtered = players.filter((p) => p.id !== id);
		await this.saveData(filtered);
	}
}

export class MockDataService implements DataService {
	// ... existing MockDataService implementation with CRUD as no-ops or simulated
	async getPlayers(): Promise<PlayerStats[]> {
		/* ... */ return mockPlayers;
	}
	async searchPlayers(query: string): Promise<PlayerStats[]> {
		/* ... */ return mockPlayers;
	}
	async addPlayer() {}
	async updatePlayer() {}
	async deletePlayer() {}
}

export class ApiDataService implements DataService {
	async getPlayers(): Promise<PlayerStats[]> {
		return [];
	}
	async searchPlayers(_query: string) {
		return [];
	}
	async addPlayer(_player: PlayerStats) {}
	async updatePlayer(_player: PlayerStats) {}
	async deletePlayer(_id: string) {}
}
