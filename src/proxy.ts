// PACKVEDA route proxy (Next.js 16 — replaces the deprecated middleware
// convention).
//
// PackVeda is a single-route SPA: every view lives on the `/` route and owns a
// real browser URL via history.pushState (e.g. /analyze, /dashboard). This
// proxy rewrites any non-asset, non-API path back to `/` so the SPA bootstraps
// instead of 404ing when a user types or refreshes an app URL.
//
// The actual authentication enforcement then happens in the app shell
// (src/app/page.tsx + src/lib/auth.tsx): protected views require a verified
// Supabase session and unauthenticated visitors are redirected to /signin.
// The rewrite guarantees that manually typing a protected URL can never render
// protected content directly — it always passes through the auth gate first.
//
// Excluded from the rewrite:
//   - /api/*          backend routes
//   - /_next/*        Next.js internals (assets, HMR)
//   - any path with a dot (static files: *.png, *.svg, favicon, …)

import { NextResponse, type NextRequest } from "next/server";

export default function proxy(_req: NextRequest) {
  const url = _req.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
