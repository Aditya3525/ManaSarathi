/**
 * adminFetch — a thin wrapper around fetch() that auto-attaches the admin
 * JWT token stored in localStorage.  Use this for every admin API call so
 * that cross-domain auth (Vercel → Render) works without session cookies.
 */

export function getAdminToken(): string | null {
  return localStorage.getItem('adminToken');
}

export function setAdminToken(token: string): void {
  localStorage.setItem('adminToken', token);
}

export function clearAdminToken(): void {
  localStorage.removeItem('adminToken');
}

export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include' as RequestCredentials,
  });
}
