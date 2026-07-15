import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta id="theme-color" name="theme-color" content="#060808" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('mg-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='light'?'#f4f9f4':'#060808';var a=localStorage.getItem('mg-accent');if(a&&/^#[0-9a-f]{6}$/i.test(a))document.documentElement.style.setProperty('--color-accent',a)}catch(e){}})()` }} />
      </head>
      <body className="min-h-dvh">
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
