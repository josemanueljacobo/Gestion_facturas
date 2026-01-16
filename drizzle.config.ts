import { Config } from 'drizzle-kit';

export default {
    schema: './lib/db/schema.ts',
    out: './drizzle',
    driver: 'libsql',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'file:./data/database.db',
    },
} satisfies Config;
