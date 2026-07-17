"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    (notify) => {
      window.addEventListener("mg-theme-change", notify);
      window.addEventListener("storage", notify);
      return () => { window.removeEventListener("mg-theme-change", notify); window.removeEventListener("storage", notify); };
    },
    () => (document.documentElement.dataset.theme as Theme) || "dark",
    () => "dark",
  );

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#f4f5f0" : "#07100d");
    localStorage.setItem("mg-theme", next);
    window.dispatchEvent(new Event("mg-theme-change"));
  }

  return (
    <button type="button" onClick={toggle} className="ios-glass grid size-11 place-items-center rounded-xl text-ink-soft transition-colors hover:text-ink" aria-label={`Ativar modo ${theme === "dark" ? "claro" : "escuro"}`} title={`Ativar modo ${theme === "dark" ? "claro" : "escuro"}`}>
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
