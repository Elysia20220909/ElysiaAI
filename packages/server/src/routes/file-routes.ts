import { Elysia } from "elysia";
import jwt from "jsonwebtoken";
import { CONFIG, jsonError } from "../lib/constants";
import { fileUploadManager } from "../lib/file-upload";
import { logger } from "../lib/logger";

export const fileRoutes = new Elysia({ prefix: "/api/files" }).guard(
	{
		beforeHandle: ({ request }) => {
			const auth = request.headers.get("authorization") || "";
			if (!auth.startsWith("Bearer ")) {
				logger.warn("❌ [Files] Rejected: Missing Bearer token");
				throw new Error("Missing Bearer token");
			}
			try {
				jwt.verify(auth.substring(7), CONFIG.JWT_SECRET);
			} catch {
				logger.warn("❌ [Files] Rejected: Invalid token");
				throw new Error("Invalid or expired token");
			}
		},
	},
	(app) =>
		app
			.post("/upload", async ({ request }) => {
				const auth = request.headers.get("authorization") || "";
				let userId: string;
				try {
					const decoded = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as {
						username: string;
					};
					userId = decoded.username;
				} catch {
					return jsonError(401, "Invalid token");
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
				const auth = request.headers.get("authorization") || "";
				let userId: string;
				try {
					const decoded = jwt.verify(auth.substring(7), CONFIG.JWT_SECRET) as {
						username: string;
					};
					userId = decoded.username;
				} catch {
					return jsonError(401, "Invalid token");
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
