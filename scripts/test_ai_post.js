// POST /ai のテストスクリプト
// `messages` (チャット形式の配列) を含むJSONボディを送信し、
// レスポンスのボディとステータスを表示します。

// URLはコマンドライン引数、環境変数、またはデフォルトのlocalhostから設定できます
const url = process.argv[2] || process.env.AI_URL || "http://localhost:3000/ai";

const body = {
	messages: [
		{
			role: "user",
			content: "こんにちは、日本語で応答してください。短い挨拶をお願いします。",
		},
	],
};

async function run() {
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		console.log("ステータス:", res.status);

		// テキストとして読み取る (AIエンドポイントはこのアプリでplain/textを返す)
		const text = await res.text();
		console.log("--- レスポンスボディ ---");
		console.log(text);
		console.log("--- レスポンス終了 ---");
	} catch (err) {
		console.error("リクエスト失敗:", err);
	}
}

run();
