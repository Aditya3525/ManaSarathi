const fetch = globalThis.fetch || require('node-fetch');

const backendUrl = (process.env.BACKEND_URL || 'https://maansarathi-backend.onrender.com').replace(/\/+$/, '');
const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASSWORD || 'admin123';

(async () => {
  try {
    const res = await fetch(`${backendUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (e) { json = null; }

    console.log(`HTTP ${res.status} ${res.statusText}`);
    if (json) {
      if (json.token) delete json.token; // avoid leaking token
      console.log('Response JSON (sanitized):', JSON.stringify(json));
    } else {
      console.log('Response body:', text);
    }

    if (res.ok) {
      console.log('Admin login appears successful.');
    } else {
      console.log('Admin login failed.');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Request failed:', err);
    process.exitCode = 1;
  }
})();
