import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="en" className={`${plusJakartaSans.className} h-full antialiased`}>
      <body className="flex h-full flex-col overflow-hidden bg-mist">
        <header className="sticky top-0 z-40 bg-snow bg-opacity-80 backdrop-blur-md border-b border-pebble">
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="leading-tight">
                <div className="text-[18px] font-bold tracking-tight text-obsidian">HR Nexus</div>
                <div className="text-[12px] text-steel">Awesomic Workflow</div>
              </div>
            </Link>
            <nav className="flex items-center gap-6 text-[14px]">
              <Link href="/admin" className="font-medium text-ink hover:text-obsidian transition-colors">
                Admin
              </Link>
              <Link
                href="/chat"
                className="bg-obsidian text-snow px-5 py-2.5 rounded-[36px] font-medium shadow-subtle hover:shadow-subtle-2 transition-all"
              >
                Go to App
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-mist">
          {children}
        </main>
      </body>
    </html>
  );
}
