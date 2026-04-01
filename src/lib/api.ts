// Single source of truth for the backend API URL.
// Import this instead of re-declaring `const API_URL` in every file.
//
// Usage:
//   import { API_URL } from '@/lib/api';

const configuredApiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

// In the browser always use the current origin so remote devices, LAN IPs,
// ngrok URLs, etc. keep calling the same app instead of their own localhost.
export const API_URL = typeof window === 'undefined'
  ? (configuredApiUrl || 'http://localhost:3000')
  : '';
