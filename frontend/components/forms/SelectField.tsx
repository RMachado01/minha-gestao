import type { ComponentPropsWithoutRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function SelectField({ className, children, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <span className="relative block">
      <select {...props} className={cn("field select-modern", className)}>{children}</select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
    </span>
  );
}
