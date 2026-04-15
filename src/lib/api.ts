// Single source of truth for the backend API URL.
// Import this instead of re-declaring `const API_URL` in every file.
//
// Usage:
//   import { API_URL } from '@/lib/api';

// NOTE: If you change NEXT_PUBLIC_API_URL in .env.local, restart the Next.js dev server.
const configuredApiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

// Frontend must call Spring Boot backend directly.
export const API_URL = configuredApiUrl || 'http://localhost:8080';

if (typeof window !== 'undefined' && !(window as any).__AARAH_API_URL_LOGGED__) {
  (window as any).__AARAH_API_URL_LOGGED__ = true;
  // Temporary debug log to verify the resolved backend base URL.
  // eslint-disable-next-line no-console
  console.info('[api] Using API_URL:', API_URL);
}
