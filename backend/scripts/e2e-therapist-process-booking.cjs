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

    const therapist = await prisma.therapist.findFirst({ where: { name: 'Automated Therapist' } });
    const therapistUser = await prisma.user.findUnique({ where: { email: 'therapist@demo.com' } });

    if (!therapist || !therapistUser) {
      console.error('Therapist not found'); process.exit(1);
    }

    const therapistToken = jwt.sign({ userId: therapistUser.id, therapistId: therapist.id }, JWT_SECRET, { expiresIn: '7d' });

    // Get latest pending booking for this therapist
    const booking = await prisma.therapistBooking.findFirst({ where: { therapistId: therapist.id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
    if (!booking) { console.error('No pending booking found'); process.exit(1); }
    console.log('Processing booking', booking.id);

    // Call therapist portal endpoint to confirm booking
    const base = 'http://localhost:5000';
    // Get CSRF token + cookie
    const h = await fetch(base + '/api/health');
    const hjson = await h.json();
    const csrf = hjson.csrfToken;
    const setCookie = h.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0] || '';

    const res = await fetch(base + `/api/therapist-portal/bookings/${booking.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + therapistToken, 'X-CSRF-Token': csrf, 'Cookie': cookie }, body: JSON.stringify({ status: 'CONFIRMED', therapistNotes: 'Accepted in automated test' }) });
    console.log('PROCESS STATUS', res.status);
    console.log('PROCESS BODY', await res.json());

    // Verify booking status via user bookings API using signed user token
    const user = await prisma.user.findUnique({ where: { email: 'user@example.com' } });
    const userToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const userRes = await fetch(base + '/api/therapists/bookings', { headers: { 'Authorization': 'Bearer ' + userToken } });
    console.log('USER BOOKINGS STATUS', userRes.status);
    console.log('USER BOOKINGS BODY', await userRes.json());

    process.exit(0);
  } catch (err) {
    console.error('ERR', err);
    process.exit(2);
  } finally { await prisma.$disconnect(); }
})();
