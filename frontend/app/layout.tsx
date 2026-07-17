import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { SmoothScroll } from "@/components/shell/SmoothScroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Minha Gestão — Financeiro pessoal",
  description: "Gestão financeira pessoal, familiar e de trabalho em um único lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        <meta id="theme-color" name="theme-color" content="#07100d" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('mg-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='light'?'#f4f5f0':'#07100d';var a=localStorage.getItem('mg-accent');if(a&&/^#[0-9a-f]{6}$/i.test(a))document.documentElement.style.setProperty('--color-accent',a)}catch(e){}})()` }} />
      </head>
      <body className="min-h-dvh">
        <SmoothScroll>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
