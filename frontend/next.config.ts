import type { NextConfig } from "next";

/**
 * Origem do serviço de logos de marca (bancos/assinaturas), liberada em
 * `img-src`. Deriva de `NEXT_PUBLIC_LOGO_BASE` para acompanhar o provedor
 * configurado; inclui os provedores comuns como padrão seguro.
 */
function logoImgSources(): string {
  const hosts = new Set(["https://logo.clearbit.com", "https://img.logo.dev", "https://cdn.brandfetch.io"]);
  const base = process.env.NEXT_PUBLIC_LOGO_BASE;
  if (base) {
    try {
      hosts.add(new URL(base.replace("{domain}", "x").replace("{size}", "1")).origin);
    } catch {
      /* base inválida: mantém apenas os padrões */
    }
  }
  return Array.from(hosts).join(" ");
}

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.hcaptcha.com https://newassets.hcaptcha.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://newassets.hcaptcha.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${logoImgSources()}`,
  "connect-src 'self' https://*.supabase.co https://*.hcaptcha.com",
  "frame-src https://newassets.hcaptcha.com https://*.hcaptcha.com",
].join("; ") + ";";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: CSP },
      ],
    },
  ],
};

export default nextConfig;
