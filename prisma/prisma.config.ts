import "dotenv/config";

export default {
	datasources: {
		db: {
			url: process.env.DATABASE_URL || "file:./prisma/dev.db",
		},
	},
};
