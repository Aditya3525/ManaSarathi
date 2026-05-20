import { useCallback, useEffect, useState } from 'react';

import { getApiBaseUrl } from '../config/apiConfig';

export interface TherapistSession {
  id: string;
  email: string;
  name: string;
  role: string;
  therapistId: string;
  therapistName: string;
}

export function getTherapistToken(): string | null {
  return localStorage.getItem('therapistToken');
}

export function setTherapistToken(token: string): void {
  localStorage.setItem('therapistToken', token);
}

export function clearTherapistToken(): void {
  localStorage.removeItem('therapistToken');
}

export async function therapistFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = getTherapistToken();
  return fetch(`${getApiBaseUrl()}/therapist-portal${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
}

export function useTherapistAuth() {
  const [session, setSession] = useState<TherapistSession | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    const token = getTherapistToken();
    if (!token) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      const response = await therapistFetch('/session');
      if (response.ok) {
        const data = await response.json();
        setSession(data);
      } else {
        clearTherapistToken();
        setSession(null);
      }
    } catch {
      clearTherapistToken();
      setSession(null);
    }

    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${getApiBaseUrl()}/therapist-portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setTherapistToken(data.token);
    setSession({
      id: data.id,
      email: data.email,
      name: data.name,
      role: 'Therapist',
      therapistId: data.therapistId,
      therapistName: data.therapistName,
    });

    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await therapistFetch('/logout', { method: 'POST' });
    } catch {
      // Ignore logout API failures and still clear local auth state.
    }

    clearTherapistToken();
    setSession(null);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return {
    session,
    loading,
    login,
    logout,
    isAuthenticated: !!session,
    checkSession,
  };
}
