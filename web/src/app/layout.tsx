import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

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
        <div className="relative flex min-h-dvh flex-col">
          {/* 高级背景光晕 */}
          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            {/* 左上角蓝色光晕 */}
            <div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[100px] dark:bg-blue-500/5" />
            {/* 右下角青色光晕 */}
            <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-500/5" />
            {/* 中间紫色光晕 */}
            <div className="absolute left-[50%] top-[50%] h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/5 blur-[120px] dark:bg-violet-500/5" />
          </div>

          <header className="sticky top-0 z-50 border-b border-black/5 bg-white/50 backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/50">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                </div>
                <div className="leading-tight">
                  <div className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">ScholarSearch</div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Research & Track</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/pricing"
                  className="hidden rounded-xl px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10 sm:inline-flex"
                >
                  定价
                </Link>
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
