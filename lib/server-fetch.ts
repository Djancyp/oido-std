/**
 * Drop-in fetch replacement for hooks that run both server-side and client-side.
 * On server: adds x-api-key so the middleware bypasses JWT auth for internal calls.
 * On client: plain fetch (session cookie is sent automatically by the browser).
 */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  if (typeof window === 'undefined') {
    return fetch(url, {
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
