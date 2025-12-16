// 本番用: PostgreSQL接続

import { defineConfig } from "@prisma/internals";

export default defineConfig({
  datasources: {
    db: {
      provider: "postgresql",
      adapter: process.env.DATABASE_URL,
    },
  },
});
