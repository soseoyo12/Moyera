import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Script from "next/script";

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
      {/* Google Tag Manager */}
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}>
        <Script id="gtm-init" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-NRL8ZQL5');
          `}
        </Script>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NRL8ZQL5" height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
        </noscript>
        <header className="bg-white border-b">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
            <Link href="/" className="font-semibold rounded px-2 py-1 text-[#0A84FF] hover:bg-slate-50">Moyera</Link>
            <nav className="text-sm/6 flex gap-1">
              <Link href="/new" className="rounded px-2 py-1 text-slate-700 hover:text-[#0A84FF] hover:bg-slate-50">새 세션</Link>
              <Link href="/privacy" className="rounded px-2 py-1 text-slate-700 hover:text-[#0A84FF] hover:bg-slate-50">Privacy</Link>
              <Link href="/terms" className="rounded px-2 py-1 text-slate-700 hover:text-[#0A84FF] hover:bg-slate-50">Terms</Link>
            </nav>
          </div>
        </header>
        <main className="min-h-[calc(100dvh-56px)]">{children}</main>
      </body>
    </html>
  );
}
