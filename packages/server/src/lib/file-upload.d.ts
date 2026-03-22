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
declare class FileUploadManager {
	private readonly UPLOAD_DIR;
	private readonly MAX_SIZE_MB;
	private readonly ALLOWED_TYPES;
	private files;
	constructor();
	upload(
		fileBuffer: Buffer,
		originalName: string,
		mimeType: string,
		options?: UploadOptions,
	): Promise<UploadedFile>;
	getFile(fileId: string): UploadedFile | undefined;
	readFile(fileId: string): Buffer | null;
	deleteFile(fileId: string, userId?: string): boolean;
	getUserFiles(userId: string): UploadedFile[];
	listFiles(): UploadedFile[];
	cleanupOldFiles(maxAgeDays?: number): number;
	getStorageStats(): {
		totalFiles: number;
		totalSizeMB: string;
		filesByType: Record<string, number>;
	};
}
export declare const fileUploadManager: FileUploadManager;
export {};
//# sourceMappingURL=file-upload.d.ts.map
