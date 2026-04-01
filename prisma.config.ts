import { defineConfig } from '@prisma/config';
import 'dotenv/config';

function getDatasourceUrl() {
  const directUrl = process.env.DIRECT_URL?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (directUrl) return directUrl;
  if (databaseUrl) return databaseUrl;

  const url = new URL('postgresql://localhost');
  url.username = process.env.POSTGRES_USER ?? 'postgres';
  url.password = process.env.POSTGRES_PASSWORD ?? '';
  url.hostname = process.env.POSTGRES_HOST ?? 'localhost';
  url.port = process.env.POSTGRES_PORT ?? '3001';
  url.pathname = `/${process.env.POSTGRES_DB ?? 'postgres'}`;
  url.searchParams.set('schema', 'public');

  return url.toString();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: getDatasourceUrl(),
  },
  migrations: {
    seed: 'npx tsx ./prisma/seed.ts',
  }
});
