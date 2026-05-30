import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HR Nexus",
  description: "Chat-based HR workflow assistant demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[radial-gradient(circle_at_30%_30%,#7c3aed,transparent_55%),radial-gradient(circle_at_70%_70%,#22d3ee,transparent_55%)] ring-1 ring-white/15" />
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight text-white">HR Nexus</div>
                <div className="text-xs text-white/60">Demo Command Center</div>
              </div>
            </div>
            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/"
                className="rounded-full px-3 py-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Chat
              </Link>
              <Link
                href="/admin"
                className="rounded-full px-3 py-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Admin
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
