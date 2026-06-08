/**
 * API base URL helper.
 *
 * In production (Vercel), VITE_API_URL points to the Railway backend.
 * In dev, the Vite proxy handles /api/* routes, so base is empty.
 *
 * Set VITE_API_URL in your .env or Vercel dashboard:
 *   VITE_API_URL=https://caravels-api.up.railway.app
 */

export const API_BASE = import.meta.env.VITE_API_URL || '';

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
