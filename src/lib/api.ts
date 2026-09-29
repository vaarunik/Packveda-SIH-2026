// PACKVEDA API client helper.
//
// `apiFetch` wraps fetch and attaches the caller's Supabase access token as
// `Authorization: Bearer <token>`. Backend routes verify the token
// (src/lib/server-auth.ts) and derive the caller's identity server-side —
// they never trust a client-supplied email for authorization decisions.
//
// Use apiFetch for every owner-scoped / authenticated endpoint:
//   /api/analyses, /api/saved, /api/trials, /api/requests,
//   /api/supplier-materials (mutations), /api/profile, /api/chat.

import { supabase } from "@/lib/supabase";

export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = await getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers, cache: init.cache ?? "no-store" });
}
