import { getApiBaseUrl } from '../config/apiConfig';

const API_BASE_URL = getApiBaseUrl();

/** Shape of the user object stored locally and returned from the backend */
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isOnboarded: boolean;
  hasPassword?: boolean;
  isGoogleUser?: boolean;
  approach?: 'western' | 'eastern' | 'hybrid';
  birthday?: string;
  gender?: string;
  region?: string;
  language?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  profilePhoto?: string;
  assessmentScores?: Record<string, number>;
  dataConsent?: boolean;
  clinicianSharing?: boolean;
  securityQuestion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const getToken = (): string | null => localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
});

/**
 * Register a new user with email and password.
 */
export const registerUser = async (userData: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: StoredUser; token: string }> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  const data = await response.json();

  if (!response.ok) {
    if (data.suggestLogin || data.status === 409) {
      throw { ...data, suggestLogin: true, email: userData.email };
    }
    throw new Error(data.error || data.message || 'Registration failed');
  }

  const token = data.data?.token || data.token;
  const user = data.data?.user || data.user;

  if (token) {
    localStorage.setItem('token', token);
  }

  return { user, token };
};

/**
 * Log in with email and password.
 */
export const loginUser = async (credentials: {
  email: string;
  password: string;
}): Promise<{ user: StoredUser; token: string } | null> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  const data = await response.json();

  if (!response.ok) {
    throw { response: { data } };
  }

  const token = data.data?.token || data.token;
  const user = data.data?.user || data.user;

  if (!token || !user) {
    return null;
  }

  localStorage.setItem('token', token);
  return { user, token };
};

/**
 * Fetch the currently authenticated user from the backend.
 * Returns null if not authenticated or token is invalid.
 */
export const getCurrentUser = async (): Promise<StoredUser | null> => {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        return null;
      }
      return null;
    }

    const data = await response.json();
    return data.data?.user || data.user || null;
  } catch {
    return null;
  }
};

/**
 * Sign the current user out by clearing local storage.
 */
export const signOut = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: authHeaders()
  }).catch(() => {
    // Ignore errors on logout
  });
};

/**
 * Complete onboarding with profile data.
 */
export const completeOnboarding = async (
  approach: 'western' | 'eastern' | 'hybrid',
  profileData: {
    firstName?: string;
    lastName?: string;
    birthday?: string;
    gender?: string;
    region?: string;
    language?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  }
): Promise<StoredUser | null> => {
  const response = await fetch(`${API_BASE_URL}/users/complete-onboarding`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      approach,
      ...profileData,
      isOnboarded: true
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to complete onboarding');
  }

  return data.data?.user || data.user || null;
};

/**
 * Set up a password for an OAuth-authenticated user.
 */
export const setupUserPassword = async (password: string): Promise<StoredUser | null> => {
  const response = await fetch(`${API_BASE_URL}/auth/setup-password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to set up password');
  }

  return data.data?.user || data.user || null;
};

/**
 * Set up a security question for the current user.
 */
export const setupSecurityQuestion = async (payload: {
  question: string;
  answer: string;
}): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/auth/security-question`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to set security question');
  }
};

/**
 * Request the security question for a given email (forgot password flow).
 * Returns the security question string or throws if not found.
 */
export const requestSecurityQuestion = async (
  email: string
): Promise<{ question: string }> => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Could not retrieve security question');
  }

  return { question: data.data?.question || data.question };
};

/**
 * Reset password using the security question answer (forgot password flow).
 */
export const resetPasswordWithSecurityAnswer = async (payload: {
  email: string;
  answer: string;
  password: string;
}): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to reset password');
  }
};
