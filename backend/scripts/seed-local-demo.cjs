const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const backendRoot = path.join(__dirname, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const normalizeSqliteDatabaseUrl = () => {
  const databaseUrl = (process.env.DATABASE_URL || '').trim();
  if (!databaseUrl.startsWith('file:')) return;

  const rawPath = databaseUrl.slice('file:'.length);
  if (!rawPath.startsWith('./') && !rawPath.startsWith('../')) return;

  const absolute = path.resolve(backendRoot, rawPath).replace(/\\/g, '/');
  process.env.DATABASE_URL = `file:${absolute}`;
};

normalizeSqliteDatabaseUrl();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const hashPassword = async (plain) => bcrypt.hash(plain, 10);

const upsertUser = async ({ email, password, name, firstName, lastName, approach }) => {
  const normalizedEmail = email.toLowerCase();
  const hashedPassword = await hashPassword(password);

  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      email: normalizedEmail,
      password: hashedPassword,
      name,
      firstName,
      lastName,
      isEmailVerified: true,
      approach,
      isOnboarded: true,
      dataConsent: true,
      clinicianSharing: false
    },
    create: {
      email: normalizedEmail,
      password: hashedPassword,
      name,
      firstName,
      lastName,
      isEmailVerified: true,
      approach,
      isOnboarded: true,
      dataConsent: true,
      clinicianSharing: false
    }
  });
};

async function run() {
  if (process.env.NODE_ENV === 'production') {
    console.log('[seed-local-demo] Skipping local demo seed in production mode.');
    return;
  }

  const seeded = [];

  seeded.push(await upsertUser({
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Local Admin',
    firstName: 'Local',
    lastName: 'Admin',
    approach: 'hybrid'
  }));

  seeded.push(await upsertUser({
    email: 'admin@mentalwellbeing.ai',
    password: 'admin123',
    name: 'Demo Admin',
    firstName: 'Demo',
    lastName: 'Admin',
    approach: 'western'
  }));

  seeded.push(await upsertUser({
    email: 'user@example.com',
    password: 'user123',
    name: 'Local User',
    firstName: 'Local',
    lastName: 'User',
    approach: 'hybrid'
  }));

  console.log('[seed-local-demo] Seeded demo users:');
  for (const user of seeded) {
    console.log(`- ${user.email}`);
  }
  console.log('[seed-local-demo] Credentials: admin@example.com/admin123, user@example.com/user123');
}

run()
  .catch((error) => {
    console.error('[seed-local-demo] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
