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

    log('\n=== TEST 1: XSS SANITIZATION IN JOURNAL CONTENT ===');
    const maliciousContent = '<script>alert(1)</script>safe text <img src=x onerror=alert(2)>';
    let res = await fetch(base + '/api/journal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + userToken,
        'X-CSRF-Token': csrf,
        'Cookie': cookie
      },
      body: JSON.stringify({ content: maliciousContent, mood: 'hopeful' })
    });
    log('CREATE STATUS', res.status);
    const created = await res.json();
    const createdId = created?.data?.id;
    log('STORED CONTENT', created?.data?.content);
    log('SCRIPT TAG PRESENT', String(created?.data?.content || '').includes('<script>'));
    log('ONERROR PRESENT', String(created?.data?.content || '').includes('onerror'));

    log('\n=== TEST 2: PROTECTED ROUTE REJECTS NO AUTH ===');
    res = await fetch(base + '/api/journal');
    log('STATUS', res.status);
    const noAuth = await res.json();
    log('ERROR', noAuth.error);

    log('\n=== TEST 3: INVALID ADMIN TOKEN REJECTED ===');
    const forgedAdminToken = jwt.sign({ id: user.id, email: user.email, isAdmin: true }, JWT_SECRET, { expiresIn: '7d' });
    res = await fetch(base + '/api/admin/dashboard/summary', {
      headers: { 'Authorization': 'Bearer ' + forgedAdminToken }
    });
    log('STATUS', res.status);
    const adminDenied = await res.json();
    log('ERROR', adminDenied.error || adminDenied.message);

    log('\n=== TEST 4: CLEANUP MALICIOUS JOURNAL ENTRY ===');
    if (createdId) {
      await fetch(base + `/api/journal/${createdId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + userToken,
          'X-CSRF-Token': csrf,
          'Cookie': cookie
        }
      });
      log('CLEANUP DONE');
    }

    log('\n✅ SECURITY CHECKS COMPLETE');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERR', error.message);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
