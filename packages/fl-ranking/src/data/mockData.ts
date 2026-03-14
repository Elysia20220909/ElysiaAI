export interface PlayerStats {
	id: string;
	name: string;
	world: string;
	dataCenter: string;
	grandCompany: "Maelstrom" | "Twin Adder" | "Immortal Flames";
	job: "PLD" | "WAR" | "DRK" | "GNB" | "WHM" | "SCH" | "AST" | "SGE" | "MNK" | "DRG" | "NIN" | "SAM" | "RPR" | "BRD" | "MCH" | "DNC" | "BLM" | "SMN" | "RDM";
	rank: number;
	winRate: number;
	totalMatches: number;
	kda: string;
	avgDamage: number;
	avgHealing: number;
	battleHighAvg: number;
	lastMatches: {
		id: string;
		result: "Win" | "Loss" | "Draw";
		kills: number;
		deaths: number;
		assists: number;
		damage: number;
		healing: number;
		time: string;
	}[];
}

export const mockPlayers: PlayerStats[] = [
	{
		id: "1",
		name: "Y'shtola Rhul",
		world: "Bahamut",
		dataCenter: "Gaia",
		grandCompany: "Maelstrom",
		job: "WHM",
		rank: 1,
		winRate: 68.5,
		totalMatches: 450,
		kda: "4.5 / 1.2 / 12.8",
		avgDamage: 850000,
		avgHealing: 1200000,
		battleHighAvg: 85,
		lastMatches: [
			{
				id: "m1",
				result: "Win",
				kills: 8,
				deaths: 0,
				assists: 15,
				damage: 920000,
				healing: 1400000,
				time: "2 hours ago",
			},
			{
				id: "m2",
				result: "Win",
				kills: 5,
				deaths: 1,
				assists: 20,
				damage: 780000,
				healing: 1100000,
				time: "5 hours ago",
			},
			{
				id: "m3",
				result: "Loss",
				kills: 3,
				deaths: 2,
				assists: 10,
				damage: 650000,
				healing: 900000,
				time: "1 day ago",
			},
		],
	},
	{
		id: "2",
		name: "Thancred Waters",
		world: "Chocobo",
		dataCenter: "Mana",
		grandCompany: "Twin Adder",
		job: "GNB",
		rank: 2,
		winRate: 64.2,
		totalMatches: 380,
		kda: "3.8 / 2.1 / 8.5",
		avgDamage: 1200000,
		avgHealing: 50000,
		battleHighAvg: 70,
		lastMatches: [
			{
				id: "m4",
				result: "Win",
				kills: 12,
				deaths: 2,
				assists: 8,
				damage: 1400000,
				healing: 60000,
				time: "1 hour ago",
			},
			{
				id: "m5",
				result: "Win",
				kills: 10,
				deaths: 1,
				assists: 5,
				damage: 1100000,
				healing: 40000,
				time: "3 hours ago",
			},
		],
	},
	{
		id: "3",
		name: "Alphinaud Leveilleur",
		world: "Titan",
		dataCenter: "Gaia",
		grandCompany: "Immortal Flames",
		job: "SGE",
		rank: 3,
		winRate: 61.8,
		totalMatches: 520,
		kda: "2.5 / 1.8 / 18.2",
		avgDamage: 450000,
		avgHealing: 2500000,
		battleHighAvg: 40,
		lastMatches: [
			{
				id: "m6",
				result: "Win",
				kills: 2,
				deaths: 1,
				assists: 25,
				damage: 500000,
				healing: 2800000,
				time: "45 mins ago",
			},
		],
	},
	{
		id: "4",
		name: "Alisaie Leveilleur",
		world: "Titan",
		dataCenter: "Gaia",
		grandCompany: "Immortal Flames",
		job: "RDM",
		rank: 4,
		winRate: 60.5,
		totalMatches: 510,
		kda: "5.2 / 3.5 / 7.8",
		avgDamage: 1500000,
		avgHealing: 100000,
		battleHighAvg: 95,
		lastMatches: [
			{
				id: "m7",
				result: "Win",
				kills: 15,
				deaths: 4,
				assists: 10,
				damage: 1800000,
				healing: 120000,
				time: "2 hours ago",
			},
		],
	},
	{
		id: "5",
		name: "G'raha Tia",
		world: "Ifrit",
		dataCenter: "Gaia",
		grandCompany: "Maelstrom",
		job: "PLD",
		rank: 5,
		winRate: 59.2,
		totalMatches: 300,
		kda: "3.2 / 2.5 / 10.5",
		avgDamage: 900000,
		avgHealing: 800000,
		battleHighAvg: 65,
		lastMatches: [],
	},
	{
		id: "6",
		name: "Estinien Varlineau",
		world: "Garuda",
		dataCenter: "Elemental",
		grandCompany: "Maelstrom",
		job: "DRG",
		rank: 6,
		winRate: 58.0,
		totalMatches: 600,
		kda: "6.5 / 4.2 / 5.2",
		avgDamage: 1800000,
		avgHealing: 0,
		battleHighAvg: 100,
		lastMatches: [],
	},
	{
		id: "7",
		name: "Urianger Augurelt",
		world: "Ramuh",
		dataCenter: "Elemental",
		grandCompany: "Twin Adder",
		job: "AST",
		rank: 7,
		winRate: 57.5,
		totalMatches: 420,
		kda: "1.2 / 1.5 / 22.1",
		avgDamage: 300000,
		avgHealing: 3200000,
		battleHighAvg: 35,
		lastMatches: [],
	},
];
