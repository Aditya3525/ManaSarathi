const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

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

(async () => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) throw new Error('JWT_SECRET missing');

    const base = 'http://localhost:5000';
    const log = (...args) => console.log(...args);

    const health = await fetch(base + '/api/health');
    const healthJson = await health.json();
    const csrf = healthJson.csrfToken;
    const setCookie = health.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0] || '';

    const user = await prisma.user.findUnique({ where: { email: 'user@example.com' } });
    const userToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    const beforeCount = await prisma.journalEntry.count({ where: { userId: user.id } });
    log('JOURNAL COUNT BEFORE', beforeCount);

    log('\n=== TRANSACTION TEST: CREATE -> UPDATE -> DELETE ===');
    let res = await fetch(base + '/api/journal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + userToken,
        'X-CSRF-Token': csrf,
        'Cookie': cookie
      },
      body: JSON.stringify({ content: 'Consistency test entry', mood: 'calm', tags: ['consistency'] })
    });
    log('CREATE STATUS', res.status);
    const created = await res.json();
    const journalId = created?.data?.id;
    log('ENTRY ID', journalId);

    const afterCreateCount = await prisma.journalEntry.count({ where: { userId: user.id } });
    log('JOURNAL COUNT AFTER CREATE', afterCreateCount);

    res = await fetch(base + `/api/journal/${journalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + userToken,
        'X-CSRF-Token': csrf,
        'Cookie': cookie
      },
      body: JSON.stringify({ content: 'Consistency test entry updated', mood: 'hopeful' })
    });
    log('UPDATE STATUS', res.status);
    const updated = await res.json();
    log('UPDATED CONTENT', updated?.data?.content);

    res = await fetch(base + `/api/journal/${journalId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + userToken,
        'X-CSRF-Token': csrf,
        'Cookie': cookie
      }
    });
    log('DELETE STATUS', res.status);
    const deleted = await res.json();
    log('DELETE RESPONSE', deleted?.message || deleted?.error);

    const afterDeleteCount = await prisma.journalEntry.count({ where: { userId: user.id } });
    log('JOURNAL COUNT AFTER DELETE', afterDeleteCount);
    log('COUNT RESTORED', afterDeleteCount === beforeCount);

    log('\n✅ DATABASE CONSISTENCY CHECK COMPLETE');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERR', error.message);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
