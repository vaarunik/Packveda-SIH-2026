// Server-side Supabase bearer verification — PackVeda API routes.
//
// `getAuthUser(req)` verifies the caller's Supabase access token by calling
// the Supabase auth /user endpoint (GoTrue). The returned identity is the
// ONLY trusted source for authorization decisions: API routes must derive
// the owner/emails from it and never from a client-supplied field.
//
// Security notes:
// - Tokens are NEVER logged (no console output includes the token).
// - A small in-memory cache (keyed by the raw token, 60s TTL) avoids
//   hammering the GoTrue endpoint on bursts. Entries hold only
//   { id, email } — never the token itself as a value.
// - Any failure (missing header, non-OK response, malformed payload,
//   network error) returns null → routes answer 401.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const CACHE_TTL_MS = 60_000;

type AuthUser = { id: string; email: string };

const cache = new Map<string, { user: AuthUser; expiresAt: number }>();

function pruneCache(now: number) {
  // Opportunistic cleanup so the map cannot grow unbounded.
  if (cache.size < 500) return;
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const now = Date.now();
  const hit = cache.get(token);
  if (hit && hit.expiresAt > now) return hit.user;
  pruneCache(now);

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { id?: unknown; email?: unknown };
    const id = typeof data.id === "string" ? data.id : null;
    const email = typeof data.email === "string" ? data.email.toLowerCase() : null;
    if (!id || !email) return null;

    const user = { id, email };
    cache.set(token, { user, expiresAt: now + CACHE_TTL_MS });
    return user;
  } catch {
    // Network failure / timeout / malformed JSON — treat as unauthenticated.
    return null;
  }
}
