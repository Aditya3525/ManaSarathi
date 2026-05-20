import { seedAdminCatalog } from './seed-admin-catalog';
import { seedRequiredData } from '../src/prisma/seed-production';

async function main() {
  console.log('🌱 Deployment seed — seeding admin catalog and required data...\n');

  await seedAdminCatalog();
  await seedRequiredData();

  console.log('\n🎉 Deployment seed complete!');
}

main().catch((error) => {
  console.error('❌ Deployment seed failed:', error);
  process.exit(1);
});