import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

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

const pool = new Pool({ connectionString: getDatabaseUrl() });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@aarah.in';
  const password = process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!';
  const name = process.env.SEED_ADMIN_NAME || 'Aarah Founder';

  console.log(`Checking if ${email} exists...`);

  const existingAdmin = await prisma.admin.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log('Admin user already exists. Skipping creation.');
    return;
  }

  console.log('Hashing password...');
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('Creating admin...');
  await prisma.admin.create({
    data: {
      email,
      name,
      passwordHash: hashedPassword,
    },
  });

  console.log('✅ Admin created successfully!');
  console.log('-----------------------------------');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log('-----------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
