const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createOrResetAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD || 'admin123';

  console.log(`Upserting admin user: ${adminEmail}`);

  try {
    const hashed = await bcrypt.hash(adminPassword, 10);

    const user = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: 'Admin',
        password: hashed,
        isOnboarded: true,
        dataConsent: true,
      },
      create: {
        email: adminEmail,
        name: 'Admin',
        password: hashed,
        isOnboarded: true,
        dataConsent: true,
      }
    });

    console.log(`✅ Admin user upserted: ${user.email}`);
    console.log('Important: ensure this email is included in the ADMIN_EMAILS env var on your deployment.');
    console.log(`Login with: ${adminEmail} / ${adminPassword}`);
  } catch (error) {
    console.error('❌ Error creating/updating admin user:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

createOrResetAdmin()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  });
