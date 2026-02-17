import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // All therapists
  const therapists = await prisma.therapist.findMany({
    select: { id: true, name: true, userId: true, isActive: true, isVerified: true },
  });
  console.log('=== ALL THERAPISTS ===');
  therapists.forEach((t) =>
    console.log(`  ${t.id} | ${t.name} | userId=${t.userId || 'NONE'} | active=${t.isActive} | verified=${t.isVerified}`)
  );

  // Check the public listing query
  const publicList = await prisma.therapist.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  console.log('\n=== PUBLIC LISTING (what users see) ===');
  publicList.forEach((t) => console.log(`  ${t.id} | ${t.name}`));

  // All bookings
  const bookings = await prisma.therapistBooking.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      therapistId: true,
      status: true,
      preferredDate: true,
      createdAt: true,
      user: { select: { email: true } },
      therapist: { select: { name: true, userId: true } },
    },
  });
  console.log('\n=== ALL BOOKINGS ===');
  bookings.forEach((b) =>
    console.log(`  ${b.id} | user=${b.user.email}(${b.userId}) -> therapist=${b.therapist.name}(${b.therapistId}, linkedUser=${b.therapist.userId || 'NONE'}) | ${b.status}`)
  );

  await prisma.$disconnect();
}

main();
