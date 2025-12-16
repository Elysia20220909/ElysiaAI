// Prisma 7 config for PostgreSQL (CommonJS)
require('dotenv/config');

module.exports = {
  datasources: {
    db: {
      provider: 'postgresql',
      adapter: process.env.DATABASE_URL,
    },
  },
};
