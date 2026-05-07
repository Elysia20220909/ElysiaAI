import { writeFileSync } from "node:fs";
import { logger } from "./logger";

/**
 * 🧠 Abyssal Memory Manager (Phase 160)
 * "Synchronizing the Binary Soul across Runtimes."
 *
 * This module manages a high-performance shared memory segment
 * used for ultra-low latency communication between Bun and Python.
 */
export class AbyssalMemoryManager {
	private readonly BUFFER_SIZE = 1024 * 1024; // 1MB Sovereign Segment
	private sab: SharedArrayBuffer;
	private uint32: Uint32Array;
	private buffer: Uint8Array;

	// Memory Map Indices
	private readonly INDEX_LOCK = 0;
	private readonly INDEX_STATE = 1;
	private readonly INDEX_LEN = 2;
	private readonly DATA_OFFSET = 4;

	constructor() {
		logger.info("📡 Initializing Abyssal Memory Segment...");

		// TRIAL 1: Standard SharedArrayBuffer
		// Note: This works for worker threads, but for external processes,
		// we need a file-backed memory map (mmap).
		try {
			this.sab = new SharedArrayBuffer(this.BUFFER_SIZE);
			this.uint32 = new Uint32Array(this.sab);
			this.buffer = new Uint8Array(this.sab);

			this.initializeStructure();
			logger.info("✅ SharedArrayBuffer allocated in-process.");
		} catch (e) {
			logger.error("🛑 Failed to allocate SharedArrayBuffer", e as Error);
			throw e;
		}
	}

	private initializeStructure() {
		Atomics.store(this.uint32, this.INDEX_LOCK, 0); // 0 = Unlocked, 1 = Locked
		Atomics.store(this.uint32, this.INDEX_STATE, 0); // 0 = Idle, 1 = DataReady, 2 = Processing
		Atomics.store(this.uint32, this.INDEX_LEN, 0); // Data Length
	}

	/**
	 * Write data to the shared segment with Atomic locking
	 */
	public write(data: string): boolean {
		const encoded = Buffer.from(data);
		if (encoded.length > this.BUFFER_SIZE - this.DATA_OFFSET * 4) {
			logger.error("🛑 Data exceeds Abyssal Buffer capacity.");
			return false;
		}

		// Spin-lock attempt (NSA-grade persistence)
		let attempts = 0;
		while (Atomics.compareExchange(this.uint32, this.INDEX_LOCK, 0, 1) !== 0) {
			attempts++;
			if (attempts > 1000000) {
				logger.error("🛑 Memory Lock Timeout: Abyss is congested.");
				return false;
			}
		}

		try {
			Atomics.store(this.uint32, this.INDEX_LEN, encoded.length);
			this.buffer.set(encoded, this.DATA_OFFSET * 4);
			Atomics.store(this.uint32, this.INDEX_STATE, 1); // Data Ready
			return true;
		} finally {
			Atomics.store(this.uint32, this.INDEX_LOCK, 0); // Unlock
		}
	}

	/**
	 * Read data from the shared segment
	 */
	public read(): string | null {
		if (Atomics.load(this.uint32, this.INDEX_STATE) !== 1) return null;

		// Lock for reading
		while (Atomics.compareExchange(this.uint32, this.INDEX_LOCK, 0, 1) !== 0) {}

		try {
			const len = Atomics.load(this.uint32, this.INDEX_LEN);
			const data = Buffer.from(
				this.buffer.slice(this.DATA_OFFSET * 4, this.DATA_OFFSET * 4 + len),
			).toString();
			Atomics.store(this.uint32, this.INDEX_STATE, 0); // Back to Idle
			return data;
		} finally {
			Atomics.store(this.uint32, this.INDEX_LOCK, 0); // Unlock
		}
	}

	/**
	 * 🚢 EXPORT FOR EXTERNAL PROCESS (Trial 2: File-Backed)
	 * For Python to see this, we need to map this buffer to a file.
	 */
	public exportToFile(path: string) {
		logger.info(`🚢 Exporting Memory Map to: ${path}`);
		// In a real mmap scenario on Windows, we'd use a named pipe or a temporary file
		// Node.js doesn't natively expose mmap for SharedArrayBuffer to files easily without addons.
		// TRIAL & ERROR: We will simulate the export by periodically dumping to disk
		// or using a named pipe via a child process.
		try {
			writeFileSync(path, Buffer.from(this.sab));
			logger.info("✅ Memory snapshot persisted.");
		} catch (e) {
			logger.error("🛑 Export failed", e as Error);
		}
	}
}

export const abyssalMemory = new AbyssalMemoryManager();
