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
    const log = (...a) => console.log(...a);

    // Get CSRF + cookie
    const h = await fetch(base + '/api/health');
    const hjson = await h.json();
    const csrf = hjson.csrfToken;
    const setCookie = h.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0] || '';

    // Get user token
    const user = await prisma.user.findUnique({ where: { email: 'user@example.com' } });
    const userToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    log('\n=== CREATE JOURNAL ENTRY ===');
    let res = await fetch(base + '/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken, 'X-CSRF-Token': csrf, 'Cookie': cookie },
      body: JSON.stringify({ content: 'Original journal entry', mood: 'hopeful', tags: ['reflection'] })
    });
    log('CREATE STATUS', res.status);
    const createdRes = await res.json();
    const entryId = createdRes?.data?.id;
    log('CREATED ENTRY ID', entryId);
    log('ORIGINAL CONTENT', createdRes?.data?.content);

    if (entryId) {
      log('\n=== UPDATE JOURNAL ENTRY ===');
      res = await fetch(base + `/api/journal/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken, 'X-CSRF-Token': csrf, 'Cookie': cookie },
        body: JSON.stringify({ content: 'Updated journal entry with new content', mood: 'calm', tags: ['reflection', 'growth'] })
      });
      log('UPDATE STATUS', res.status);
      const updatedRes = await res.json();
      log('UPDATED CONTENT', updatedRes?.data?.content);
      log('UPDATED MOOD', updatedRes?.data?.mood);
      log('UPDATED TAGS', updatedRes?.data?.tags);

      log('\n=== VERIFY UPDATE VIA GET ===');
      res = await fetch(base + '/api/journal', { headers: { 'Authorization': 'Bearer ' + userToken } });
      log('GET STATUS', res.status);
      const listRes = await res.json();
      const verifyEntry = listRes?.data?.entries?.find((e) => e.id === entryId);
      log('VERIFIED CONTENT', verifyEntry?.content);
      log('VERIFIED MOOD', verifyEntry?.mood);
    }

    log('\n✅ JOURNAL UPDATE E2E TEST COMPLETE');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERR', err.message);
    process.exit(2);
  } finally { await prisma.$disconnect(); }
})();
