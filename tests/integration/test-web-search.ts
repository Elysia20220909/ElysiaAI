/**
 * Web検索APIのテスト
 * インターネット接続機能の動作確認
 */

import {
	getLatestNews,
	getWeather,
	type NewsArticle,
	searchRelevantInfo,
	searchWeb,
	searchWikipedia,
	type WebSearchResult,
} from "./src/lib/web-search";

async function testWebSearch() {
	console.log("=== Web検索機能テスト ===\n");

	// 1. Wikipedia検索
	console.log("1. Wikipedia検索: AI");
	try {
		const wiki = await searchWikipedia("人工知能");
		if (wiki) {
			console.log(`タイトル: ${wiki.title}`);
			console.log(`概要: ${wiki.summary}`);
			console.log(`URL: ${wiki.url}\n`);
		} else {
			console.log("結果なし\n");
		}
	} catch (error) {
		console.error("エラー:", error, "\n");
	}

	// 2. 天気情報
	console.log("2. 天気情報: 東京");
	try {
		const weather = await getWeather("東京");
		if (weather) {
			console.log(`場所: ${weather.location}`);
			console.log(`天気: ${weather.description}`);
			console.log(`気温: ${weather.temperature}℃`);
			console.log(`湿度: ${weather.humidity}%`);
			console.log(`風速: ${weather.windSpeed}m/s\n`);
		} else {
			console.log("結果なし\n");
		}
	} catch (error) {
		console.error("エラー:", error, "\n");
	}

	// 3. ニュース
	console.log("3. 最新ニュース");
	try {
		const news = await getLatestNews("general");
		if (news.length > 0) {
			news.slice(0, 3).forEach((n: NewsArticle, i: number) => {
				console.log(`[${i + 1}] ${n.title}`);
				console.log(`    ${n.description}`);
				console.log(`    ${n.url}`);
			});
			console.log();
		} else {
			console.log("結果なし\n");
		}
	} catch (error) {
		console.error("エラー:", error, "\n");
	}

	// 4. Web検索
	console.log("4. Web検索: TypeScript");
	try {
		const results = await searchWeb("TypeScript programming language");
		if (results.length > 0) {
			results.slice(0, 2).forEach((r: WebSearchResult, i: number) => {
				console.log(`[${i + 1}] ${r.title}`);
				console.log(`    ${r.snippet}`);
				console.log(`    ${r.url}`);
			});
			console.log();
		} else {
			console.log("結果なし\n");
		}
	} catch (error) {
		console.error("エラー:", error, "\n");
	}

	// 5. 統合検索
	console.log("5. 統合検索: 今日の天気");
	try {
		const info = await searchRelevantInfo("今日の東京の天気");
		console.log(info);
		console.log();
	} catch (error) {
		console.error("エラー:", error, "\n");
	}

	console.log("=== テスト完了 ===");
}

// 実行
testWebSearch().catch(console.error);
