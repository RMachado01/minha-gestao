"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const ACCENT_KEY = "mg-accent";
const PHOTO_KEY = "mg-photo";
const NAME_KEY = "mg-user-name";

// ponytail: minimal pub/sub so multiple components react to changes
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notify() { listeners.forEach((cb) => cb()); }

function getSnapshot() {
  return JSON.stringify({
    accent: localStorage.getItem(ACCENT_KEY),
    photo: localStorage.getItem(PHOTO_KEY),
    name: localStorage.getItem(NAME_KEY),
  });
}

function getServerSnapshot() {
  return JSON.stringify({ accent: null, photo: null, name: null });
}

export const ACCENT_PRESETS = [
  { name: "Verde Palmeiras", value: "#006b3f" },
  { name: "Verde Claro", value: "#00a86b" },
  { name: "Esmeralda", value: "#34d399" },
  { name: "Teal", value: "#2dd4bf" },
  { name: "Azul", value: "#60a5fa" },
  { name: "Índigo", value: "#818cf8" },
  { name: "Violeta", value: "#a78bfa" },
  { name: "Rosa", value: "#f472b6" },
] as const;

function applyAccent(color: string | null) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return;
  document.documentElement.style.setProperty("--color-accent", color);
}

export function usePersonalization() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { accent, photo, name } = JSON.parse(raw) as {
    accent: string | null;
    photo: string | null;
    name: string | null;
  };

  useEffect(() => { applyAccent(accent); }, [accent]);

  const setAccent = useCallback((color: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    localStorage.setItem(ACCENT_KEY, color);
    applyAccent(color);
    notify();
  }, []);

  const setPhoto = useCallback((dataUrl: string) => {
    // Cap at ~512KB base64 to avoid localStorage exhaustion
    if (dataUrl.length > 700_000) return;
    localStorage.setItem(PHOTO_KEY, dataUrl);
    notify();
  }, []);

  const setName = useCallback((n: string) => {
    localStorage.setItem(NAME_KEY, n);
    notify();
  }, []);

  return { accent, photo, name, setAccent, setPhoto, setName } as const;
}
