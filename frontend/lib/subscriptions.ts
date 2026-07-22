import type { BrandIdentity } from "@/lib/brands";

/**
 * Catálogo de serviços de assinatura comuns no Brasil. Cada entrada carrega a
 * cor da marca e o domínio oficial — o domínio alimenta `<BrandLogo>` para
 * exibir o logo real (Spotify, Netflix, Apple…) na lista de recorrentes.
 *
 * `keywords` é usado por `detectSubscriptionBrand()` para reconhecer a marca a
 * partir da descrição digitada pelo usuário, sem exigir seleção manual.
 */
export interface SubscriptionBrand extends BrandIdentity {
  /** Termos (minúsculos, sem acento) que identificam a marca na descrição. */
  keywords: string[];
}

export const SUBSCRIPTION_BRANDS: SubscriptionBrand[] = [
  { label: "Spotify", color: "#1DB954", textColor: "#ffffff", domain: "spotify.com", keywords: ["spotify"] },
  { label: "Netflix", color: "#E50914", textColor: "#ffffff", domain: "netflix.com", keywords: ["netflix"] },
  { label: "Apple", color: "#000000", textColor: "#ffffff", domain: "apple.com", keywords: ["apple", "icloud", "apple music", "apple tv", "app store", "itunes"] },
  { label: "Amazon Prime", color: "#00A8E1", textColor: "#ffffff", domain: "primevideo.com", keywords: ["prime", "amazon prime", "prime video"] },
  { label: "Disney+", color: "#113CCF", textColor: "#ffffff", domain: "disneyplus.com", keywords: ["disney", "disney+", "disney plus"] },
  { label: "Max", color: "#002BE7", textColor: "#ffffff", domain: "max.com", keywords: ["max", "hbo", "hbo max"] },
  { label: "YouTube Premium", color: "#FF0000", textColor: "#ffffff", domain: "youtube.com", keywords: ["youtube", "yt premium", "youtube premium"] },
  { label: "Globoplay", color: "#F5001E", textColor: "#ffffff", domain: "globoplay.com", keywords: ["globoplay", "globo play"] },
  { label: "Paramount+", color: "#0064FF", textColor: "#ffffff", domain: "paramountplus.com", keywords: ["paramount"] },
  { label: "Deezer", color: "#EF5466", textColor: "#ffffff", domain: "deezer.com", keywords: ["deezer"] },
  { label: "Amazon", color: "#FF9900", textColor: "#111111", domain: "amazon.com.br", keywords: ["amazon"] },
  { label: "Google", color: "#4285F4", textColor: "#ffffff", domain: "google.com", keywords: ["google", "google one", "gcp", "google storage"] },
  { label: "Microsoft 365", color: "#0078D4", textColor: "#ffffff", domain: "microsoft.com", keywords: ["microsoft", "office 365", "microsoft 365", "onedrive", "xbox game pass", "xbox"] },
  { label: "ChatGPT", color: "#10A37F", textColor: "#ffffff", domain: "openai.com", keywords: ["openai", "chatgpt", "gpt"] },
  { label: "Claude", color: "#D97757", textColor: "#ffffff", domain: "claude.ai", keywords: ["claude", "anthropic"] },
  { label: "Notion", color: "#000000", textColor: "#ffffff", domain: "notion.so", keywords: ["notion"] },
  { label: "Adobe", color: "#FF0000", textColor: "#ffffff", domain: "adobe.com", keywords: ["adobe", "creative cloud", "photoshop", "lightroom"] },
  { label: "Canva", color: "#00C4CC", textColor: "#111111", domain: "canva.com", keywords: ["canva"] },
  { label: "iFood", color: "#EA1D2C", textColor: "#ffffff", domain: "ifood.com.br", keywords: ["ifood", "ifood club"] },
  { label: "Uber", color: "#000000", textColor: "#ffffff", domain: "uber.com", keywords: ["uber", "uber one"] },
  { label: "Gympass", color: "#FF6B00", textColor: "#ffffff", domain: "wellhub.com", keywords: ["gympass", "wellhub"] },
  { label: "LinkedIn", color: "#0A66C2", textColor: "#ffffff", domain: "linkedin.com", keywords: ["linkedin"] },
  { label: "PlayStation Plus", color: "#003791", textColor: "#ffffff", domain: "playstation.com", keywords: ["playstation", "ps plus", "psn"] },
  { label: "Twitch", color: "#9146FF", textColor: "#ffffff", domain: "twitch.tv", keywords: ["twitch"] },
];

/** Remove acentos e normaliza para comparação de palavras-chave. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Tenta reconhecer a marca de uma assinatura a partir da descrição livre.
 * Retorna a identidade da marca (com domínio para o logo) ou `null` quando
 * nenhum serviço conhecido é identificado.
 */
export function detectSubscriptionBrand(description: string | null | undefined): SubscriptionBrand | null {
  if (!description) return null;
  const text = normalize(description);
  for (const brand of SUBSCRIPTION_BRANDS) {
    if (brand.keywords.some((keyword) => text.includes(normalize(keyword)))) {
      return brand;
    }
  }
  return null;
}
