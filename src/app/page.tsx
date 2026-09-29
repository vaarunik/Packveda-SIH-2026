"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePackVeda, initProfileFromStorage, isProtectedView, pathToView, VIEW_PATHS } from "@/lib/store";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { ChatWidget } from "@/components/shared/chat-widget";
import { AuthDialog } from "@/components/shared/auth-dialog";
import { Loader2 } from "lucide-react";

// All views are client components; lazy-load heavy view bundles so the
// landing page stays fast.
const LOADING = () => (
  <div className="flex min-h-[50vh] items-center justify-center gap-3 text-navy-600">
    <Loader2 className="size-5 animate-spin" aria-hidden />
    <span className="text-sm">Loading PackVeda…</span>
  </div>
);

const HomeView = dynamic(() => import("@/components/views/home-view"), { loading: LOADING });
const AuthView = dynamic(() => import("@/components/views/auth-view"), { loading: LOADING });
const AnalyzeView = dynamic(() => import("@/components/views/analyze-view"), { loading: LOADING });
const ResultsView = dynamic(() => import("@/components/views/results-view"), { loading: LOADING });
const MatchingView = dynamic(() => import("@/components/views/matching-view"), { loading: LOADING });
const MarketplaceView = dynamic(() => import("@/components/views/marketplace-view"), { loading: LOADING });
const CompareView = dynamic(() => import("@/components/views/compare-view"), { loading: LOADING });
const PassportView = dynamic(() => import("@/components/views/passport-view"), { loading: LOADING });
const SimulatorView = dynamic(() => import("@/components/views/simulator-view"), { loading: LOADING });
const DashboardView = dynamic(() => import("@/components/views/dashboard-view"), { loading: LOADING });
const SellerView = dynamic(() => import("@/components/views/seller-view"), { loading: LOADING });
const OnboardingView = dynamic(() => import("@/components/views/onboarding-view"), { loading: LOADING });
const TrialsView = dynamic(() => import("@/components/views/trials-view"), { loading: LOADING });
const ExplorerView = dynamic(() => import("@/components/views/explorer-view"), { loading: LOADING });
const SourcesView = dynamic(() => import("@/components/views/sources-view"), { loading: LOADING });
const AboutView = dynamic(() => import("@/components/views/about-view"), { loading: LOADING });

function AppShell() {
  const view = usePackVeda((s) => s.view);
  const { status } = useAuth();

  // Restore persisted role profile (buyer/seller) once on the client.
  useEffect(() => {
    initProfileFromStorage();
  }, []);

  // Boot from the real URL: typed/refreshed app URLs (rewritten to / by the
  // middleware) restore their view here instead of 404ing.
  useEffect(() => {
    const initial = pathToView(window.location.pathname);
    if (initial && initial !== "home") {
      usePackVeda.setState({ view: initial });
    }
  }, []);

  // Sync internal view when the user uses the browser Back/Forward buttons.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const v =
        (e.state as { view?: import("@/lib/store").View } | null)?.view ??
        pathToView(window.location.pathname) ??
        "home";
      usePackVeda.setState({ view: v });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ------------------------------------------------------------------
  // Route protection — the authoritative auth gate for the SPA.
  //  - Unauthenticated users on a protected view are redirected to /signin
  //    (this also covers manually typed URLs — the middleware rewrite makes
  //    the SPA bootstrap, then this guard bounces them out).
  //  - Authenticated users never see the sign-in view again.
  //  - While the session is being restored, protected content stays hidden.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (status === "loading") return;
    const store = usePackVeda.getState();

    if (status === "unauthenticated" && isProtectedView(view)) {
      store.setAuthMode("signin");
      store.setChatOpen(false);
      usePackVeda.setState({ view: "signin" });
      try {
        window.history.replaceState({ packveda: true, view: "signin" }, "", VIEW_PATHS.signin);
      } catch {
        /* ignore */
      }
      window.scrollTo({ top: 0 });
      return;
    }

    if (status === "authenticated" && view === "signin") {
      store.setView("analyze");
    }
  }, [status, view]);

  const authBlocking = status === "loading" && isProtectedView(view);

  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-forest-700 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" className="flex-1" aria-live="polite">
        {authBlocking ? (
          <LOADING />
        ) : (
          <>
            {view === "home" && <HomeView />}
            {view === "signin" && <AuthView />}
            {view === "analyze" && <AnalyzeView />}
            {view === "results" && <ResultsView />}
            {view === "matching" && <MatchingView />}
            {view === "marketplace" && <MarketplaceView />}
            {view === "compare" && <CompareView />}
            {view === "passport" && <PassportView />}
            {view === "simulator" && <SimulatorView />}
            {view === "dashboard" && <DashboardView />}
            {view === "seller" && <SellerView />}
            {view === "onboarding" && <OnboardingView />}
            {view === "trials" && <TrialsView />}
            {view === "explorer" && <ExplorerView />}
            {view === "sources" && <SourcesView />}
            {view === "about" && <AboutView />}
          </>
        )}
      </main>
      <SiteFooter />
      <ChatWidget />
      <AuthDialog />
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
