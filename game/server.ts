// グローバル変数宣言
const ranking: Ranking = {};
let state: OthelloState = {
	board: Array.from({ length: 8 }, (_, y) =>
		Array.from({ length: 8 }, (_, x) =>
			(y === 3 && x === 3) || (y === 4 && x === 4)
				? 2
				: (y === 3 && x === 4) || (y === 4 && x === 3)
					? 1
					: 0,
		),
	),
	turn: 1,
	history: [],
	passCount: 0,
	aiEnabled: false,
};
const clients: Set<any> = new Set();

import { cors } from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";

// 型定義
type Cell = 0 | 1 | 2; // 0:空, 1:黒, 2:白
type Board = Cell[][];
type Player = 1 | 2; // 1:黒, 2:白
type OthelloState = {
	board: Board;
	turn: Player;
	history: string[];
	winner?: string;
	passCount: number;
	aiEnabled?: boolean;
	aiLevel?: "random" | "strong" | "god";
	userIds?: string[];
};
type Ranking = {
	[userId: string]: { win: number; lose: number; draw: number };
};

// ゲームロジック関数
function placeOthello(
	board: Board,
	x: number,
	y: number,
	player: Player,
): { board: Board; flipped: number } {
	if (board[y][x] !== 0) return { board, flipped: 0 };
	const dirs = [
		[-1, -1],
		[0, -1],
		[1, -1],
		[-1, 0],
		[1, 0],
		[-1, 1],
		[0, 1],
		[1, 1],
	];
	let flipped = 0;
	const newBoard = board.map((row) => [...row]);
	for (const [dx, dy] of dirs) {
		let nx = x + dx,
			ny = y + dy,
			line: [number, number][] = [];
		while (
			nx >= 0 &&
			nx < 8 &&
			ny >= 0 &&
			ny < 8 &&
			newBoard[ny][nx] === (player === 1 ? 2 : 1)
		) {
			line.push([nx, ny]);
			nx += dx;
			ny += dy;
		}
		if (
			line.length &&
			nx >= 0 &&
			nx < 8 &&
			ny >= 0 &&
			ny < 8 &&
			newBoard[ny][nx] === player
		) {
			for (const [fx, fy] of line) {
				newBoard[fy][fx] = player;
				flipped++;
			}
		}
	}
	if (flipped) newBoard[y][x] = player;
	return { board: newBoard, flipped };
}
function isGameOver(board: Board): boolean {
	if (board.flat().every((c) => c !== 0)) return true;
	for (const p of [1, 2] as Player[]) {
		for (let y = 0; y < 8; ++y)
			for (let x = 0; x < 8; ++x)
				if (placeOthello(board, x, y, p).flipped) return false;
	}
	return true;
}
function countStones(board: Board): [number, number] {
	let b = 0,
		w = 0;
	for (const row of board)
		for (const c of row) {
			if (c === 1) b++;
			else if (c === 2) w++;
		}
	return [b, w];
}
function evaluateBoard(board: Board, player: Player): number {
	let score = 0;
	for (let y = 0; y < 8; ++y)
		for (let x = 0; x < 8; ++x) {
			if (board[y][x] === player) {
				score += 1;
				if ((x === 0 || x === 7) && (y === 0 || y === 7)) score += 5;
			}
		}
	return score;
}
function alphabeta(
	board: Board,
	player: Player,
	depth: number,
	maximizing: boolean,
	alpha: number,
	beta: number,
	origPlayer: Player,
): number {
	if (depth === 0 || isGameOver(board)) return evaluateBoard(board, origPlayer);
	if (maximizing) {
		let maxEval = -Infinity;
		for (let y = 0; y < 8; ++y)
			for (let x = 0; x < 8; ++x) {
				if (placeOthello(board, x, y, player).flipped) {
					const nextPlayer = player === 1 ? 2 : 1;
					const evalScore = alphabeta(
						placeOthello(board, x, y, player).board,
						nextPlayer,
						depth - 1,
						false,
						alpha,
						beta,
						origPlayer,
					);
					maxEval = Math.max(maxEval, evalScore);
					alpha = Math.max(alpha, evalScore);
					if (beta <= alpha) break;
				}
			}
		return maxEval;
	} else {
		let minEval = Infinity;
		for (let y = 0; y < 8; ++y)
			for (let x = 0; x < 8; ++x) {
				if (placeOthello(board, x, y, player).flipped) {
					const nextPlayer = player === 1 ? 2 : 1;
					const evalScore = alphabeta(
						placeOthello(board, x, y, player).board,
						nextPlayer,
						depth - 1,
						true,
						alpha,
						beta,
						origPlayer,
					);
					minEval = Math.min(minEval, evalScore);
					beta = Math.min(beta, evalScore);
					if (beta <= alpha) break;
				}
			}
		return minEval;
	}
}
function getStrongAIMove(
	board: Board,
	player: Player,
): { x: number; y: number } | null {
	let bestScore = -Infinity,
		bestMove = null;
	for (let y = 0; y < 8; ++y)
		for (let x = 0; x < 8; ++x) {
			if (placeOthello(board, x, y, player).flipped) {
				const nextPlayer = player === 1 ? 2 : 1;
				const score = alphabeta(
					placeOthello(board, x, y, player).board,
					nextPlayer,
					1,
					false,
					-Infinity,
					Infinity,
					player,
				);
				if (score > bestScore) {
					bestScore = score;
					bestMove = { x, y };
				}
			}
		}
	return bestMove;
}
function getGodAIMove(
	board: Board,
	player: Player,
): { x: number; y: number } | null {
	const corners = [
		{ x: 0, y: 0 },
		{ x: 0, y: 7 },
		{ x: 7, y: 0 },
		{ x: 7, y: 7 },
	];
	for (const c of corners) {
		if (placeOthello(board, c.x, c.y, player).flipped) return c;
	}
	let bestScore = -Infinity,
		bestMove = null;
	for (let y = 0; y < 8; ++y)
		for (let x = 0; x < 8; ++x) {
			if (placeOthello(board, x, y, player).flipped) {
				const nextPlayer = player === 1 ? 2 : 1;
				const score = alphabeta(
					placeOthello(board, x, y, player).board,
					nextPlayer,
					3,
					false,
					-Infinity,
					Infinity,
					player,
				);
				if (score > bestScore) {
					bestScore = score;
					bestMove = { x, y };
				}
			}
		}
	return bestMove;
}
function getRandomLegalMove(
	board: Board,
	player: Player,
): { x: number; y: number } | null {
	const moves: { x: number; y: number }[] = [];
	for (let y = 0; y < 8; ++y)
		for (let x = 0; x < 8; ++x)
			if (placeOthello(board, x, y, player).flipped) moves.push({ x, y });
	if (moves.length === 0) return null;
	return moves[Math.floor(Math.random() * moves.length)];
}

const app = new Elysia()
	.use(
		cors({
			origin: "*",
			allowedHeaders: ["Content-Type"],
			methods: ["GET", "POST"],
		}),
	)
	.onAfterHandle(({ set }) => {
		set.headers["X-Content-Type-Options"] = "nosniff";
		set.headers["X-Frame-Options"] = "DENY";
		set.headers["X-XSS-Protection"] = "1; mode=block";
	})
	.use(openapi({ path: "/swagger", references: fromTypes() }))
	.get("/game/state", () => state)
	.post(
		"/game/start",
		({ body }) => {
			state = {
				board: Array.from({ length: 8 }, (_, y) =>
					Array.from({ length: 8 }, (_, x) =>
						(y === 3 && x === 3) || (y === 4 && x === 4)
							? 2
							: (y === 3 && x === 4) || (y === 4 && x === 3)
								? 1
								: 0,
					),
				),
				turn: 1,
				history: [],
				passCount: 0,
				aiEnabled: body && body.aiEnabled ? true : false,
				aiLevel:
					body && (body.aiLevel === "strong" || body.aiLevel === "god")
						? body.aiLevel
						: "random",
				userIds: body && body.userIds ? body.userIds : ["user1", "user2"],
			};
			clients.clear();
			return state;
		},
		{
			body: t.Optional(
				t.Object({
					aiEnabled: t.Boolean(),
					aiLevel: t.String(),
					userIds: t.Array(t.String()),
				}),
			),
		},
	)
	.post(
		"/game/action",
		({ body }) => {
			if (state.winner) return state;
			const { x, y, player } = body;
			if (player !== state.turn) return state;
			// 合法手判定と石を裏返す
			const result = placeOthello(state.board, x, y, player);
			if (!result.flipped) {
				state.passCount++;
				state.history.push(`不正な手/パス: (${x},${y}) by ${player}`);
				// 連続パスで終了
				if (state.passCount >= 2) {
					const [b, w] = countStones(state.board);
					if (b > w) state.winner = "黒";
					else if (w > b) state.winner = "白";
					else state.winner = "引き分け";
					state.history.push(`連続パスで終了: 黒${b} 白${w}`);
				}
				state.turn = (player === 1 ? 2 : 1) as Player;
				clients.forEach((ws) => ws.send(JSON.stringify(state)));
				return state;
			}
			state.board = result.board;
			// 角ボーナス
			const bonus = (x === 0 || x === 7) && (y === 0 || y === 7) ? 2 : 0;
			state.history.push(
				`Player ${player === 1 ? "黒" : "白"}: (${x},${y}) 反転${result.flipped}個${bonus ? " 角ボーナス+2" : ""}`,
			);
			state.turn = (player === 1 ? 2 : 1) as Player;
			state.passCount = 0;
			// 勝敗判定
			if (isGameOver(state.board)) {
				const [b, w] = countStones(state.board);
				let winnerId = "";
				if (b > w) {
					state.winner = "黒";
					winnerId = state.userIds ? state.userIds[0] : "user1";
				} else if (w > b) {
					state.winner = "白";
					winnerId = state.userIds ? state.userIds[1] : "user2";
				} else state.winner = "引き分け";
				state.history.push(`勝負終了: 黒${b} 白${w}`);
				// ランキング記録
				if (state.userIds) {
					const [u1, u2] = state.userIds;
					if (!ranking[u1]) ranking[u1] = { win: 0, lose: 0, draw: 0 };
					if (!ranking[u2]) ranking[u2] = { win: 0, lose: 0, draw: 0 };
					if (b > w) {
						ranking[u1].win++;
						ranking[u2].lose++;
					} else if (w > b) {
						ranking[u2].win++;
						ranking[u1].lose++;
					} else {
						ranking[u1].draw++;
						ranking[u2].draw++;
					}
				}
			}
			clients.forEach((ws) => ws.send(JSON.stringify(state)));
			// AI対戦
			if (state.aiEnabled && !state.winner && state.turn === 2) {
				setTimeout(() => {
					let aiMove = null;
					if (state.aiLevel === "god") {
						aiMove = getGodAIMove(state.board, 2);
					} else if (state.aiLevel === "strong") {
						aiMove = getStrongAIMove(state.board, 2);
					} else {
						aiMove = getRandomLegalMove(state.board, 2);
					}
					if (aiMove) {
						// 直接actionロジックを呼び出す
						const aiAction = { x: aiMove.x, y: aiMove.y, player: 2 };
						const result = placeOthello(
							state.board,
							aiAction.x,
							aiAction.y,
							aiAction.player,
						);
						if (!result.flipped) {
							state.passCount++;
							state.history.push(
								`不正な手/パス: (${aiAction.x},${aiAction.y}) by ${aiAction.player}`,
							);
							if (state.passCount >= 2) {
								const [b, w] = countStones(state.board);
								if (b > w) state.winner = "黒";
								else if (w > b) state.winner = "白";
								else state.winner = "引き分け";
								state.history.push(`連続パスで終了: 黒${b} 白${w}`);
							}
							state.turn = (aiAction.player === 1 ? 2 : 1) as Player;
							clients.forEach((ws) => ws.send(JSON.stringify(state)));
							return;
						}
						state.board = result.board;
						const bonus =
							(aiAction.x === 0 || aiAction.x === 7) &&
							(aiAction.y === 0 || aiAction.y === 7)
								? 2
								: 0;
						state.history.push(
							`Player ${aiAction.player === 1 ? "黒" : "白"}: (${aiAction.x},${aiAction.y}) 反転${result.flipped}個${bonus ? " 角ボーナス+2" : ""}`,
						);
						state.turn = (aiAction.player === 1 ? 2 : 1) as Player;
						state.passCount = 0;
						if (isGameOver(state.board)) {
							const [b, w] = countStones(state.board);
							let winnerId = "";
							if (b > w) {
								state.winner = "黒";
								winnerId = state.userIds ? state.userIds[0] : "user1";
							} else if (w > b) {
								state.winner = "白";
								winnerId = state.userIds ? state.userIds[1] : "user2";
							} else state.winner = "引き分け";
							state.history.push(`勝負終了: 黒${b} 白${w}`);
							if (state.userIds) {
								const [u1, u2] = state.userIds;
								if (!ranking[u1]) ranking[u1] = { win: 0, lose: 0, draw: 0 };
								if (!ranking[u2]) ranking[u2] = { win: 0, lose: 0, draw: 0 };
								if (b > w) {
									ranking[u1].win++;
									ranking[u2].lose++;
								} else if (w > b) {
									ranking[u2].win++;
									ranking[u1].lose++;
								} else {
									ranking[u1].draw++;
									ranking[u2].draw++;
								}
							}
						}
						clients.forEach((ws) => ws.send(JSON.stringify(state)));
					}
				}, 500);
			}
			// 最強AI: 評価関数＋αβ探索（深さ4）＋定石（角優先）
			function getGodAIMove(
				board: Board,
				player: Player,
			): { x: number; y: number } | null {
				// 角優先
				const corners = [
					{ x: 0, y: 0 },
					{ x: 0, y: 7 },
					{ x: 7, y: 0 },
					{ x: 7, y: 7 },
				];
				for (const c of corners) {
					if (placeOthello(board, c.x, c.y, player).flipped) return c;
				}
				let bestScore = -Infinity,
					bestMove = null;
				for (let y = 0; y < 8; ++y)
					for (let x = 0; x < 8; ++x) {
						if (placeOthello(board, x, y, player).flipped) {
							const score = alphabeta(
								board,
								player,
								4,
								true,
								-Infinity,
								Infinity,
								player,
								x,
								y,
							);
							if (score > bestScore) {
								bestScore = score;
								bestMove = { x, y };
							}
						}
					}
				return bestMove;
			}

			// αβ探索（深さ4）
			// αβ探索（深さ2/4）: Player型修正
			function alphabeta(
				board: Board,
				player: Player,
				depth: number,
				maximizing: boolean,
				alpha: number,
				beta: number,
				origPlayer: Player,
			): number {
				if (depth === 0 || isGameOver(board))
					return evaluateBoard(board, origPlayer);
				if (maximizing) {
					let maxEval = -Infinity;
					for (let y = 0; y < 8; ++y)
						for (let x = 0; x < 8; ++x) {
							if (placeOthello(board, x, y, player).flipped) {
								const nextPlayer = player === 1 ? 2 : 1;
								const evalScore = alphabeta(
									placeOthello(board, x, y, player).board,
									nextPlayer,
									depth - 1,
									false,
									alpha,
									beta,
									origPlayer,
								);
								maxEval = Math.max(maxEval, evalScore);
								alpha = Math.max(alpha, evalScore);
								if (beta <= alpha) break;
							}
						}
					return maxEval;
				} else {
					let minEval = Infinity;
					for (let y = 0; y < 8; ++y)
						for (let x = 0; x < 8; ++x) {
							if (placeOthello(board, x, y, player).flipped) {
								const nextPlayer = player === 1 ? 2 : 1;
								const evalScore = alphabeta(
									placeOthello(board, x, y, player).board,
									nextPlayer,
									depth - 1,
									true,
									alpha,
									beta,
									origPlayer,
								);
								minEval = Math.min(minEval, evalScore);
								beta = Math.min(beta, evalScore);
								if (beta <= alpha) break;
							}
						}
					return minEval;
				}
			}

			// ランキングAPIはappチェーン内で宣言
			// 強いAI: 評価関数＋αβ探索（深さ2）
			function getStrongAIMove(
				board: Board,
				player: Player,
			): { x: number; y: number } | null {
				let bestScore = -Infinity,
					bestMove = null;
				for (let y = 0; y < 8; ++y)
					for (let x = 0; x < 8; ++x) {
						if (placeOthello(board, x, y, player).flipped) {
							const nextPlayer = player === 1 ? 2 : 1;
							const score = alphabeta(
								placeOthello(board, x, y, player).board,
								nextPlayer,
								1,
								false,
								-Infinity,
								Infinity,
								player,
							);
							if (score > bestScore) {
								bestScore = score;
								bestMove = { x, y };
							}
						}
					}
				return bestMove;
			}

			// 評価関数: 角+石数
			function evaluateBoard(board: Board, player: Player): number {
				let score = 0;
				for (let y = 0; y < 8; ++y)
					for (let x = 0; x < 8; ++x) {
						if (board[y][x] === player) {
							score += 1;
							if ((x === 0 || x === 7) && (y === 0 || y === 7)) score += 5;
						}
					}
				return score;
			}

			// αβ探索（深さ2）
			function alphabeta(
				board: Board,
				player: Player,
				depth: number,
				maximizing: boolean,
				alpha: number,
				beta: number,
				origPlayer: Player,
			): number {
				if (depth === 0 || isGameOver(board))
					return evaluateBoard(board, origPlayer);
				if (maximizing) {
					let maxEval = -Infinity;
					for (let y = 0; y < 8; ++y)
						for (let x = 0; x < 8; ++x) {
							if (placeOthello(board, x, y, player).flipped) {
								const nextPlayer = player === 1 ? 2 : 1;
								const evalScore = alphabeta(
									placeOthello(board, x, y, player).board,
									nextPlayer,
									depth - 1,
									false,
									alpha,
									beta,
									origPlayer,
								);
								maxEval = Math.max(maxEval, evalScore);
								alpha = Math.max(alpha, evalScore);
								if (beta <= alpha) break;
							}
						}
					return maxEval;
				} else {
					let minEval = Infinity;
					for (let y = 0; y < 8; ++y)
						for (let x = 0; x < 8; ++x) {
							if (placeOthello(board, x, y, player).flipped) {
								const nextPlayer = player === 1 ? 2 : 1;
								const evalScore = alphabeta(
									placeOthello(board, x, y, player).board,
									nextPlayer,
									depth - 1,
									true,
									alpha,
									beta,
									origPlayer,
								);
								minEval = Math.min(minEval, evalScore);
								beta = Math.min(beta, evalScore);
								if (beta <= alpha) break;
							}
						}
					return minEval;
				}
			}
			return state;
		},
		{
			body: t.Object({ x: t.Number(), y: t.Number(), player: t.Number() }),
		},
	);
// Elysiaチェーン末尾にAPI宣言
app
	.get("/game/ranking", () => ranking)
	.ws("/game/ws", {
		open(ws: any) {
			clients.add(ws);
			ws.send(JSON.stringify(state));
		},
		close(ws: any) {
			clients.delete(ws);
		},
		message(ws: any, msg: string) {
			try {
				const action = JSON.parse(typeof msg === "string" ? msg : "");
				if (
					typeof action.x === "number" &&
					typeof action.y === "number" &&
					typeof action.player === "number"
				) {
					const result = placeOthello(
						state.board,
						action.x,
						action.y,
						action.player,
					);
					if (!result.flipped) {
						state.passCount++;
						state.history.push(
							`不正な手/パス: (${action.x},${action.y}) by ${action.player}`,
						);
						if (state.passCount >= 2) {
							const [b, w] = countStones(state.board);
							if (b > w) state.winner = "黒";
							else if (w > b) state.winner = "白";
							else state.winner = "引き分け";
							state.history.push(`連続パスで終了: 黒${b} 白${w}`);
						}
						state.turn = (action.player === 1 ? 2 : 1) as Player;
						clients.forEach((ws) => ws.send(JSON.stringify(state)));
						return;
					}
					state.board = result.board;
					const bonus =
						(action.x === 0 || action.x === 7) &&
						(action.y === 0 || action.y === 7)
							? 2
							: 0;
					state.history.push(
						`Player ${action.player === 1 ? "黒" : "白"}: (${action.x},${action.y}) 反転${result.flipped}個${bonus ? " 角ボーナス+2" : ""}`,
					);
					state.turn = (action.player === 1 ? 2 : 1) as Player;
					state.passCount = 0;
					if (isGameOver(state.board)) {
						const [b, w] = countStones(state.board);
						let winnerId = "";
						if (b > w) {
							state.winner = "黒";
							winnerId = state.userIds ? state.userIds[0] : "user1";
						} else if (w > b) {
							state.winner = "白";
							winnerId = state.userIds ? state.userIds[1] : "user2";
						} else state.winner = "引き分け";
						state.history.push(`勝負終了: 黒${b} 白${w}`);
						if (state.userIds) {
							const [u1, u2] = state.userIds;
							if (!ranking[u1]) ranking[u1] = { win: 0, lose: 0, draw: 0 };
							if (!ranking[u2]) ranking[u2] = { win: 0, lose: 0, draw: 0 };
							if (b > w) {
								ranking[u1].win++;
								ranking[u2].lose++;
							} else if (w > b) {
								ranking[u2].win++;
								ranking[u1].lose++;
							} else {
								ranking[u1].draw++;
								ranking[u2].draw++;
							}
						}
					}
					clients.forEach((ws) => ws.send(JSON.stringify(state)));
				}
			} catch {}
		},
	});
