/**
 * File Upload Manager
 * ファイルアップロード・ストレージ管理
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { logger } from "./logger";

interface UploadOptions {
	maxSizeMB?: number;
	allowedTypes?: string[];
	userId?: string;
}

interface UploadedFile {
	id: string;
	originalName: string;
	filename: string;
	path: string;
	size: number;
	mimeType: string;
	userId?: string;
	uploadedAt: Date;
}

class FileUploadManager {
	private readonly UPLOAD_DIR: string;
	private readonly MAX_SIZE_MB: number;
	private readonly ALLOWED_TYPES: string[];
	private files: Map<string, UploadedFile>;

	constructor() {
		this.UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
		this.MAX_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB) || 10;
		this.ALLOWED_TYPES = [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
			"application/pdf",
			"text/plain",
			"text/markdown",
		];
		this.files = new Map();

		// アップロードディレクトリ作成
		if (!fs.existsSync(this.UPLOAD_DIR)) {
			fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
		}
	}

	/**
	 * ファイルをアップロード
	 */
	async upload(
		fileBuffer: Buffer,
		originalName: string,
		mimeType: string,
		options: UploadOptions = {},
	): Promise<UploadedFile> {
		// サイズチェック
		const maxSize = (options.maxSizeMB || this.MAX_SIZE_MB) * 1024 * 1024;
		if (fileBuffer.length > maxSize) {
			throw new Error(
				`File size exceeds ${options.maxSizeMB || this.MAX_SIZE_MB}MB limit`,
			);
		}

		// MIMEタイプチェック
		const allowedTypes = options.allowedTypes || this.ALLOWED_TYPES;
		if (!allowedTypes.includes(mimeType)) {
			throw new Error(`File type ${mimeType} is not allowed`);
		}

		// ファイルID生成
		const fileId = crypto.randomBytes(16).toString("hex");
		const ext = path.extname(originalName);
		const filename = `${fileId}${ext}`;
		const filePath = path.join(this.UPLOAD_DIR, filename);

		// ファイル保存
		fs.writeFileSync(filePath, fileBuffer);

		const uploadedFile: UploadedFile = {
			id: fileId,
			originalName,
			filename,
			path: filePath,
			size: fileBuffer.length,
			mimeType,
			userId: options.userId,
			uploadedAt: new Date(),
		};

		this.files.set(fileId, uploadedFile);

		logger.info("File uploaded", {
			fileId,
			originalName,
			size: fileBuffer.length,
		});

		return uploadedFile;
	}

	/**
	 * ファイルを取得
	 */
	getFile(fileId: string): UploadedFile | undefined {
		return this.files.get(fileId);
	}

	/**
	 * ファイルを読み込み
	 */
	readFile(fileId: string): Buffer | null {
		const file = this.files.get(fileId);
		if (!file) return null;

		try {
			return fs.readFileSync(file.path);
		} catch (error) {
			logger.error("Failed to read file", error as Error);
			return null;
		}
	}

	/**
	 * ファイルを削除
	 */
	deleteFile(fileId: string, userId?: string): boolean {
		const file = this.files.get(fileId);
		if (!file) return false;

		// 権限チェック
		if (userId && file.userId !== userId) {
			logger.warn("Unauthorized file deletion attempt", { fileId, userId });
			return false;
		}

		try {
			fs.unlinkSync(file.path);
			this.files.delete(fileId);

			logger.info("File deleted", { fileId });
			return true;
		} catch (error) {
			logger.error("Failed to delete file", error as Error);
			return false;
		}
	}

	/**
	 * ユーザーのファイル一覧を取得
	 */
	getUserFiles(userId: string): UploadedFile[] {
		return Array.from(this.files.values()).filter((f) => f.userId === userId);
	}

	/**
	 * 全ファイル一覧を取得
	 */
	listFiles(): UploadedFile[] {
		return Array.from(this.files.values());
	}

	/**
	 * 古いファイルをクリーンアップ
	 */
	cleanupOldFiles(maxAgeDays = 30) {
		const now = new Date();
		const cutoff = new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);

		let deletedCount = 0;

		for (const [fileId, file] of this.files.entries()) {
			if (file.uploadedAt < cutoff) {
				if (this.deleteFile(fileId)) {
					deletedCount++;
				}
			}
		}

		logger.info("Old files cleaned up", {
			deletedCount,
			maxAgeDays,
		});

		return deletedCount;
	}

	/**
	 * ストレージ使用量を取得
	 */
	getStorageStats() {
		let totalSize = 0;
		const filesByType: Record<string, number> = {};

		for (const file of this.files.values()) {
			totalSize += file.size;
			filesByType[file.mimeType] = (filesByType[file.mimeType] || 0) + 1;
		}

		return {
			totalFiles: this.files.size,
			totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
			filesByType,
		};
	}
}

export const fileUploadManager = new FileUploadManager();
