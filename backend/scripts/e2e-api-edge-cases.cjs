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

    log('\n=== TEST 1: INVALID JOURNAL CREATE PAYLOAD ===');
    let res = await fetch(base + '/api/journal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + userToken,
        'X-CSRF-Token': csrf,
        'Cookie': cookie
      },
      body: JSON.stringify({ content: '', mood: 'hopeful' })
    });
    log('STATUS', res.status);
    const invalidJournal = await res.json();
    log('ERROR', invalidJournal.error);
    log('DETAILS PRESENT', Boolean(invalidJournal.details));

    log('\n=== TEST 2: JOURNAL UPDATE WITHOUT CSRF ===');
    const journal = await prisma.journalEntry.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    res = await fetch(base + `/api/journal/${journal.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + userToken
      },
      body: JSON.stringify({ content: 'Attempted update without CSRF' })
    });
    log('STATUS', res.status);
    const missingCsrf = await res.json();
    log('ERROR', missingCsrf.error || missingCsrf.message);

    log('\n=== TEST 3: MALFORMED JSON BODY ===');
    res = await fetch(base + '/api/journal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + userToken,
        'X-CSRF-Token': csrf,
        'Cookie': cookie
      },
      body: '{'
    });
    log('STATUS', res.status);
    const malformed = await res.json();
    log('ERROR', malformed.error || malformed.message);
    log('STACK EXPOSED', Boolean(malformed.stack));

    log('\n=== TEST 4: LOGIN RATE LIMIT ===');
    let lastStatus = 0;
    let lastError = '';
    for (let i = 1; i <= 6; i++) {
      res = await fetch(base + '/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
          'Cookie': cookie
        },
        body: JSON.stringify({ email: 'user@example.com', password: 'wrong-password' })
      });
      lastStatus = res.status;
      const body = await res.json();
      lastError = body.error || body.message || '';
      log(`ATTEMPT ${i}`, 'STATUS', lastStatus, 'ERROR', lastError);
      if (lastStatus === 429) break;
    }

    log('\n✅ EDGE CASE TESTS COMPLETE');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERR', error.message);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
