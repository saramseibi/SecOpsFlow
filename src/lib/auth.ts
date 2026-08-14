export const COOKIE_NAME = 'session';
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days, must match backend JWT_EXPIRE_MINUTES

export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8010';

// Must match the backend's JWT_SECRET exactly. Never expose this via NEXT_PUBLIC_*.
const JWT_SECRET = process.env.JWT_SECRET || 'changeme-dev-secret-do-not-use-in-production';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'changeme-dev-secret-do-not-use-in-production') {
  throw new Error('JWT_SECRET must be set to a strong random value in production.');
}

export function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}
