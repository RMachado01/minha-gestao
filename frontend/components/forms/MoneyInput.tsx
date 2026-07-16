"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ChangeEvent } from "react";
import { cn } from "@/lib/cn";

type MoneyInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  onValueChange?: (value: number, formatted: string) => void;
};

export function parseBRL(value: FormDataEntryValue | string | null): number {
  const normalized = String(value ?? "").replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", ".");
  return Number(normalized);
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initialDisplay(value: string | number | readonly string[] | undefined): string {
  if (value === undefined || value === "") return "";
  if (typeof value === "number") return Number.isFinite(value) ? formatNumber(value) : "";
  if (typeof value !== "string") return "";
  const parsed = parseBRL(value);
  return Number.isFinite(parsed) ? formatNumber(parsed) : "";
}

/** Máscara BRL: cada dígito digitado desloca centavos automaticamente. */
export function MoneyInput({ className, value, defaultValue, onChange, onValueChange, ...props }: MoneyInputProps) {
  const controlled = value !== undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const [display, setDisplay] = useState(() => initialDisplay(controlled ? value : defaultValue));

  const renderedValue = controlled ? initialDisplay(value) : display;

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form || controlled) return;
    const reset = () => setDisplay(initialDisplay(defaultValue));
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [controlled, defaultValue]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    const numericValue = digits ? Number(digits) / 100 : 0;
    const formatted = digits ? formatNumber(numericValue) : "";
    if (!controlled) setDisplay(formatted);
    onValueChange?.(numericValue, formatted);
    onChange?.(event);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-sm font-semibold text-ink-muted">R$</span>
      <input
        ref={inputRef}
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={renderedValue}
        onChange={handleChange}
        className={cn("field field-with-currency tnum text-lg font-semibold", className)}
      />
    </div>
  );
}
