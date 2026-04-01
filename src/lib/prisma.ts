import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function getDatabaseUrl(): string {
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

function createPool(): Pool {
  return new Pool({
    connectionString: getDatabaseUrl(),
    max: 5,
    idleTimeoutMillis: 300000,
    connectionTimeoutMillis: 10000,
  });
}

function createPrismaClient(): PrismaClient {
  const pool = globalForPrisma.pool || createPool();

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
