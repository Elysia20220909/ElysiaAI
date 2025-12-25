import readline from "node:readline";

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const BASE_URL = "http://localhost:3000";

async function prompt(query: string): Promise<string> {
	return new Promise((resolve) =>
		rl.question(query, (ans) => resolve(ans.trim())),
	);
}

function printBoard(board: number[][]) {
	console.log("  0 1 2 3 4 5 6 7");
	for (let i = 0; i < 8; i++) {
		let row = `${i} `;
		for (let j = 0; j < 8; j++) {
			row += board[i][j] === 0 ? ". " : board[i][j] === 1 ? "● " : "○ ";
		}
		console.log(row);
	}
}

async function main() {
	console.log("=== Elysia Network Game CLI ===");
	const mode = await prompt("モード: 1=対人 2=AI 3=観戦 > ");

	while (true) {
		const res = await fetch(`${BASE_URL}/game/state`);
		const state = await res.json();
		printBoard(state.board);
		if (state.winner) {
			console.log(`\n=== 勝者: ${state.winner} ===`);
			break;
		}
		console.log(`ターン: ${state.turn === 1 ? "黒(●)" : "白(○)"}`);
		console.log("履歴:");
		state.history.slice(-5).forEach((h: string) => console.log(`  ${h}`));
		if (mode === "3") {
			await new Promise((r) => setTimeout(r, 1500));
			continue;
		}
		const input = await prompt("着手座標 x y（例: 2 3）: ");
		const [x, y] = input.split(/\s+/).map(Number);
		if (isNaN(x) || isNaN(y) || x < 0 || x > 7 || y < 0 || y > 7) {
			console.log("座標は0～7の数字で入力してください。");
			continue;
		}
		await fetch(`${BASE_URL}/game/action`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ x, y, player: state.turn }),
		});
	}
}

main();
