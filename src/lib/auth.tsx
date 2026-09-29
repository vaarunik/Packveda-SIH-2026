"use client";

// PACKVEDA authentication — Supabase Auth (session-based, client-side).
//
// - Sessions persist in localStorage (supabase-js default) and survive reloads.
// - The publishable/anon key is used here — public by design, RLS-governed.
//   The service-role key is NEVER imported in frontend code.
// - `authedFetch` attaches the verified access token to API calls so backend
//   routes can derive identity server-side instead of trusting client input.
// - Public (logged-out) visitors can browse the landing page only; every
//   protected capability goes through the auth gate.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { usePackVeda } from "@/lib/store";

// Type shape of an AuthApiError from supabase-js (message/status/code).
interface SupabaseAuthErrorLike {
  message?: string;
  status?: number;
  code?: string;
}

// Debug logging for auth failures (temporary, per debugging spec).
// Logs only error metadata — never tokens, passwords or keys.
function logAuthError(scope: string, error: SupabaseAuthErrorLike | null | undefined) {
  console.error("Supabase Auth Error:", {
    scope,
    message: error?.message ?? "unknown",
    status: error?.status,
    code: error?.code,
  });
}

function friendlyAuthError(error: SupabaseAuthErrorLike | null | undefined): string {
  const message = error?.message ?? "";
  const code = error?.code ?? "";

  // Rate limits (429) — never retried automatically; the user must wait.
  if (
    error?.status === 429 ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    /rate limit|too many/i.test(message)
  ) {
    return "Too many authentication attempts. Please wait a few minutes before trying again.";
  }
  if (/invalid login credentials/i.test(message))
    return "Incorrect email or password. Please try again.";
  if (/user already registered/i.test(message))
    return "An account with this email already exists — please sign in instead.";
  if (/password should be at least/i.test(message))
    return "Password must be at least 6 characters.";
  if (/unable to validate email/i.test(message) || /invalid email/i.test(message))
    return "Please enter a valid email address.";
  if (/email not confirmed/i.test(message))
    return "Please confirm your email first — check your inbox for the confirmation link.";
  return message || "Something went wrong. Please try again.";
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    role?: "buyer" | "seller"
  ) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);



export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const prevStatus = useRef<AuthStatus>("loading");

  const syncProfileFromUser = useCallback((user: User) => {
    // Keep the lightweight store profile aligned with the verified account:
    // existing profiles for the same email keep their role; otherwise a
    // minimal profile is created from the signup metadata (role chosen at
    // signup survives the email-confirmation round-trip via user_metadata).
    const store = usePackVeda.getState();
    const email = user.email ?? "";
    const current = store.profile;
    if (current && current.email === email) return;
    const metaName = (user.user_metadata?.full_name as string | undefined) ?? "";
    const metaRole = user.user_metadata?.role === "seller" ? "seller" : "buyer";
    store.setProfile({
      id: user.id,
      role: metaRole,
      name: metaName || email.split("@")[0] || "PackVeda User",
      email,
      company: "",
    });
  }, []);

  // Best-effort persistence of the profiles record after an EXPLICIT
  // credential flow (sign-in or completed sign-up). A data call (not an auth
  // request): uses the existing /api/profile upsert keyed by the verified
  // token email. Failures never block the session/redirect.
  const persistProfile = useCallback(async () => {
    try {
      const profile = usePackVeda.getState().profile;
      if (!profile) return;
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          role: profile.role,
          name: profile.name,
          email: profile.email,
          company: profile.company ?? "",
        }),
      });
      if (!res.ok && res.status !== 409) {
        console.error("Supabase Auth Error:", {
          scope: "persistProfile",
          message: `/api/profile responded ${res.status}`,
        });
      }
    } catch (err) {
      console.error("Supabase Auth Error:", {
        scope: "persistProfile",
        message: err instanceof Error ? err.message : "network error",
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setStatus(data.session ? "authenticated" : "unauthenticated");
        if (data.session?.user) syncProfileFromUser(data.session.user);
      })
      .catch(() => {
        if (mounted) setStatus("unauthenticated");
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      const next: AuthStatus = nextSession ? "authenticated" : "unauthenticated";
      setStatus(next);

      if (event === "SIGNED_IN" && nextSession?.user) {
        syncProfileFromUser(nextSession.user);
        // After an explicit credential flow, send the user to /analyze and
        // make sure the profiles record exists (one upsert per explicit flow;
        // passive restores — reload, email-link return — never write).
        const store = usePackVeda.getState();
        if (store.pendingAuthRedirect || store.view === "signin") {
          const explicit = store.pendingAuthRedirect;
          store.setPendingAuthRedirect(false);
          store.setView("analyze");
          if (explicit) void persistProfile();
        }
      }

      if (event === "SIGNED_OUT") {
        prevStatus.current = next;
        const store = usePackVeda.getState();
        store.setProfile(null);
        store.setChatOpen(false);
        // Logout returns the user to the public landing page.
        if (store.view !== "home") store.setView("home");
        return;
      }

      prevStatus.current = next;
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [syncProfileFromUser, persistProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    // Exactly ONE auth request per click — no retries anywhere.
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logAuthError("signInWithPassword", error);
      return { error: friendlyAuthError(error) };
    }
    if (data.session) {
      usePackVeda.getState().setPendingAuthRedirect(true);
    }
    return {};
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string, role?: "buyer" | "seller") => {
      // Exactly ONE auth request per click — no retries anywhere. The chosen
      // account type is stored in user_metadata so it survives email
      // confirmation; the profiles row is upserted after the session exists
      // (see persistProfile in the SIGNED_IN listener).
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName ?? "", role: role === "seller" ? "seller" : "buyer" },
        },
      });
      if (error) {
        logAuthError("signUp", error);
        return { error: friendlyAuthError(error) };
      }
      // Email confirmation enabled → no session yet; ask the user to verify.
      if (!data.session) return { needsConfirmation: true };
      usePackVeda.getState().setPendingAuthRedirect(true);
      return {};
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* even on failure the local state is cleared by onAuthStateChange */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, user: session?.user ?? null, signIn, signUp, signOut }),
    [status, session, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
