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
    if (!JWT_SECRET) throw new Error('JWT_SECRET missing in .env');

    // Find user and therapist
    const user = await prisma.user.findUnique({ where: { email: 'user@example.com' } });
    const therapist = await prisma.therapist.findFirst({ where: { name: 'Automated Therapist' } });
    const therapistUser = await prisma.user.findUnique({ where: { email: 'therapist@demo.com' } });

    if (!user || !therapist || !therapistUser) {
      console.error('Missing seed data: user or therapist not found');
      process.exit(1);
    }

    const userToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const therapistToken = jwt.sign({ userId: therapistUser.id, therapistId: therapist.id }, JWT_SECRET, { expiresIn: '7d' });

    // Get CSRF token + cookie from /api/health
    const base = 'http://localhost:5000';
    const h = await fetch(base + '/api/health');
    const hjson = await h.json();
    const csrf = hjson.csrfToken;
    const setCookie = h.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0] || '';
    console.log('CSRF', csrf, 'COOKIE', cookie);

    // Create booking as user using Authorization + CSRF + Cookie
    const bookingPayload = { therapistId: therapist.id, preferredDate: new Date(Date.now()+2*24*3600*1000).toISOString().slice(0,10), preferredTime: '09:00', notes: 'E2E booking via token' };
    const createResp = await fetch(base + '/api/therapists/booking', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken, 'X-CSRF-Token': csrf, 'Cookie': cookie }, body: JSON.stringify(bookingPayload) });
    console.log('CREATE STATUS', createResp.status);
    console.log('CREATE BODY', await createResp.json());

    // Wait a moment and fetch therapist portal bookings
    await new Promise(r => setTimeout(r, 500));
    const thResp = await fetch(base + '/api/therapist-portal/bookings', { headers: { 'Authorization': 'Bearer ' + therapistToken } });
    console.log('THERAPIST BOOKINGS STATUS', thResp.status);
    console.log('THERAPIST BOOKINGS BODY', await thResp.json());

    process.exit(0);
  } catch (err) {
    console.error('ERR', err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
