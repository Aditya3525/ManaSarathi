const DEV_JWT_SECRET = 'dev-fallback-secret';
const DEV_SESSION_SECRET = 'dev-session-secret';

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim()) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return DEV_JWT_SECRET;
};

export const getSessionSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.trim()) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production');
  }

  return DEV_SESSION_SECRET;
};