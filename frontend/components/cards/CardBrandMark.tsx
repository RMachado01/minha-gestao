import { CARD_BRANDS, getBrand } from "@/lib/brands";
import { cn } from "@/lib/cn";

/** Wordmark da bandeira para o cartão físico (fundo escuro/colorido). */
export function CardBrandMark({ brand, className }: { brand: string; className?: string }) {
  const identity = getBrand(CARD_BRANDS, brand);

  if (brand === "Mastercard") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className="relative inline-flex h-4 w-6" aria-hidden="true">
          <span className="absolute left-0 h-4 w-4 rounded-full bg-[#EB001B]/95" />
          <span className="absolute left-2 h-4 w-4 rounded-full bg-[#FF9900]/95 mix-blend-screen" />
        </span>
        <span className="text-sm font-bold tracking-tight text-white/95">Mastercard</span>
      </span>
    );
  }

  return (
    <span className={cn("text-sm font-bold italic tracking-tight text-white/95", className)}>
      {identity.label}
    </span>
  );
}
