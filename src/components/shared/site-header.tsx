"use client";

import * as React from "react";
import Image from "next/image";
import { usePackVeda, View, isProtectedView } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Menu,
  ChevronDown,
  LogOut,
  LogIn,
  UserRound,
  Settings2,
  Info,
  Database,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Navigation model
//  - PUBLIC: marketing/entry links only. Application features are never shown.
//    No "Home" item — the landing page IS the public entry point and the logo
//    returns to it.
//  - AUTHENTICATED: the full application nav + user menu.
// ---------------------------------------------------------------------------

const AUTH_NAV: { view: View; label: string }[] = [
  { view: "analyze", label: "Analyze" },
  { view: "dashboard", label: "Dashboard" },
  { view: "compare", label: "Compare" },
  { view: "marketplace", label: "Marketplace" },
];

const AUTH_MORE: { view: View; label: string }[] = [
  { view: "matching", label: "Packaging Matching" },
  { view: "passport", label: "Packaging Passport" },
  { view: "trials", label: "Trial & Validation" },
  { view: "seller", label: "Seller Dashboard" },
  { view: "explorer", label: "Data Explorer" },
  { view: "sources", label: "Data & Sources" },
  { view: "about", label: "About" },
];

export function Wordmark({ dark = false, onClick }: { dark?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-ring",
        dark ? "text-cream-50" : "text-navy-950"
      )}
      aria-label="PACKVEDA — go to home"
    >
      {/* Official PackVeda mark — white tile keeps the logo's white details intact */}
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-navy-900/10">
        <Image
          src="/packveda-icon.png"
          alt=""
          width={40}
          height={40}
          priority
          className="size-full object-contain"
        />
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="text-lg font-extrabold tracking-[0.14em]">PACKVEDA</span>
        <span
          className={cn(
            "mt-1 hidden text-[9.5px] font-medium tracking-[0.02em] sm:block",
            dark ? "text-cream-100/60" : "text-navy-600"
          )}
        >
          Packaging Intelligence, Backed by Science
        </span>
      </span>
    </button>
  );
}

export function SiteHeader() {
  const { view, setView, profile, openAuthDialog } = usePackVeda();
  const { status, user, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const authed = status === "authenticated" && Boolean(user);

  const go = (v: View) => {
    // Public visitors can never navigate into the application — protected
    // targets open the authentication gate instead.
    if (!authed && isProtectedView(v)) {
      openAuthDialog({ mode: "signin" });
      setOpen(false);
      return;
    }
    setView(v);
    setOpen(false);
  };

  const scrollToHowItWorks = () => {
    setOpen(false);
    const scroll = () =>
      document
        .getElementById("how-it-works")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (view === "home") {
      scroll();
    } else {
      setView("home");
      window.setTimeout(scroll, 400);
    }
  };

  const startAnalysis = () => {
    setOpen(false);
    if (authed) {
      go("analyze");
    } else {
      openAuthDialog({ mode: "signin" });
    }
  };

  const primaryBtn = (item: { view: View; label: string }) => (
    <button
      key={item.view}
      onClick={() => go(item.view)}
      aria-current={view === item.view ? "page" : undefined}
      className={cn(
        "px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
        view === item.view
          ? "text-forest-700 bg-forest-50"
          : "text-navy-700 hover:text-navy-950 hover:bg-cream-200/70"
      )}
    >
      {item.label}
    </button>
  );

  const signOutAndReset = async () => {
    setOpen(false);
    await signOut();
  };

  const cta = (className?: string) => (
    <Button
      onClick={startAnalysis}
      className={cn("bg-forest-700 hover:bg-forest-600 text-white shadow-sm", className)}
    >
      Start Packaging Analysis
    </Button>
  );

  // ------------------------------ PUBLIC --------------------------------
  if (!authed) {
    return (
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b transition-colors",
          scrolled
            ? "border-border bg-cream-50/85 backdrop-blur-md shadow-[0_1px_12px_rgba(11,31,51,0.06)]"
            : "border-transparent bg-cream-50/60 backdrop-blur-sm"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Wordmark onClick={() => go("home")} />

          {/* Desktop — public nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            <button
              onClick={scrollToHowItWorks}
              className="px-3 py-2 rounded-md text-sm font-medium text-navy-700 transition-colors hover:text-navy-950 hover:bg-cream-200/70 focus-visible:outline-2 focus-visible:outline-ring"
            >
              How It Works
            </button>
            <button
              onClick={() => go("about")}
              aria-current={view === "about" ? "page" : undefined}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                view === "about"
                  ? "text-forest-700 bg-forest-50"
                  : "text-navy-700 hover:text-navy-950 hover:bg-cream-200/70"
              )}
            >
              About
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => openAuthDialog({ mode: "signin" })}
              className="hidden sm:inline-flex gap-1.5 text-navy-800 hover:bg-cream-200/70 hover:text-navy-950"
            >
              <LogIn className="size-4" aria-hidden />
              Sign In
            </Button>
            {cta("hidden sm:inline-flex")}

            {/* Mobile — public */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="size-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-cream-50">
                <SheetHeader>
                  <SheetTitle asChild>
                    <div className="text-left">
                      <Wordmark onClick={() => go("home")} />
                    </div>
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    PACKVEDA navigation menu
                  </SheetDescription>
                </SheetHeader>
                <nav className="mt-2 flex flex-col gap-1 px-2" aria-label="Mobile">
                  <span className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-navy-600">
                    Explore
                  </span>
                  <button
                    onClick={scrollToHowItWorks}
                    className="text-left rounded-md px-3 py-2.5 text-sm font-medium text-navy-700 transition-colors hover:bg-cream-200/70"
                  >
                    How It Works
                  </button>
                  <button
                    onClick={() => go("about")}
                    className={cn(
                      "text-left rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      view === "about"
                        ? "bg-forest-50 text-forest-700"
                        : "text-navy-700 hover:bg-cream-200/70"
                    )}
                  >
                    About
                  </button>
                  <button
                    onClick={() => go("sources")}
                    className="text-left rounded-md px-3 py-2.5 text-sm font-medium text-navy-700 transition-colors hover:bg-cream-200/70"
                  >
                    Data &amp; Sources
                  </button>

                  <span className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-navy-600">
                    Get started
                  </span>
                  {cta("w-full justify-center")}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      openAuthDialog({ mode: "signin" });
                    }}
                    className="gap-1.5 border-navy-800/20 text-navy-800"
                  >
                    <LogIn className="size-4" aria-hidden />
                    Sign In
                  </Button>
                  <p className="px-3 pt-2 text-xs leading-relaxed text-navy-600">
                    Analyses, the AI assistant, marketplace matching and Packaging
                    Passports unlock after you sign in.
                  </p>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    );
  }

  // --------------------------- AUTHENTICATED -----------------------------
  const firstName = profile?.name?.split(" ")[0] || user?.email?.split("@")[0] || "User";
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors",
        scrolled
          ? "border-border bg-cream-50/85 backdrop-blur-md shadow-[0_1px_12px_rgba(11,31,51,0.06)]"
          : "border-transparent bg-cream-50/60 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Wordmark onClick={() => go("dashboard")} />

        {/* Desktop — application nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {AUTH_NAV.map(primaryBtn)}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  AUTH_MORE.some((m) => m.view === view)
                    ? "text-forest-700 bg-forest-50"
                    : "text-navy-700 hover:text-navy-950 hover:bg-cream-200/70"
                )}
              >
                More
                <ChevronDown className="size-4" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {AUTH_MORE.map((m) => (
                <DropdownMenuItem
                  key={m.view}
                  onClick={() => go(m.view)}
                  className={cn(m.view === view && "text-forest-700 font-medium")}
                >
                  {m.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2">
          {cta("hidden sm:inline-flex")}

          {/* User / profile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full border border-navy-800/15 bg-white py-1 pl-1 pr-2.5 shadow-sm transition-colors hover:bg-cream-100 focus-visible:outline-2 focus-visible:outline-ring"
                aria-label="Open account menu"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="bg-forest-700 text-[12px] font-bold text-white">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[7rem] truncate text-sm font-medium text-navy-800 md:block">
                  {firstName}
                </span>
                <ChevronDown className="size-3.5 text-navy-600" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="flex flex-col">
                <span className="truncate text-sm font-semibold text-navy-950">
                  {profile?.name || firstName}
                </span>
                <span className="truncate text-xs font-normal text-navy-600">
                  {user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => go(profile?.role === "seller" ? "seller" : "dashboard")}>
                <LayoutDashboard className="size-4" aria-hidden />
                {profile?.role === "seller" ? "Seller Studio" : "Buyer Dashboard"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go("onboarding")}>
                <Settings2 className="size-4" aria-hidden />
                Buyer / Seller Setup
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => go("about")}>
                <Info className="size-4" aria-hidden />
                About
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go("sources")}>
                <Database className="size-4" aria-hidden />
                Data &amp; Sources
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOutAndReset}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="size-4" aria-hidden />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            onClick={signOutAndReset}
            aria-label="Log out"
            title="Log out"
            className="hidden lg:inline-flex border-navy-800/20 text-navy-700 hover:bg-cream-200/70"
          >
            <LogOut className="size-4" aria-hidden />
          </Button>

          {/* Mobile — authenticated */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-cream-50">
              <SheetHeader>
                <SheetTitle asChild>
                  <div className="text-left">
                    <Wordmark onClick={() => go("dashboard")} />
                  </div>
                </SheetTitle>
                <SheetDescription className="sr-only">
                  PACKVEDA navigation menu
                </SheetDescription>
              </SheetHeader>
              <nav className="scroll-slim mt-2 flex max-h-[calc(100dvh-9rem)] flex-col gap-1 overflow-y-auto px-2 pb-4" aria-label="Mobile">
                {[...AUTH_NAV, ...AUTH_MORE].map((item) => (
                  <button
                    key={item.view}
                    onClick={() => go(item.view)}
                    aria-current={view === item.view ? "page" : undefined}
                    className={cn(
                      "text-left rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      view === item.view
                        ? "bg-forest-50 text-forest-700"
                        : "text-navy-700 hover:bg-cream-200/70"
                    )}
                  >
                    {item.label}
                  </button>
                ))}

                <div className="mt-3 rounded-lg border border-border bg-white p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-navy-950">
                    <UserRound className="size-4 text-forest-700" aria-hidden />
                    {profile?.name || firstName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-navy-600">{user?.email}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={signOutAndReset}
                    className="mt-3 w-full gap-1.5 border-navy-800/20 text-navy-800"
                  >
                    <LogOut className="size-4" aria-hidden />
                    Log out
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
