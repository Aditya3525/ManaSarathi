const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

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

const prisma = new PrismaClient();

const globalResources = [
  {
    name: 'FindaHelpline (Global Directory)',
    type: 'WEBSITE',
    website: 'https://findahelpline.com/',
    description:
      'Free global directory to find mental health, suicide prevention, domestic violence, and crisis helplines by country.',
    availability: '24/7 (directory access)',
    country: 'GLOBAL',
    language: 'Multiple languages',
    order: 90,
    tags: 'global, directory, free, crisis resources'
  },
  {
    name: 'Befrienders Worldwide (Global Directory)',
    type: 'WEBSITE',
    website: 'https://www.befrienders.org/',
    description:
      'Free international directory of emotional support and suicide prevention helplines across many countries.',
    availability: '24/7 (directory access)',
    country: 'GLOBAL',
    language: 'Multiple languages',
    order: 91,
    tags: 'global, suicide prevention, emotional support, free'
  }
];

async function upsertByNameAndCountry(resource) {
  const existing = await prisma.crisisResource.findFirst({
    where: {
      name: resource.name,
      country: resource.country
    },
    select: { id: true }
  });

  if (existing) {
    await prisma.crisisResource.update({
      where: { id: existing.id },
      data: resource
    });
    return 'updated';
  }

  await prisma.crisisResource.create({ data: resource });
  return 'created';
}

async function run() {
  let created = 0;
  let updated = 0;

  for (const resource of globalResources) {
    const result = await upsertByNameAndCountry(resource);
    if (result === 'created') created += 1;
    if (result === 'updated') updated += 1;
  }

  console.log(`[seed-crisis-global] created=${created} updated=${updated}`);
}

run()
  .catch((error) => {
    console.error('[seed-crisis-global] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
