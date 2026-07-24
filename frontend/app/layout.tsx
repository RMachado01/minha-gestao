import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { SmoothScroll } from "@/components/shell/SmoothScroll";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { AppLock } from "@/components/security/AppLock";

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
  applicationName: "Minha Gestão",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Minha Gestão",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Minha Gestão — Financeiro pessoal",
    description: "Gestão financeira pessoal, familiar e de trabalho em um único lugar.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('mg-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='light'?'#f4f5f0':'#07100d';var a=localStorage.getItem('mg-accent');if(a&&/^#[0-9a-f]{6}$/i.test(a))document.documentElement.style.setProperty('--color-accent',a);if(localStorage.getItem('mg-lock')&&sessionStorage.getItem('mg-lock-ok')!=='1'){document.documentElement.dataset.locked='1'}}catch(e){}})()` }} />
      </head>
      <body className="min-h-dvh">
        <RegisterSW />
        <AppLock />
        <div id="app-root">
          <SmoothScroll>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </SmoothScroll>
        </div>
      </body>
    </html>
  );
}
