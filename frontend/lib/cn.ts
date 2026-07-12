/** Concatena classes condicionais (nomes falsy são ignorados). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
