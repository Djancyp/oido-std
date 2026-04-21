/**
 * Drop-in fetch replacement for hooks that run both server-side and client-side.
 * On server: rewrites the base URL to the internal localhost address to avoid
 *   TLS issues with self-signed certs on the public domain.
 * On client: plain fetch (session cookie sent automatically by the browser).
 */

const INTERNAL_BASE = process.env.INTERNAL_BASE_URL ?? 'http://localhost:3000';
const PUBLIC_BASE = process.env.NEXT_PUBLIC_BASE_URL ?? '';

function toInternalUrl(url: string): string {
  if (!PUBLIC_BASE) return url;
  return url.startsWith(PUBLIC_BASE) ? INTERNAL_BASE + url.slice(PUBLIC_BASE.length) : url;
}

export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  if (typeof window === 'undefined') {
    return fetch(toInternalUrl(url), {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        'x-api-key': process.env.INTERNAL_API_KEY ?? '',
      },
      cache: 'no-store',
    });
  }
  return fetch(url, init);
}
