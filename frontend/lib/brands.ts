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
}

const FALLBACK: BrandIdentity = { label: "—", color: "#6b7a72", textColor: "#ffffff" };

export const CARD_BRANDS: Record<string, BrandIdentity> = {
  Visa: { label: "Visa", color: "#1A1F71", textColor: "#ffffff" },
  Mastercard: { label: "Mastercard", color: "#EB001B", textColor: "#ffffff" },
  Elo: { label: "Elo", color: "#000000", textColor: "#ffffff" },
  "American Express": { label: "Amex", color: "#006FCF", textColor: "#ffffff" },
};

export const BANKS: Record<string, BrandIdentity> = {
  Nubank: { label: "Nubank", color: "#8A05BE", textColor: "#ffffff" },
  Itaú: { label: "Itaú", color: "#EC7000", textColor: "#ffffff" },
  Bradesco: { label: "Bradesco", color: "#CC092F", textColor: "#ffffff" },
  Santander: { label: "Santander", color: "#EC0000", textColor: "#ffffff" },
  "Banco do Brasil": { label: "Banco do Brasil", color: "#F8D117", textColor: "#003087" },
  Caixa: { label: "Caixa", color: "#0057A0", textColor: "#ffffff" },
  Inter: { label: "Inter", color: "#FF7A00", textColor: "#ffffff" },
  "C6 Bank": { label: "C6 Bank", color: "#242424", textColor: "#FFDE59" },
  BTG: { label: "BTG Pactual", color: "#191919", textColor: "#ffffff" },
  PicPay: { label: "PicPay", color: "#21C25E", textColor: "#ffffff" },
  Next: { label: "Next", color: "#00E08E", textColor: "#003300" },
  Original: { label: "Original", color: "#00A868", textColor: "#ffffff" },
  Neon: { label: "Neon", color: "#00D8D3", textColor: "#003330" },
  "Mercado Pago": { label: "Mercado Pago", color: "#00AEEF", textColor: "#003049" },
  PagBank: { label: "PagBank", color: "#00C650", textColor: "#ffffff" },
  Sicoob: { label: "Sicoob", color: "#7DB61C", textColor: "#ffffff" },
  Sicredi: { label: "Sicredi", color: "#6DB33F", textColor: "#ffffff" },
  Outro: { label: "Outro banco", color: "#006b3f", textColor: "#ffffff" },
};

export const BENEFIT_OPERATORS: Record<string, BrandIdentity> = {
  Alelo: { label: "Alelo", color: "#FF6600", textColor: "#ffffff" },
  Sodexo: { label: "Sodexo (Pluxee)", color: "#E4032E", textColor: "#ffffff" },
  Ticket: { label: "Ticket", color: "#0033A0", textColor: "#ffffff" },
  VR: { label: "VR Benefícios", color: "#EE7203", textColor: "#ffffff" },
  Flash: { label: "Flash", color: "#6C3CE9", textColor: "#ffffff" },
  Caju: { label: "Caju", color: "#FF5A5F", textColor: "#ffffff" },
  Swile: { label: "Swile", color: "#00C2A8", textColor: "#00332c" },
  Outro: { label: "Outra operadora", color: "#006b3f", textColor: "#ffffff" },
};

/** Busca a identidade de marca em `map`, com fallback seguro para valores ausentes/desconhecidos. */
export function getBrand(map: Record<string, BrandIdentity>, key: string | null | undefined): BrandIdentity {
  if (!key) return map.Outro ?? FALLBACK;
  return map[key] ?? { ...FALLBACK, label: key };
}
