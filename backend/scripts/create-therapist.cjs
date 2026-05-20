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

async function main() {
  console.log('Creating demo therapist via Prisma...');

  const portalEmail = 'therapist@demo.com';
  const portalPassword = 'Therapist@123';
  const name = 'Automated Therapist';

  // Ensure user account
  const normalizedEmail = portalEmail.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  const hashed = await bcrypt.hash(portalPassword, 10);
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed, isEmailVerified: true } });
    console.log('Updated existing user password for', normalizedEmail);
  } else {
    user = await prisma.user.create({ data: { email: normalizedEmail, name, password: hashed, isEmailVerified: true, isOnboarded: true } });
    console.log('Created user', normalizedEmail);
  }

  // Create therapist if not exists
  const existing = await prisma.therapist.findFirst({ where: { name } });
  if (existing) {
    await prisma.therapist.update({ where: { id: existing.id }, data: { userId: user.id, isActive: true, isVerified: true } });
    console.log('Linked existing therapist to user', user.id);
  } else {
    const therapist = await prisma.therapist.create({ data: {
      name,
      credential: 'LCSW',
      title: 'Licensed Clinical Social Worker',
      bio: 'Created for automated E2E tests',
      specialtiesJson: JSON.stringify(['Anxiety','Depression']),
      email: 'therapist.demo@example.com',
      userId: user.id,
      isActive: true,
      isVerified: true
    } });
    console.log('Created therapist', therapist.id);
  }

  console.log('Done');
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
