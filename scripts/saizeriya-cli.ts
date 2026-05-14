import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type SaizeriyaCategory =
	| "starter"
	| "salad"
	| "soup"
	| "pizza"
	| "doria"
	| "pasta"
	| "meat"
	| "dessert"
	| "drink"
	| "wine";

export type MenuAvailability = "regular" | "check-store";

export type SaizeriyaMenuItem = {
	code: string;
	name: string;
	category: SaizeriyaCategory;
	priceYen: number;
	tags: string[];
	aliases?: string[];
	availability?: MenuAvailability;
	note?: string;
};

export type MenuFilter = {
	category?: SaizeriyaCategory;
	maxPriceYen?: number;
	query?: string;
	tags?: string[];
	includeCheckStore?: boolean;
};

export type ComboOptions = {
	budgetYen: number;
	people: number;
	tags?: string[];
	includeCheckStore?: boolean;
};

export type CartLine = {
	code: string;
	quantity: number;
};

export type SaizeriyaCart = {
	lines: CartLine[];
	updatedAt: string;
};

export const DEFAULT_CART_PATH = ".tmp/saizeriya-cart.json";

export const BUILT_IN_MENU: SaizeriyaMenuItem[] = [
	{
		code: "2101",
		name: "ミラノ風ドリア",
		category: "doria",
		priceYen: 300,
		tags: ["popular", "rice", "classic", "main"],
		aliases: ["ドリア", "ミラノ"],
	},
	{
		code: "1202",
		name: "小エビのサラダ",
		category: "salad",
		priceYen: 350,
		tags: ["popular", "seafood", "fresh"],
		aliases: ["小エビ", "サラダ"],
	},
	{
		code: "1401",
		name: "辛味チキン",
		category: "starter",
		priceYen: 300,
		tags: ["popular", "chicken", "share", "spicy"],
		aliases: ["辛味", "チキン"],
	},
	{
		code: "2203",
		name: "バッファローモッツァレラのマルゲリータピザ",
		category: "pizza",
		priceYen: 400,
		tags: ["popular", "cheese", "main", "share"],
		aliases: ["マルゲリータ", "ピザ"],
	},
	{
		code: "2402",
		name: "若鶏のディアボラ風",
		category: "meat",
		priceYen: 500,
		tags: ["popular", "chicken", "main"],
		aliases: ["ディアボラ", "若鶏"],
		availability: "check-store",
		note: "チキン系は店舗や時期で販売状況の確認がおすすめです",
	},
	{
		code: "1307",
		name: "たまねぎのズッパ",
		category: "soup",
		priceYen: 300,
		tags: ["popular", "warm", "starter"],
		aliases: ["ズッパ", "たまねぎ"],
	},
	{
		code: "2301",
		name: "タラコソースシシリー風",
		category: "pasta",
		priceYen: 400,
		tags: ["popular", "seafood", "main"],
		aliases: ["タラコ", "シシリー"],
	},
	{
		code: "2406",
		name: "ハンバーグステーキ",
		category: "meat",
		priceYen: 400,
		tags: ["popular", "beef", "main"],
		aliases: ["ハンバーグ"],
	},
	{
		code: "1403",
		name: "ほうれん草のソテー",
		category: "starter",
		priceYen: 200,
		tags: ["popular", "vegetable", "starter"],
		aliases: ["ほうれん草", "ソテー"],
	},
	{
		code: "2303",
		name: "ペペロンチーノ",
		category: "pasta",
		priceYen: 300,
		tags: ["popular", "garlic", "main", "spicy"],
		aliases: ["ペペ", "ペペロン"],
	},
	{
		code: "3206",
		name: "イタリアンプリン",
		category: "dessert",
		priceYen: 250,
		tags: ["popular", "dessert", "sweet"],
		aliases: ["プリン"],
	},
	{
		code: "5101",
		name: "セットドリンクバー",
		category: "drink",
		priceYen: 200,
		tags: ["popular", "drink", "set"],
		aliases: ["ドリンクバー", "ドリバー"],
	},
	{
		code: "1405",
		name: "エスカルゴのオーブン焼き",
		category: "starter",
		priceYen: 400,
		tags: ["signature", "share", "wine"],
		aliases: ["エスカルゴ"],
	},
	{
		code: "2328",
		name: "イカの墨入りセピアソース",
		category: "pasta",
		priceYen: 500,
		tags: ["signature", "seafood", "main", "wine"],
		aliases: ["イカ墨", "セピア"],
	},
	{
		code: "1425",
		name: "柔らか青豆の温サラダ",
		category: "starter",
		priceYen: 200,
		tags: ["signature", "vegetable", "warm"],
		aliases: ["青豆", "温サラダ"],
	},
	{
		code: "2305",
		name: "カルボナーラ",
		category: "pasta",
		priceYen: 500,
		tags: ["signature", "main", "cheese"],
		aliases: ["カルボ"],
	},
	{
		code: "3201",
		name: "ティラミス クラシコ",
		category: "dessert",
		priceYen: 300,
		tags: ["signature", "dessert", "sweet"],
		aliases: ["ティラミス"],
	},
	{
		code: "3401",
		name: "グラスワイン 赤",
		category: "wine",
		priceYen: 100,
		tags: ["wine", "drink"],
		aliases: ["赤ワイン", "グラス赤"],
	},
	{
		code: "3402",
		name: "グラスワイン 白",
		category: "wine",
		priceYen: 100,
		tags: ["wine", "drink"],
		aliases: ["白ワイン", "グラス白"],
	},
	{
		code: "3413",
		name: "ドンラファエロ",
		category: "wine",
		priceYen: 1100,
		tags: ["wine", "bottle", "share"],
		aliases: ["発泡", "スパークリング"],
	},
];

const MAIN_CATEGORIES = new Set<SaizeriyaCategory>([
	"doria",
	"pizza",
	"pasta",
	"meat",
]);

function normalizeText(value: string): string {
	return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function yen(value: number): string {
	return `${value.toLocaleString("ja-JP")}円`;
}

export function formatYen(value: number): string {
	return yen(value);
}

export function isMainItem(item: SaizeriyaMenuItem): boolean {
	return MAIN_CATEGORIES.has(item.category);
}

export function searchMenu(
	menu: SaizeriyaMenuItem[],
	query: string,
): SaizeriyaMenuItem[] {
	const needle = normalizeText(query);
	if (!needle) return [...menu];

	return menu.filter((item) => {
		const haystack = [
			item.code,
			item.name,
			item.category,
			...item.tags,
			...(item.aliases ?? []),
		]
			.map(normalizeText)
			.join(" ");
		return haystack.includes(needle);
	});
}

export function filterMenu(
	menu: SaizeriyaMenuItem[],
	filter: MenuFilter,
): SaizeriyaMenuItem[] {
	const tags = (filter.tags ?? []).map(normalizeText);
	const base = filter.query ? searchMenu(menu, filter.query) : [...menu];
	return base
		.filter((item) => !filter.category || item.category === filter.category)
		.filter(
			(item) => !filter.maxPriceYen || item.priceYen <= filter.maxPriceYen,
		)
		.filter(
			(item) =>
				filter.includeCheckStore ||
				(item.availability ?? "regular") === "regular",
		)
		.filter((item) => {
			if (tags.length === 0) return true;
			const itemTags = new Set(item.tags.map(normalizeText));
			return tags.every((tag) => itemTags.has(tag));
		})
		.sort((left, right) => left.priceYen - right.priceYen);
}

export function findMenuItem(
	menu: SaizeriyaMenuItem[],
	token: string,
): SaizeriyaMenuItem | undefined {
	const normalized = normalizeText(token);
	const exact = menu.find(
		(item) =>
			normalizeText(item.code) === normalized ||
			normalizeText(item.name) === normalized ||
			(item.aliases ?? []).some((alias) => normalizeText(alias) === normalized),
	);
	return exact ?? searchMenu(menu, token)[0];
}

function buildMainSets(
	items: SaizeriyaMenuItem[],
	people: number,
	startIndex = 0,
	current: SaizeriyaMenuItem[] = [],
	results: SaizeriyaMenuItem[][] = [],
): SaizeriyaMenuItem[][] {
	if (current.length === people) {
		results.push([...current]);
		return results;
	}

	for (let index = startIndex; index < items.length; index += 1) {
		current.push(items[index] as SaizeriyaMenuItem);
		buildMainSets(items, people, index, current, results);
		current.pop();
	}

	return results;
}

function buildSideSets(items: SaizeriyaMenuItem[]): SaizeriyaMenuItem[][] {
	const sideSets: SaizeriyaMenuItem[][] = [[]];
	for (const item of items) sideSets.push([item]);
	for (let left = 0; left < items.length; left += 1) {
		for (let right = left + 1; right < items.length; right += 1) {
			sideSets.push([
				items[left] as SaizeriyaMenuItem,
				items[right] as SaizeriyaMenuItem,
			]);
		}
	}
	return sideSets;
}

export function suggestCombo(
	menu: SaizeriyaMenuItem[],
	options: ComboOptions,
): { items: SaizeriyaMenuItem[]; totalYen: number; perPersonYen: number } {
	const people = Math.max(1, Math.floor(options.people || 1));
	const usable = filterMenu(menu, {
		tags: options.tags,
		includeCheckStore: options.includeCheckStore,
	});
	const mains = usable.filter(isMainItem);
	const sides = usable.filter((item) => !isMainItem(item));
	const mainSets = buildMainSets(mains, people);
	const sideSets = buildSideSets(sides);
	let best: {
		items: SaizeriyaMenuItem[];
		totalYen: number;
		score: number;
	} | null = null;

	for (const mainSet of mainSets) {
		for (const sideSet of sideSets) {
			const items = [...mainSet, ...sideSet];
			const totalYen = items.reduce((sum, item) => sum + item.priceYen, 0);
			if (totalYen > options.budgetYen) continue;
			const categories = new Set(items.map((item) => item.category)).size;
			const popular = items.filter((item) =>
				item.tags.includes("popular"),
			).length;
			const score =
				totalYen + categories * 35 + popular * 20 + sideSet.length * 15;
			if (!best || score > best.score) best = { items, totalYen, score };
		}
	}

	if (!best) {
		return { items: [], totalYen: 0, perPersonYen: 0 };
	}

	return {
		items: best.items,
		totalYen: best.totalYen,
		perPersonYen: Math.ceil(best.totalYen / people),
	};
}

export function createEmptyCart(): SaizeriyaCart {
	return { lines: [], updatedAt: new Date(0).toISOString() };
}

export function addCartLine(
	cart: SaizeriyaCart,
	item: SaizeriyaMenuItem,
	quantity: number,
): SaizeriyaCart {
	const safeQuantity = Math.max(1, Math.floor(quantity));
	const lines = [...cart.lines];
	const existing = lines.find((line) => line.code === item.code);
	if (existing) {
		existing.quantity += safeQuantity;
	} else {
		lines.push({ code: item.code, quantity: safeQuantity });
	}
	return { lines, updatedAt: new Date().toISOString() };
}

export function removeCartLine(
	cart: SaizeriyaCart,
	item: SaizeriyaMenuItem,
	quantity: number,
): SaizeriyaCart {
	const safeQuantity = Math.max(1, Math.floor(quantity));
	const lines = cart.lines
		.map((line) =>
			line.code === item.code
				? { ...line, quantity: line.quantity - safeQuantity }
				: line,
		)
		.filter((line) => line.quantity > 0);
	return { lines, updatedAt: new Date().toISOString() };
}

export function summarizeCart(
	cart: SaizeriyaCart,
	menu: SaizeriyaMenuItem[],
	people = 1,
): {
	rows: Array<{
		item: SaizeriyaMenuItem;
		quantity: number;
		subtotalYen: number;
	}>;
	totalYen: number;
	perPersonYen: number;
} {
	const rows = cart.lines.flatMap((line) => {
		const item = menu.find((candidate) => candidate.code === line.code);
		if (!item) return [];
		return [
			{
				item,
				quantity: line.quantity,
				subtotalYen: item.priceYen * line.quantity,
			},
		];
	});
	const totalYen = rows.reduce((sum, row) => sum + row.subtotalYen, 0);
	return {
		rows,
		totalYen,
		perPersonYen: Math.ceil(totalYen / Math.max(1, Math.floor(people))),
	};
}

export function formatMenu(items: SaizeriyaMenuItem[]): string {
	if (items.length === 0) return "該当するメニューがありません。";
	return items
		.map((item) => {
			const status =
				(item.availability ?? "regular") === "check-store" ? " 要確認" : "";
			return `${item.code}  ${item.name}  ${yen(item.priceYen)}  [${item.category}] ${item.tags.join(",")}${status}`;
		})
		.join("\n");
}

export function formatCombo(combo: ReturnType<typeof suggestCombo>): string {
	if (combo.items.length === 0) {
		return "予算内の組み合わせが見つかりませんでした。--budget を少し上げてください。";
	}
	return [
		"おすすめセット",
		...combo.items.map(
			(item) => `- ${item.code} ${item.name}: ${yen(item.priceYen)}`,
		),
		`合計: ${yen(combo.totalYen)}`,
		`1人あたり: ${yen(combo.perPersonYen)}`,
	].join("\n");
}

export function formatCartSummary(
	summary: ReturnType<typeof summarizeCart>,
): string {
	if (summary.rows.length === 0) return "カートは空です。";
	return [
		"カート",
		...summary.rows.map(
			(row) =>
				`- ${row.item.code} ${row.item.name} x${row.quantity}: ${yen(row.subtotalYen)}`,
		),
		`合計: ${yen(summary.totalYen)}`,
		`1人あたり: ${yen(summary.perPersonYen)}`,
	].join("\n");
}

function parseArgs(args: string[]): {
	command: string;
	positionals: string[];
	options: Record<string, string | boolean>;
} {
	const [command = "help", ...rest] = args;
	const positionals: string[] = [];
	const options: Record<string, string | boolean> = {};

	for (let index = 0; index < rest.length; index += 1) {
		const value = rest[index] as string;
		if (!value.startsWith("--")) {
			positionals.push(value);
			continue;
		}

		const key = value.slice(2);
		const next = rest[index + 1];
		if (!next || next.startsWith("--")) {
			options[key] = true;
			continue;
		}
		options[key] = next;
		index += 1;
	}

	return { command, positionals, options };
}

function optionNumber(
	options: Record<string, string | boolean>,
	key: string,
	fallback: number,
): number {
	const value = options[key];
	if (typeof value !== "string") return fallback;
	const parsed = Number(value.replace(/[,_円]/g, ""));
	return Number.isFinite(parsed) ? parsed : fallback;
}

function optionText(
	options: Record<string, string | boolean>,
	key: string,
): string | undefined {
	const value = options[key];
	return typeof value === "string" ? value : undefined;
}

function optionTags(options: Record<string, string | boolean>): string[] {
	const tagText =
		optionText(options, "tag") ?? optionText(options, "tags") ?? "";
	return tagText
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
}

async function loadMenu(options: Record<string, string | boolean>) {
	const menuPath =
		optionText(options, "menu") ?? process.env.SAIZERIYA_MENU_JSON;
	if (!menuPath) return BUILT_IN_MENU;
	const raw = await readFile(resolve(menuPath), "utf8");
	const parsed = JSON.parse(raw) as SaizeriyaMenuItem[];
	if (!Array.isArray(parsed)) throw new Error("menu JSON must be an array");
	return parsed;
}

async function loadCart(path: string): Promise<SaizeriyaCart> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as SaizeriyaCart;
	} catch {
		return createEmptyCart();
	}
}

async function saveCart(path: string, cart: SaizeriyaCart) {
	await mkdir(dirname(path), { recursive: true });
	await Bun.write(path, `${JSON.stringify(cart, null, 2)}\n`);
}

function helpText(): string {
	return [
		"Saizeriya custom CLI",
		"",
		"使い方:",
		"  bun run saizeriya -- list [--category pasta] [--max 500] [--tag popular] [--include-check]",
		"  bun run saizeriya -- find ドリア",
		"  bun run saizeriya -- combo --budget 1000 --people 2",
		"  bun run saizeriya -- cart add 2101 --qty 2",
		"  bun run saizeriya -- cart show --people 2",
		"  bun run saizeriya -- cart clear",
		"",
		"補足: --menu path/to/menu.json でローカルのメニューJSONを優先できます。",
	].join("\n");
}

export async function runSaizeriyaCli(args: string[]): Promise<string> {
	const parsed = parseArgs(args);
	const menu = await loadMenu(parsed.options);
	const json = parsed.options.json === true;
	const includeCheckStore = parsed.options["include-check"] === true;

	if (parsed.command === "help" || parsed.command === "--help")
		return helpText();

	if (parsed.command === "list") {
		const items = filterMenu(menu, {
			category: optionText(parsed.options, "category") as SaizeriyaCategory,
			maxPriceYen: optionNumber(parsed.options, "max", 0) || undefined,
			tags: optionTags(parsed.options),
			includeCheckStore,
		});
		return json ? JSON.stringify(items, null, 2) : formatMenu(items);
	}

	if (parsed.command === "find") {
		const query = parsed.positionals.join(" ");
		const items = filterMenu(menu, {
			query,
			includeCheckStore: true,
		});
		return json ? JSON.stringify(items, null, 2) : formatMenu(items);
	}

	if (parsed.command === "combo") {
		const combo = suggestCombo(menu, {
			budgetYen: optionNumber(parsed.options, "budget", 1000),
			people: optionNumber(parsed.options, "people", 1),
			tags: optionTags(parsed.options),
			includeCheckStore,
		});
		return json ? JSON.stringify(combo, null, 2) : formatCombo(combo);
	}

	if (parsed.command === "cart") {
		const subCommand = parsed.positionals[0] ?? "show";
		const cartPath = resolve(
			optionText(parsed.options, "state") ?? DEFAULT_CART_PATH,
		);
		if (subCommand === "clear") {
			const empty = createEmptyCart();
			await saveCart(cartPath, empty);
			return "カートを空にしました。";
		}

		const cart = await loadCart(cartPath);
		if (subCommand === "show") {
			const summary = summarizeCart(
				cart,
				menu,
				optionNumber(parsed.options, "people", 1),
			);
			return json
				? JSON.stringify(summary, null, 2)
				: formatCartSummary(summary);
		}

		const itemToken = parsed.positionals.slice(1).join(" ");
		const item = findMenuItem(menu, itemToken);
		if (!item) throw new Error(`メニューが見つかりません: ${itemToken}`);
		const quantity = optionNumber(parsed.options, "qty", 1);
		const nextCart =
			subCommand === "remove"
				? removeCartLine(cart, item, quantity)
				: addCartLine(cart, item, quantity);
		await saveCart(cartPath, nextCart);
		const summary = summarizeCart(nextCart, menu);
		return formatCartSummary(summary);
	}

	throw new Error(`Unknown command: ${parsed.command}\n\n${helpText()}`);
}

if (import.meta.main) {
	runSaizeriyaCli(Bun.argv.slice(2))
		.then((output) => {
			console.log(output);
		})
		.catch((error) => {
			console.error(error instanceof Error ? error.message : String(error));
			process.exit(1);
		});
}
