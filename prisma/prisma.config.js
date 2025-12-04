const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";

module.exports = {
	datasources: {
		db: {
			url: dbUrl,
		},
	},
};
