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
    log('CSRF obtained');

    // Get admin token from DB
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    const adminToken = jwt.sign({ id: admin.id, email: admin.email, isAdmin: true }, JWT_SECRET, { expiresIn: '7d' });

    // Test 1: Create therapist via admin API
    log('\n=== TEST 1: CREATE THERAPIST ===');
    const createTherapistBody = {
      name: 'Admin-Created Therapist',
      credential: 'LCSW',
      title: 'Licensed Clinical Social Worker',
      bio: 'Created by admin E2E test',
      specialties: ['Anxiety', 'OCD'],
      email: 'admin.created.therapist@example.com',
      isActive: true,
      isVerified: true
    };
    let res = await fetch(base + '/api/admin/therapists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken, 'X-CSRF-Token': csrf, 'Cookie': cookie },
      body: JSON.stringify(createTherapistBody)
    });
    log('CREATE THERAPIST STATUS', res.status);
    const createdTherapist = await res.json();
    const createdTherapistId = createdTherapist?.data?.id;
    log('CREATED THERAPIST ID', createdTherapistId);

    // Test 2: Get all therapists (admin view)
    log('\n=== TEST 2: LIST ALL THERAPISTS (ADMIN) ===');
    res = await fetch(base + '/api/admin/therapists?limit=10', { headers: { 'Authorization': 'Bearer ' + adminToken } });
    log('LIST THERAPISTS STATUS', res.status);
    const therapistList = await res.json();
    log('THERAPIST COUNT', therapistList?.data?.length || 0);

    // Test 3: Get admin dashboard summary
    log('\n=== TEST 3: ADMIN DASHBOARD SUMMARY ===');
    res = await fetch(base + '/api/admin/dashboard/summary', { headers: { 'Authorization': 'Bearer ' + adminToken } });
    log('ADMIN SUMMARY STATUS', res.status);
    const adminSummary = await res.json();
    log('ADMIN SUMMARY DATA', {
      totalUsers: adminSummary?.data?.kpis?.totalUsers,
      pendingBookings: adminSummary?.data?.attention?.pendingTherapistBookings,
      crisisEvents: adminSummary?.data?.attention?.crisisEventsLast7d
    });

    // Test 4: Get all bookings (admin view)
    log('\n=== TEST 4: ADMIN BOOKINGS VIEW ===');
    res = await fetch(base + '/api/admin/help-safety/therapists/bookings', { headers: { 'Authorization': 'Bearer ' + adminToken } });
    log('ADMIN BOOKINGS STATUS', res.status);
    const adminBookings = await res.json();
    log('ADMIN BOOKINGS COUNT', adminBookings?.data?.length || 0);
    const latestBooking = adminBookings?.data?.[0];
    log('LATEST BOOKING ID', latestBooking?.id, 'STATUS', latestBooking?.status);

    // Test 5: Admin processes booking (approve)
    if (latestBooking && latestBooking.status === 'PENDING') {
      log('\n=== TEST 5: ADMIN PROCESS BOOKING (APPROVE) ===');
      res = await fetch(base + `/api/admin/help-safety/therapists/bookings/${latestBooking.id}/process`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken, 'X-CSRF-Token': csrf, 'Cookie': cookie },
        body: JSON.stringify({ action: 'approve', adminNotes: 'Approved by admin E2E test' })
      });
      log('PROCESS BOOKING STATUS', res.status);
      const processedBooking = await res.json();
      log('PROCESSED BOOKING STATUS', processedBooking?.data?.status);
    }

    // Test 6: Non-admin cannot access admin endpoints
    log('\n=== TEST 6: RBAC - USER CANNOT ACCESS ADMIN ENDPOINTS ===');
    const user = await prisma.user.findUnique({ where: { email: 'user@example.com' } });
    const userToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res = await fetch(base + '/api/admin/therapists', { headers: { 'Authorization': 'Bearer ' + userToken } });
    log('USER TRIES ADMIN ENDPOINT STATUS', res.status);
    const rbacError = await res.json();
    log('RBAC ERROR MSG', rbacError?.error || rbacError?.details);

    // Test 7: Get single therapist details (admin)
    if (createdTherapistId) {
      log('\n=== TEST 7: GET THERAPIST DETAILS (ADMIN) ===');
      res = await fetch(base + `/api/admin/therapists/${createdTherapistId}`, { headers: { 'Authorization': 'Bearer ' + adminToken } });
      log('GET THERAPIST STATUS', res.status);
      const therapistDetails = await res.json();
      log('THERAPIST NAME', therapistDetails?.data?.name);
      log('THERAPIST VERIFIED', therapistDetails?.data?.isVerified);
    }

    log('\n✅ ADMIN E2E TEST COMPLETE');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERR', err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
})();
