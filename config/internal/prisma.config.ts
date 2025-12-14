// 開発用: SQLiteローカルDB接続
import { defineConfig } from "prisma/config";

export default defineConfig({
	schema: "../../prisma/schema.prisma",
	migrations: {
		path: "../../prisma/migrations",
	},
	datasource: {
		provider: "sqlite",
		url: "file:../../dev.db", // 開発環境はローカルファイルDB
	},
});
