import "dotenv/config";
import { defineConfig } from "@prisma/client/runtime/config";

export default defineConfig({
	datasources: {
		db: {
			url: "file:./dev.db",
		},
	},
});
