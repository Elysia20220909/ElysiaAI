// DB接続先はadapterで切り替え（Prisma 7推奨構成）
const isDev = process.env.NODE_ENV !== 'production';
module.exports = {
  datasource: {
    provider: isDev ? 'sqlite' : 'postgresql',
    adapter: isDev ? 'file:../../dev.db' : process.env.DATABASE_URL,
  },
};
