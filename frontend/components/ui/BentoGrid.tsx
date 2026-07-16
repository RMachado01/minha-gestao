import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Grid bento base: 12 colunas no desktop, empilha em coluna única no mobile.
 * Filhos controlam seu tamanho com col-span / row-span (ex: "col-span-12 lg:col-span-8").
 */
export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "bento-stagger grid grid-cols-1 gap-4 sm:grid-cols-6 lg:grid-cols-12 lg:gap-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
