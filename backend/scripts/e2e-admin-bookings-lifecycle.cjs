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
    let csrf = hjson.csrfToken;
    const setCookie = h.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0] || '';

    // Get tokens
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    const user = await prisma.user.findUnique({ where: { email: 'user@example.com' } });
    const adminToken = jwt.sign({ id: admin.id, email: admin.email, isAdmin: true }, JWT_SECRET, { expiresIn: '7d' });
    const userToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Get a therapist
    const therapist = await prisma.therapist.findFirst();
    log('Using therapist:', therapist?.id);

    log('\n=== CREATE NEW BOOKING AS USER ===');
    // Use unique time based on timestamp to avoid conflicts
    const uniqueTime = String(9 + (Date.now() % 8)).padStart(2, '0') + ':00 AM';
    const preferredDate = new Date(Date.now()+7*24*3600*1000).toISOString().slice(0,10);
    const bookingPayload = { therapistId: therapist.id, preferredDate, preferredTime: uniqueTime, notes: 'Admin approval test ' + Date.now() };
    let res = await fetch(base + '/api/therapists/booking', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken, 'X-CSRF-Token': csrf, 'Cookie': cookie }, body: JSON.stringify(bookingPayload) });
    log('BOOKING CREATE STATUS', res.status);
    const bookingRes = await res.json();
    if (!bookingRes.success) log('BOOKING ERROR', bookingRes.error);
    const bookingId = bookingRes?.data?.booking?.id;
    log('BOOKING ID', bookingId);

    if (!bookingId) {
      log('❌ Booking creation failed, cannot continue');
      process.exit(1);
    }

    log('\n=== ADMIN VIEW PENDING BOOKINGS ===');
    res = await fetch(base + '/api/admin/help-safety/therapists/bookings', { headers: { 'Authorization': 'Bearer ' + adminToken } });
    log('ADMIN BOOKINGS STATUS', res.status);
    const adminBookings = await res.json();
    const bookingsArray = Array.isArray(adminBookings?.data) ? adminBookings.data : adminBookings?.data?.bookings || [];
    log('PENDING BOOKINGS COUNT', bookingsArray.length || 0);
    const pendingBooking = bookingsArray.find((b) => b.status === 'PENDING');
    log('PENDING BOOKING ID', pendingBooking?.id);

    if (pendingBooking) {
      log('\n=== ADMIN APPROVES BOOKING ===');
      // Refresh CSRF token before processing
      const h2 = await fetch(base + '/api/health');
      const hjson2 = await h2.json();
      csrf = hjson2.csrfToken;
      const setCookie2 = h2.headers.get('set-cookie') || '';
      const cookie2 = setCookie2.split(';')[0] || '';

      res = await fetch(base + `/api/admin/help-safety/therapists/bookings/${pendingBooking.id}/process`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken, 'X-CSRF-Token': csrf, 'Cookie': cookie2 }, body: JSON.stringify({ status: 'CONFIRMED', adminNotes: 'Approved for testing' }) });
      log('PROCESS BOOKING STATUS', res.status);
      const processedRes = await res.json();
      log('PROCESS RES', JSON.stringify(processedRes, null, 2).substring(0, 300));
      log('PROCESSED BOOKING STATUS', processedRes?.data?.status);

      log('\n=== USER SEES APPROVED BOOKING ===');
      res = await fetch(base + '/api/therapists/bookings', { headers: { 'Authorization': 'Bearer ' + userToken } });
      log('USER BOOKINGS STATUS', res.status);
      const userBookings = await res.json();
      log('USER BOOKINGS COUNT', userBookings?.data?.bookings?.length || 0);
      const userBooking = userBookings?.data?.bookings?.find((b) => b.id === pendingBooking.id);
      log('USER BOOKING STATUS', userBooking?.status);
    }

    log('\n✅ ADMIN BOOKING LIFECYCLE TEST COMPLETE');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERR', err.message);
    process.exit(2);
  } finally { await prisma.$disconnect(); }
})();
