import type { BrandIdentity } from "@/lib/brands";
import { cn } from "@/lib/cn";

interface BrandBadgeProps {
  identity: BrandIdentity;
  className?: string;
  /** "soft" = fundo translúcido na cor da marca (padrão). "solid" = fundo cheio. */
  variant?: "solid" | "soft";
}

/** Chip de identidade de marca (bandeira, banco ou operadora) com a cor própria daquela marca. */
export function BrandBadge({ identity, className, variant = "soft" }: BrandBadgeProps) {
  const style =
    variant === "solid"
      ? { background: identity.color, color: identity.textColor }
      : {
          background: `color-mix(in oklab, ${identity.color} 18%, transparent)`,
          color: identity.color,
          border: `1px solid color-mix(in oklab, ${identity.color} 38%, transparent)`,
        };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        className,
      )}
      style={style}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: variant === "solid" ? identity.textColor : identity.color }}
      />
      {identity.label}
    </span>
  );
}
