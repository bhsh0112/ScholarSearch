import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScholarSearch",
  description: "面向科研调研的聚合文献检索与追踪工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh bg-[color:var(--background)] text-[color:var(--foreground)]`}
      >
        <div className="relative flex min-h-dvh flex-col bg-[color:var(--background)]">
          <div className="pointer-events-none fixed inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0_0,rgba(59,130,246,0.3),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.3),transparent_55%)]" />
          </div>
          <header className="sticky top-0 z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-indigo-400/90 via-sky-400/80 to-emerald-400/80 shadow-[0_18px_50px_-28px_rgba(99,102,241,0.9)]" />
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-tight">ScholarSearch</div>
                  <div className="text-[11px] text-slate-400">聚合文献检索与追踪</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
