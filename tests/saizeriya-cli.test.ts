import { describe, expect, test } from "bun:test";
import {
	addCartLine,
	BUILT_IN_MENU,
	createEmptyCart,
	filterMenu,
	findMenuItem,
	formatCartSummary,
	formatYen,
	searchMenu,
	suggestCombo,
	summarizeCart,
} from "../scripts/saizeriya-cli";

describe("Saizeriya custom CLI helpers", () => {
	test("searches by code, Japanese name, and alias", () => {
		expect(findMenuItem(BUILT_IN_MENU, "2101")?.name).toBe("ミラノ風ドリア");
		expect(searchMenu(BUILT_IN_MENU, "ドリア")[0]?.code).toBe("2101");
		expect(searchMenu(BUILT_IN_MENU, "ペペ")[0]?.code).toBe("2303");
	});

	test("filters by budget, category, and check-store availability", () => {
		const meat = filterMenu(BUILT_IN_MENU, {
			category: "meat",
			maxPriceYen: 500,
		});

		expect(meat.map((item) => item.code)).toEqual(["2406"]);
		expect(
			filterMenu(BUILT_IN_MENU, {
				category: "meat",
				maxPriceYen: 500,
				includeCheckStore: true,
			}).map((item) => item.code),
		).toEqual(["2406", "2402"]);
	});

	test("suggests a combo within the requested budget", () => {
		const combo = suggestCombo(BUILT_IN_MENU, {
			budgetYen: 1000,
			people: 2,
		});

		expect(combo.items.length).toBeGreaterThanOrEqual(2);
		expect(combo.totalYen).toBeLessThanOrEqual(1000);
		expect(combo.perPersonYen).toBeLessThanOrEqual(500);
	});

	test("summarizes a cart and split bill", () => {
		const doria = findMenuItem(BUILT_IN_MENU, "ドリア");
		const chicken = findMenuItem(BUILT_IN_MENU, "辛味チキン");
		if (!doria || !chicken) throw new Error("fixture missing");

		let cart = createEmptyCart();
		cart = addCartLine(cart, doria, 2);
		cart = addCartLine(cart, chicken, 1);
		const summary = summarizeCart(cart, BUILT_IN_MENU, 3);

		expect(summary.totalYen).toBe(900);
		expect(summary.perPersonYen).toBe(300);
		expect(formatCartSummary(summary)).toContain("ミラノ風ドリア x2");
	});

	test("formats yen for Japanese CLI output", () => {
		expect(formatYen(1100)).toBe("1,100円");
	});
});
