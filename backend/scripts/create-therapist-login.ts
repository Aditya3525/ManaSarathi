/**
 * Script to create a User account linked to an existing Therapist,
 * enabling therapist portal login.
 *
 * Usage: npx tsx scripts/create-therapist-login.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const THERAPIST_LOGINS = [
  {
    therapistEmail: 'sarah.johnson@example.com',   // matches seed therapist
    portalEmail: 'therapist@demo.com',
    portalPassword: 'Therapist@123',
  },
  {
    therapistEmail: 'michael.chen@example.com',
    portalEmail: 'michael.chen@demo.com',
    portalPassword: 'Therapist@123',
  },
];

async function main() {
  console.log('🔗 Creating therapist portal login accounts...\n');

  for (const login of THERAPIST_LOGINS) {
    // Find the therapist by their profile email
    const therapist = await prisma.therapist.findFirst({
      where: { email: login.therapistEmail },
    });

    if (!therapist) {
      console.log(`❌ Therapist with email "${login.therapistEmail}" not found — skipping`);
      continue;
    }

    if (therapist.userId) {
      // Already linked
      const existingUser = await prisma.user.findUnique({ where: { id: therapist.userId } });
      console.log(`⚠️  "${therapist.name}" already has a portal account (${existingUser?.email})`);

      // Update the password so the demo credentials work
      const hashedPassword = await bcrypt.hash(login.portalPassword, 10);
      await prisma.user.update({
        where: { id: therapist.userId },
        data: { password: hashedPassword },
      });
      console.log(`   ✅ Password updated to: ${login.portalPassword}\n`);
      continue;
    }

    // Check if a User with the portal email already exists
    let user = await prisma.user.findUnique({ where: { email: login.portalEmail } });

    if (user) {
      // Link existing user
      const hashedPassword = await bcrypt.hash(login.portalPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(login.portalPassword, 10);
      user = await prisma.user.create({
        data: {
          email: login.portalEmail,
          name: therapist.name,
          password: hashedPassword,
          isOnboarded: true,
        },
      });
    }

    // Link user to therapist
    await prisma.therapist.update({
      where: { id: therapist.id },
      data: { userId: user.id },
    });

    console.log(`✅ "${therapist.name}"`);
    console.log(`   Email:    ${login.portalEmail}`);
    console.log(`   Password: ${login.portalPassword}\n`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
