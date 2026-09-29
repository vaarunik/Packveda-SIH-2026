import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PACKVEDA — AI-Powered Food Packaging Intelligence",
  description:
    "An intelligent decision-support platform that recommends food packaging materials based on commodity properties, storage conditions, barrier requirements, shelf-life goals, cost, sustainability, and regulatory considerations. Built for Smart India Hackathon 2026 — Problem Statement 26236.",
  keywords: [
    "PACKVEDA",
    "food packaging",
    "packaging recommendation",
    "shelf life",
    "OTR",
    "WVTR",
    "Smart India Hackathon",
    "SIH 2026",
    "PS 26236",
  ],
  authors: [{ name: "Team PACKVEDA" }],
  // Favicon is served via the src/app/icon.png file convention.
  openGraph: {
    title: "PACKVEDA — AI-Powered Food Packaging Intelligence",
    description:
      "Smarter Packaging. Safer Food. Longer Shelf Life. Decision support for food packaging selection.",
    siteName: "PACKVEDA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
