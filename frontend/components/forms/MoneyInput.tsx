import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export function MoneyInput({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <div className="relative"><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">R$</span><input {...props} inputMode="decimal" className={cn("field tnum pl-11 text-lg font-semibold", className)} /></div>;
}
