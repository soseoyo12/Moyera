import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
  title: "Moyera – 일정 조율",
  description: "여러 사람의 가능/불가능 시간을 수집하고 최적 시간을 추천합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}> 
        <header className="bg-blue-600 text-white shadow-sm">
          <div className="mx-auto max-w-6xl p-4 flex items-center gap-4">
            <Link href="/" className="font-semibold rounded px-2 py-1 hover:bg-blue-500">Moyera</Link>
            <nav className="text-sm/6 flex gap-3">
              <Link href="/" className="rounded px-2 py-1 hover:bg-blue-500">그리드</Link>
              <Link href="/new" className="rounded px-2 py-1 hover:bg-blue-500">새 세션</Link>
            </nav>
          </div>
        </header>
        <main className="min-h-[calc(100dvh-56px)]">{children}</main>
      </body>
    </html>
  );
}
