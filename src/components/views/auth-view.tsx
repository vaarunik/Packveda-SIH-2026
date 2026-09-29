"use client";

// PACKVEDA — Authentication view (/signin).
// Sign In + Create Account powered by Supabase Auth. After a successful
// credential flow the user is redirected to /analyze (handled by the
// SIGNED_IN listener in AuthProvider via pendingAuthRedirect).

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  LogIn,
  MailCheck,
  ShoppingBasket,
  Store,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/shared/back-button";
import { useAuth } from "@/lib/auth";
import { usePackVeda } from "@/lib/store";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthView() {
  const { signIn, signUp } = useAuth();
  const authMode = usePackVeda((s) => s.authMode);
  const setAuthMode = usePackVeda((s) => s.setAuthMode);

  const [mode, setMode] = useState<"signin" | "signup">(authMode);

  // Re-sync when the auth dialog / header presets a mode while this view is
  // already mounted (e.g. "Create Account" clicked from the gate dialog).
  useEffect(() => {
    setMode(authMode);
  }, [authMode]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState<string | null>(null);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setAuthMode(next);
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup" && !fullName.trim()) {
      setError("Please tell us your name.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: err } = await signIn(email.trim(), password);
        if (err) setError(err);
      } else {
        const { error: err, needsConfirmation: confirm } = await signUp(
          email.trim(),
          password,
          fullName.trim(),
          accountType
        );
        if (err) setError(err);
        else if (confirm) setNeedsConfirmation(email.trim());
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-navy-950 bg-grid-navy">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-6rem] h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[-4rem] h-80 w-80 rounded-full bg-forest-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
        <BackButton
          label="Back to home"
          fallback="home"
          className="self-start text-cream-100/70 hover:bg-white/10 hover:text-cream-50"
        />

        <div className="mx-auto grid w-full flex-1 grid-cols-[minmax(0,1fr)] items-center gap-10 py-10 lg:grid-cols-2 lg:gap-16">
          {/* LEFT — brand + value copy */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            aria-label="About PackVeda accounts"
            className="hidden flex-col items-start gap-6 lg:flex"
          >
            <span className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/25 ring-1 ring-white/25">
              <Image
                src="/packveda-icon.png"
                alt=""
                width={64}
                height={64}
                priority
                className="size-full object-contain"
              />
            </span>
            <h1 className="text-4xl font-bold tracking-wide text-cream-50">
              Sign in to{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-sand-400 bg-clip-text text-transparent">
                PackVeda
              </span>
            </h1>
            <p className="text-lg font-medium text-emerald-400">
              Create an account or sign in to start your packaging analysis.
            </p>
            <ul className="space-y-3 text-sm leading-relaxed text-cream-100/75">
              {[
                "Run science-based packaging analyses for your commodities",
                "Get explainable AI recommendations and material matching",
                "Connect with suppliers — request samples and quotes",
                "Track validation trials and build Packaging Passports",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400"
                  />
                  {line}
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-cream-100/50">
              Accounts are secured by Supabase Auth. Your analyses, saved
              materials and requests stay private to your account.
            </p>
          </motion.section>

          {/* RIGHT — auth card */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
            aria-label="Sign in or create account"
            className="w-full"
          >
            <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
              {needsConfirmation ? (
                <div className="text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-forest-100 text-forest-700">
                    <MailCheck className="size-6" aria-hidden />
                  </span>
                  <h2 className="mt-4 text-xl font-bold text-navy-950">
                    Check your email to confirm your account.
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-navy-700">
                    We sent a confirmation link to{" "}
                    <span className="font-semibold text-navy-950">
                      {needsConfirmation}
                    </span>
                    . Open the link to activate your account, then sign in.
                  </p>
                  <Button
                    onClick={() => {
                      setNeedsConfirmation(null);
                      switchMode("signin");
                    }}
                    className="mt-6 w-full bg-forest-700 text-white hover:bg-forest-600"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mode tabs */}
                  <div
                    role="tablist"
                    aria-label="Authentication mode"
                    className="grid grid-cols-2 gap-1 rounded-lg bg-cream-100 p-1"
                  >
                    {(
                      [
                        { key: "signin", label: "Sign In", icon: LogIn },
                        { key: "signup", label: "Create Account", icon: UserPlus },
                      ] as const
                    ).map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.key}
                          role="tab"
                          aria-selected={mode === t.key}
                          onClick={() => switchMode(t.key)}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                            mode === t.key
                              ? "bg-white text-navy-950 shadow-sm"
                              : "text-navy-600 hover:text-navy-900"
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                    {mode === "signup" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="auth-name">Full name</Label>
                        <Input
                          id="auth-name"
                          autoComplete="name"
                          placeholder="Your name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                    )}
                    {mode === "signup" && (
                      <div className="space-y-1.5">
                        <Label>Account type</Label>
                        <div
                          role="radiogroup"
                          aria-label="Account type"
                          className="grid grid-cols-2 gap-2"
                        >
                          {(
                            [
                              {
                                key: "buyer",
                                label: "Buyer",
                                hint: "Food business",
                                icon: ShoppingBasket,
                              },
                              {
                                key: "seller",
                                label: "Seller",
                                hint: "Packaging supplier",
                                icon: Store,
                              },
                            ] as const
                          ).map((opt) => {
                            const Icon = opt.icon;
                            const selected = accountType === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setAccountType(opt.key)}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                                  selected
                                    ? "border-forest-700 bg-forest-50"
                                    : "border-navy-900/15 bg-white hover:border-forest-700/40"
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "size-4 shrink-0",
                                    selected ? "text-forest-700" : "text-navy-400"
                                  )}
                                  aria-hidden
                                />
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold text-navy-950">
                                    {opt.label}
                                  </span>
                                  <span className="block truncate text-[11px] text-navy-600">
                                    {opt.hint}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-email">Email</Label>
                      <Input
                        id="auth-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-password">Password</Label>
                      <Input
                        id="auth-password"
                        type="password"
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>

                    {error && (
                      <p
                        role="alert"
                        className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] font-medium leading-relaxed text-destructive"
                      >
                        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={busy}
                      className="w-full gap-2 bg-forest-700 text-white hover:bg-forest-600"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          {mode === "signin" ? "Signing in…" : "Creating account…"}
                        </>
                      ) : (
                        <>
                          {mode === "signin" ? "Sign In" : "Create Account"}
                          <ArrowRight className="size-4" aria-hidden />
                        </>
                      )}
                    </Button>
                  </form>

                  <p className="mt-4 text-center text-xs leading-relaxed text-navy-600">
                    {mode === "signin" ? (
                      <>
                        New to PackVeda?{" "}
                        <button
                          onClick={() => switchMode("signup")}
                          className="font-semibold text-forest-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          Create an account
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <button
                          onClick={() => switchMode("signin")}
                          className="font-semibold text-forest-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                  <p className="mt-3 text-center text-[11px] leading-relaxed text-navy-600/80">
                    By continuing you agree to use PackVeda as decision support —
                    recommendations always require real-world validation.
                  </p>
                </>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}

export default AuthView;
