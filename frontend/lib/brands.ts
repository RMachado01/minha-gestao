/**
 * Identidade visual de bandeiras de cartão, bancos emissores e operadoras
 * de benefício (VR/VA) — cor de marca usada em badges e no cartão físico.
 */

export interface BrandIdentity {
  label: string;
  /** Cor de marca (hex) usada em gradientes de cartão e chips. */
  color: string;
  /** Cor de texto legível sobre `color` cheio. */
  textColor: string;
  /**
   * Domínio oficial da marca (ex.: "nubank.com.br"). Usado por `<BrandLogo>`
   * para buscar o logo real via serviço de logos, com fallback para a inicial.
   */
  domain?: string;
}

const FALLBACK: BrandIdentity = { label: "—", color: "#6b7a72", textColor: "#ffffff" };

export const CARD_BRANDS: Record<string, BrandIdentity> = {
  Visa: { label: "Visa", color: "#1A1F71", textColor: "#ffffff", domain: "visa.com" },
  Mastercard: { label: "Mastercard", color: "#EB001B", textColor: "#ffffff", domain: "mastercard.com" },
  Elo: { label: "Elo", color: "#000000", textColor: "#ffffff", domain: "elo.com.br" },
  "American Express": { label: "Amex", color: "#006FCF", textColor: "#ffffff", domain: "americanexpress.com" },
};

export const BANKS: Record<string, BrandIdentity> = {
  Nubank: { label: "Nubank", color: "#8A05BE", textColor: "#ffffff", domain: "nubank.com.br" },
  Itaú: { label: "Itaú", color: "#EC7000", textColor: "#ffffff", domain: "itau.com.br" },
  Bradesco: { label: "Bradesco", color: "#CC092F", textColor: "#ffffff", domain: "bradesco.com.br" },
  Santander: { label: "Santander", color: "#EC0000", textColor: "#ffffff", domain: "santander.com.br" },
  "Banco do Brasil": { label: "Banco do Brasil", color: "#F8D117", textColor: "#003087", domain: "bb.com.br" },
  Caixa: { label: "Caixa", color: "#0057A0", textColor: "#ffffff", domain: "caixa.gov.br" },
  Inter: { label: "Inter", color: "#FF7A00", textColor: "#ffffff", domain: "bancointer.com.br" },
  "C6 Bank": { label: "C6 Bank", color: "#242424", textColor: "#FFDE59", domain: "c6bank.com.br" },
  BTG: { label: "BTG Pactual", color: "#191919", textColor: "#ffffff", domain: "btgpactual.com" },
  PicPay: { label: "PicPay", color: "#21C25E", textColor: "#ffffff", domain: "picpay.com" },
  Next: { label: "Next", color: "#00E08E", textColor: "#003300", domain: "next.me" },
  Original: { label: "Original", color: "#00A868", textColor: "#ffffff", domain: "original.com.br" },
  Neon: { label: "Neon", color: "#00D8D3", textColor: "#003330", domain: "neon.com.br" },
  "Mercado Pago": { label: "Mercado Pago", color: "#00AEEF", textColor: "#003049", domain: "mercadopago.com.br" },
  PagBank: { label: "PagBank", color: "#00C650", textColor: "#ffffff", domain: "pagbank.com.br" },
  Sicoob: { label: "Sicoob", color: "#7DB61C", textColor: "#ffffff", domain: "sicoob.com.br" },
  Sicredi: { label: "Sicredi", color: "#6DB33F", textColor: "#ffffff", domain: "sicredi.com.br" },
  Outro: { label: "Outro banco", color: "#006b3f", textColor: "#ffffff" },
};

export const BENEFIT_OPERATORS: Record<string, BrandIdentity> = {
  Alelo: { label: "Alelo", color: "#FF6600", textColor: "#ffffff", domain: "alelo.com.br" },
  Sodexo: { label: "Sodexo (Pluxee)", color: "#E4032E", textColor: "#ffffff", domain: "pluxee.com.br" },
  Ticket: { label: "Ticket", color: "#0033A0", textColor: "#ffffff", domain: "ticket.com.br" },
  VR: { label: "VR Benefícios", color: "#EE7203", textColor: "#ffffff", domain: "vr.com.br" },
  Flash: { label: "Flash", color: "#6C3CE9", textColor: "#ffffff", domain: "flashapp.com.br" },
  Caju: { label: "Caju", color: "#FF5A5F", textColor: "#ffffff", domain: "caju.com.br" },
  Swile: { label: "Swile", color: "#00C2A8", textColor: "#00332c", domain: "swile.co" },
  Outro: { label: "Outra operadora", color: "#006b3f", textColor: "#ffffff" },
};

/**
 * Serviço de logos por domínio — Logo.dev (https://www.logo.dev). A chave é
 * publicável (segura no client). Pode ser sobrescrita por
 * `NEXT_PUBLIC_LOGO_DEV_TOKEN`, ou trocada por outro provedor via
 * `NEXT_PUBLIC_LOGO_BASE` (com `{domain}`/`{size}` substituídos).
 *
 * Nota de licença: no plano gratuito, o uso comercial exige um link de
 * atribuição de volta para o Logo.dev (projetos pessoais não).
 */
const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN ?? "pk_d3XNtLL5TEmawlyLbImdFQ";
const LOGO_BASE_OVERRIDE = process.env.NEXT_PUBLIC_LOGO_BASE;

/** URL do logo da marca a partir do domínio. `null` quando não há domínio conhecido. */
export function logoUrl(domain: string | null | undefined, size = 128): string | null {
  if (!domain) return null;
  if (LOGO_BASE_OVERRIDE) {
    return LOGO_BASE_OVERRIDE.replace("{domain}", domain).replace("{size}", String(size));
  }
  // `fallback=404` faz o Logo.dev retornar 404 quando não tem o logo, para que
  // o <BrandLogo> caia no fallback próprio (inicial na cor da marca) em vez do
  // monograma preto-e-branco padrão do serviço.
  const params = new URLSearchParams({
    token: LOGO_DEV_TOKEN,
    size: String(size),
    format: "png",
    retina: "true",
    fallback: "404",
  });
  return `https://img.logo.dev/${encodeURIComponent(domain)}?${params.toString()}`;
}

/** Busca a identidade de marca em `map`, com fallback seguro para valores ausentes/desconhecidos. */
export function getBrand(map: Record<string, BrandIdentity>, key: string | null | undefined): BrandIdentity {
  if (!key) return map.Outro ?? FALLBACK;
  return map[key] ?? { ...FALLBACK, label: key };
}
