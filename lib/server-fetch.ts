/**
 * Drop-in fetch replacement for hooks that run both server-side and client-side.
 *
 * Server-side: always hits http://localhost:PORT so we never do TLS against a
 *   self-signed cert on the public domain.
 *
 * Client-side: strips the origin and uses a relative path (/api/...) so the
 *   browser sends the request to whatever domain it is already on — no
 *   hardcoded localhost or domain in the bundle.
 */

const INTERNAL_BASE = process.env.INTERNAL_BASE_URL ?? 'http://localhost:3000';

function toInternalUrl(url: string): string {
  // Replace any origin (http://localhost:3000, https://oido.bruna-tech.com, …)
  // with the internal base so Node never dials out over TLS.
  return url.replace(/^https?:\/\/[^/]+/, INTERNAL_BASE);
}

function toRelativeUrl(url: string): string {
  // Strip origin so the browser uses the current host — works locally and in prod.
  return url.replace(/^https?:\/\/[^/]+/, '');
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
  return fetch(toRelativeUrl(url), init);
}
