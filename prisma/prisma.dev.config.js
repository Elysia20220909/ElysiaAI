// 開発用: SQLiteローカルDB接続 (CommonJS形式)
module.exports = {
  schema: "./schema.dev.prisma",
  migrations: {
    path: "./migrations",
  },
  datasource: {
    provider: "sqlite",
    url: "file:../../dev.db", // 開発環境はローカルファイルDB
  },
};
