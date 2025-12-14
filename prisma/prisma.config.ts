// 本番用: PostgreSQL接続
import { defineConfig } from '@prisma/internals';

export default defineConfig({
  datasource: {
    provider: 'postgresql',
    adapter: process.env.DATABASE_URL, // 本番環境はDATABASE_URLを利用
  },
});
