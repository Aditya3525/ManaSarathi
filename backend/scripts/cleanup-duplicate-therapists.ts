import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Clean up duplicate therapist records.
 * Keeps the ORIGINAL set (cmir1h2f1...) and removes the duplicates (cmllzzr8y...).
 * Reassigns any bookings pointing to duplicates to the matching original therapist.
 */
async function main() {
  console.log('🔍 Checking for duplicate therapists...\n');

  const allTherapists = await prisma.therapist.findMany({
    select: { id: true, name: true, userId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by name to find duplicates
  const byName = new Map<string, typeof allTherapists>();
  for (const t of allTherapists) {
    const existing = byName.get(t.name) || [];
    existing.push(t);
    byName.set(t.name, existing);
  }

  let removedCount = 0;
  let reassignedBookings = 0;

  for (const [name, records] of byName) {
    if (records.length <= 1) continue;

    console.log(`⚠️  Found ${records.length} records for "${name}":`);
    records.forEach((r) =>
      console.log(`   ${r.id} | created=${r.createdAt.toISOString()} | userId=${r.userId || 'NONE'}`)
    );

    // Keep the first (oldest) record, remove the rest
    const [keep, ...duplicates] = records;
    console.log(`   ✅ Keeping: ${keep.id}`);

    for (const dup of duplicates) {
      // Reassign any bookings from duplicate to the original
      const moved = await prisma.therapistBooking.updateMany({
        where: { therapistId: dup.id },
        data: { therapistId: keep.id },
      });
      if (moved.count > 0) {
        console.log(`   📦 Reassigned ${moved.count} booking(s) from ${dup.id} → ${keep.id}`);
        reassignedBookings += moved.count;
      }

      // If duplicate has a userId but original doesn't, transfer it
      if (dup.userId && !keep.userId) {
        await prisma.therapist.update({
          where: { id: keep.id },
          data: { userId: dup.userId },
        });
        console.log(`   🔗 Transferred userId ${dup.userId} to ${keep.id}`);
      }

      // Delete the duplicate
      await prisma.therapist.delete({ where: { id: dup.id } });
      console.log(`   🗑️  Deleted duplicate: ${dup.id}`);
      removedCount++;
    }
    console.log('');
  }

  console.log(`\nDone! Removed ${removedCount} duplicate(s), reassigned ${reassignedBookings} booking(s).`);

  // Final state
  const remaining = await prisma.therapist.findMany({
    select: { id: true, name: true, userId: true },
    orderBy: { name: 'asc' },
  });
  console.log('\n=== REMAINING THERAPISTS ===');
  remaining.forEach((t) =>
    console.log(`  ${t.id} | ${t.name} | userId=${t.userId || 'NONE'}`)
  );

  const bookings = await prisma.therapistBooking.findMany({
    select: { id: true, therapistId: true, status: true },
  });
  console.log(`\n=== BOOKINGS (${bookings.length} total) ===`);
  bookings.forEach((b) =>
    console.log(`  ${b.id} → therapistId=${b.therapistId} | ${b.status}`)
  );

  await prisma.$disconnect();
}

main();
