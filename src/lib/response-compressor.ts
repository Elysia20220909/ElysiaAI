/**
 * Response Compression Middleware
 * gzip/brotli圧縮でレスポンスサイズを削減
 */

import { brotliCompressSync, gzipSync } from "node:zlib";
import { logger } from "./logger";

interface CompressionOptions {
	threshold?: number; // Minimum size to compress (bytes)
	level?: number; // Compression level (0-9)
	preferBrotli?: boolean;
}

class ResponseCompressor {
	private readonly defaultThreshold = 1024; // 1KB
	private readonly defaultLevel = 6; // Balanced
	private stats = {
		totalRequests: 0,
		compressedRequests: 0,
		originalBytes: 0,
		compressedBytes: 0,
	};

	/**
	 * 圧縮すべきか判定
	 */
	shouldCompress(
		contentType: string,
		size: number,
		threshold: number,
	): boolean {
		if (size < threshold) return false;

		const compressibleTypes = [
			"text/",
			"application/json",
			"application/javascript",
			"application/xml",
			"application/x-javascript",
			"image/svg+xml",
		];

		return compressibleTypes.some((type) => contentType.includes(type));
	}

	/**
	 * Brotli圧縮をサポートしているか
	 */
	supportsBrotli(acceptEncoding: string): boolean {
		return acceptEncoding.includes("br");
	}

	/**
	 * gzip圧縮をサポートしているか
	 */
	supportsGzip(acceptEncoding: string): boolean {
		return acceptEncoding.includes("gzip");
	}

	/**
	 * レスポンスを圧縮
	 */
	compressResponse(
		body: string | Buffer,
		acceptEncoding: string,
		options?: CompressionOptions,
	): {
		compressed: Buffer;
		encoding: "br" | "gzip" | "identity";
		originalSize: number;
		compressedSize: number;
	} {
		const threshold = options?.threshold || this.defaultThreshold;
		const level = options?.level || this.defaultLevel;
		const preferBrotli = options?.preferBrotli ?? true;

		const buffer = typeof body === "string" ? Buffer.from(body) : body;
		const originalSize = buffer.length;

		this.stats.totalRequests++;
		this.stats.originalBytes += originalSize;

		// Check if compression is needed
		if (buffer.length < threshold) {
			return {
				compressed: buffer,
				encoding: "identity",
				originalSize,
				compressedSize: originalSize,
			};
		}

		try {
			// Brotli compression (better compression ratio)
			if (preferBrotli && this.supportsBrotli(acceptEncoding)) {
				const compressed = brotliCompressSync(buffer, {
					params: {
						[11]: level, // BROTLI_PARAM_QUALITY
					},
				});
				this.stats.compressedRequests++;
				this.stats.compressedBytes += compressed.length;
				logger.debug("Brotli compression", {
					original: originalSize,
					compressed: compressed.length,
					ratio: `${((1 - compressed.length / originalSize) * 100).toFixed(1)}%`,
				});
				return {
					compressed,
					encoding: "br",
					originalSize,
					compressedSize: compressed.length,
				};
			}

			// gzip compression (widely supported)
			if (this.supportsGzip(acceptEncoding)) {
				const compressed = gzipSync(buffer, { level });
				this.stats.compressedRequests++;
				this.stats.compressedBytes += compressed.length;
				logger.debug("gzip compression", {
					original: originalSize,
					compressed: compressed.length,
					ratio: `${((1 - compressed.length / originalSize) * 100).toFixed(1)}%`,
				});
				return {
					compressed,
					encoding: "gzip",
					originalSize,
					compressedSize: compressed.length,
				};
			}

			// No compression support
			return {
				compressed: buffer,
				encoding: "identity",
				originalSize,
				compressedSize: originalSize,
			};
		} catch (error) {
			logger.error(
				`Compression error: ${error instanceof Error ? error.message : String(error)}`,
			);
			return {
				compressed: buffer,
				encoding: "identity",
				originalSize,
				compressedSize: originalSize,
			};
		}
	}

	/**
	 * 統計情報取得
	 */
	getStats(): {
		totalRequests: number;
		compressedRequests: number;
		compressionRate: string;
		originalBytes: number;
		compressedBytes: number;
		savedBytes: number;
		savingsRate: string;
	} {
		const savedBytes = this.stats.originalBytes - this.stats.compressedBytes;
		const compressionRate =
			this.stats.totalRequests > 0
				? (
						(this.stats.compressedRequests / this.stats.totalRequests) *
						100
					).toFixed(1)
				: "0.0";
		const savingsRate =
			this.stats.originalBytes > 0
				? ((savedBytes / this.stats.originalBytes) * 100).toFixed(1)
				: "0.0";

		return {
			totalRequests: this.stats.totalRequests,
			compressedRequests: this.stats.compressedRequests,
			compressionRate: `${compressionRate}%`,
			originalBytes: this.stats.originalBytes,
			compressedBytes: this.stats.compressedBytes,
			savedBytes,
			savingsRate: `${savingsRate}%`,
		};
	}

	/**
	 * 統計リセット
	 */
	resetStats(): void {
		this.stats = {
			totalRequests: 0,
			compressedRequests: 0,
			originalBytes: 0,
			compressedBytes: 0,
		};
		logger.info("Compression statistics reset");
	}
}

export const responseCompressor = new ResponseCompressor();

/**
 * Elysiaミドルウェアとして使用
 */
export function createCompressionMiddleware(options?: CompressionOptions) {
	return {
		onAfterHandle: ({
			request,
			response,
			set,
		}: {
			request: Request;
			response: Response | string | object;
			set: { headers: Record<string, string> };
		}) => {
			const acceptEncoding = request.headers.get("accept-encoding") || "";

			// Skip if already encoded
			if (set.headers["content-encoding"]) return;

			let body: string | Buffer;
			let contentType = set.headers["content-type"] || "text/plain";

			// Convert response to buffer
			if (typeof response === "string") {
				body = response;
			} else if (response instanceof Response) {
				return; // Skip Response objects
			} else if (typeof response === "object") {
				body = JSON.stringify(response);
				contentType = "application/json";
			} else {
				return;
			}

			const threshold = options?.threshold || 1024;

			// Check if compression is beneficial
			if (
				!responseCompressor.shouldCompress(
					contentType,
					Buffer.byteLength(body),
					threshold,
				)
			) {
				return;
			}

			// Compress response
			const result = responseCompressor.compressResponse(
				body,
				acceptEncoding,
				options,
			);

			if (result.encoding !== "identity") {
				set.headers["content-encoding"] = result.encoding;
				set.headers.vary = "Accept-Encoding";
				return result.compressed;
			}
		},
	};
}
