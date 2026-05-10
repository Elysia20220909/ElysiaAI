import { Elysia } from "elysia";
import { authErrorResponse, requireAccessToken } from "../lib/auth-cookies";
import { jsonError } from "../lib/constants";
import { fileUploadManager } from "../lib/file-upload";
import { logger } from "../lib/logger";

export const fileRoutes = new Elysia({ prefix: "/api/files" }).guard(
	{
		beforeHandle: ({ request }) => {
			try {
				requireAccessToken(request);
			} catch (error) {
				logger.warn("❌ [Files] Rejected auth request", {
					error: error instanceof Error ? error.message : "unknown",
				});
				return authErrorResponse(error);
			}
		},
	},
	(app) =>
		app
			.post("/upload", async ({ request }) => {
				let userId: string;
				try {
					const decoded = requireAccessToken(request);
					userId = String(decoded.username || decoded.userId || "operator");
				} catch (error) {
					return authErrorResponse(error, "Invalid token");
				}

				const formData = await request.formData();
				const file = formData.get("file") as File | null;
				if (!file) return jsonError(400, "No file provided");

				const buffer = Buffer.from(await file.arrayBuffer());
				const uploadedFile = await fileUploadManager.upload(
					buffer,
					file.name,
					file.type,
					{ userId },
				);

				return {
					success: true,
					file: {
						id: uploadedFile.id,
						originalName: uploadedFile.originalName,
						size: uploadedFile.size,
						mimeType: uploadedFile.mimeType,
					},
				};
			})
			.get("/:fileId", async ({ params }) => {
				const { fileId } = params;
				const file = fileUploadManager.getFile(fileId);
				if (!file) return jsonError(404, "File not found");

				const buffer = fileUploadManager.readFile(fileId);
				if (!buffer) return jsonError(404, "File not found");

				return new Response(new Uint8Array(buffer), {
					headers: {
						"content-type": file.mimeType,
						"content-disposition": `attachment; filename="${file.originalName}"`,
					},
				});
			})
			.get("/", async ({ request }) => {
				let userId: string;
				try {
					const decoded = requireAccessToken(request);
					userId = String(decoded.username || decoded.userId || "operator");
				} catch (error) {
					return authErrorResponse(error, "Invalid token");
				}

				const files = fileUploadManager.getUserFiles(userId);
				return {
					files: files.map((f) => ({
						id: f.id,
						originalName: f.originalName,
						size: f.size,
						mimeType: f.mimeType,
						uploadedAt: f.uploadedAt,
					})),
				};
			}),
);
