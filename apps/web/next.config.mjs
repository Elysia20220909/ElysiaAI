import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const fastApiBaseUrl = process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000";
const appRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
	outputFileTracingRoot: appRoot,
	reactStrictMode: true,
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: `${fastApiBaseUrl}/:path*`,
			},
		];
	},
};

export default nextConfig;
