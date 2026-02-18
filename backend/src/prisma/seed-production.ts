/**
 * Production seed: populates assessment templates if they don't already exist.
 * Safe to run on every deploy — skips if data is present.
 * Does NOT create demo users or admin accounts.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.assessmentDefinition.count();
  if (count > 0) {
    console.log(`✅ Assessment templates already exist (${count} found) — skipping seed.`);
    return;
  }

  console.log('🌱 No assessment templates found — running full seed...');

  // Dynamically import and run the full seed which includes seedAssessmentLibrary
  // We use ts-node to run the main seed.ts directly
  const { execSync } = await import('child_process');
  execSync('npx ts-node src/prisma/seed.ts', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env
  });

  console.log('✅ Seed complete');
}

main().catch(e => {
  console.error('❌ Seed check failed:', e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
