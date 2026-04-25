import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { abyssalMemory } from "../../server/src/lib/abyssal-memory-manager";
import { logger } from "../../server/src/lib/logger";

/**
 * 🌌 SMIN Orchestrator (Phase 180)
 * "The Weaver of the Abyssal Web."
 *
 * Manages multiple autonomous Python nodes, orchestrating onion circuits,
 * distributed file storage, and ZKP-based peer validation.
 */
export class MeshOrchestrator {
	private nodes: Map<string, ChildProcess> = new Map();
	private nodeCount = 3;
	private meshStatus: "IDLE" | "SYNCING" | "STABLE" = "IDLE";
	private dataDir = join(process.cwd(), "data", "mesh_lattice");

	constructor() {
		this.initializeLattice();
	}

	private initializeLattice() {
		logger.info("🕸️ SMIN: Initializing Mesh Lattice Construction...");
		if (!existsSync(this.dataDir)) mkdirSync(this.dataDir, { recursive: true });

		for (let i = 0; i < this.nodeCount; i++) {
			this.spawnNode(`NODE_0x${i.toString(16).toUpperCase()}`);
		}

		this.meshStatus = "SYNCING";
		this.monitorMeshHealth();
	}

	/**
	 * Python 側のノードプロセスを生成
	 * 試行錯誤: 標準入出力のバッファリングが原因でデッドロックが発生する可能性があるため、
	 * 共有メモリ(abyssalMemory)を主軸にした非同期ポーリングを採用。
	 */
	private spawnNode(nodeId: string) {
		const pythonPath = join(
			process.cwd(),
			"packages",
			"sovereign-mesh",
			"src",
			"abyssal_relay_node.py",
		);
		logger.info(`🔥 Igniting Mesh Node: ${nodeId}`);

		const proc = spawn("python", [pythonPath, nodeId]);

		proc.stdout?.on("data", (data) => {
			const msg = data.toString().trim();
			logger.info(`[${nodeId}] ${msg}`);

			// 共有メモリへの書き込みテスト (Trial 1: 直接書き込み)
			if (msg.includes("HANDSHAKE_READY")) {
				abyssalMemory.write(`INIT_AUTH:${nodeId}`);
			}
		});

		proc.stderr?.on("data", (data) => {
			logger.error(`[${nodeId}-ERR] ${data.toString()}`);
		});

		proc.on("close", (code) => {
			logger.warn(
				`🛑 Node ${nodeId} collapsed with exit code ${code}. Re-weaving...`,
			);
			this.nodes.delete(nodeId);
			setTimeout(() => this.spawnNode(nodeId), 5000); // Self-healing
		});

		this.nodes.set(nodeId, proc);
	}

	/**
	 * メッシュ全体の健康状態と同期を監視
	 */
	private monitorMeshHealth() {
		setInterval(() => {
			const activeCount = this.nodes.size;
			const memoryState = abyssalMemory.read();

			logger.info(
				`📊 Mesh Status: ${activeCount}/${this.nodeCount} nodes online. Memory: ${memoryState || "IDLE"}`,
			);

			if (activeCount === this.nodeCount) {
				this.meshStatus = "STABLE";
			} else {
				this.meshStatus = "SYNCING";
			}
		}, 10000);
	}

	/**
	 * オニオン回路の動的生成
	 */
	public async deployOnionCircuit(message: string): Promise<string> {
		logger.info("🧅 Orchestrating Onion Circuit for message exfiltration...");
		const nodeIds = Array.from(this.nodes.keys());
		if (nodeIds.length < 3)
			throw new Error("Insufficient nodes for circuit construction.");

		// ランダムなホップ選択
		const circuit = nodeIds.sort(() => 0.5 - Math.random()).slice(0, 3);
		logger.info(`📍 Circuit Mapped: ${circuit.join(" -> ")}`);

		// ここで Python 側に回路構築命令を Shared Memory 経由で飛ばす
		abyssalMemory.write(`BUILD_CIRCUIT:${circuit.join(",")}:${message}`);

		return "CIRCUIT_DEPLOYED";
	}
}

// 試行錯誤: 単一インスタンスでの実行を保証
export const meshOrchestrator = new MeshOrchestrator();
