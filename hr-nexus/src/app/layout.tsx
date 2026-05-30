import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="flex h-full flex-col overflow-hidden bg-cloud-mist text-text-black">
        <header className="sticky top-0 z-40 border-b border-platinum-tint bg-snow-white shadow-[0_1px_0_rgba(71,103,136,0.06)]">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div
                className="relative h-9 w-9 overflow-hidden rounded-lg"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#e55cff,transparent_55%),radial-gradient(circle_at_70%_70%,#0099ff,transparent_55%),radial-gradient(circle_at_50%_50%,#006BFF,transparent_70%)]" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight text-midnight-indigo">HR Nexus</div>
                <div className="text-xs text-slate-blue">Leave · Payroll · Talent AI</div>
              </div>
            </div>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="nav-link rounded-lg px-3 py-1.5">
                Chat
              </Link>
              <Link href="/admin" className="nav-link rounded-lg px-3 py-1.5">
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
