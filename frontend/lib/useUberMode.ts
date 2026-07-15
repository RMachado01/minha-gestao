"use client";

import { useSyncExternalStore, useCallback } from "react";

const KEY = "mg-uber-mode";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
function notify() { listeners.forEach((cb) => cb()); }
function getSnapshot() { return localStorage.getItem(KEY) === "true"; }
function getServerSnapshot() { return false; }

export function useUberMode() {
  const isUber = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setUberMode = useCallback((value: boolean) => {
    localStorage.setItem(KEY, String(value));
    notify();
  }, []);

  return { isUber, setUberMode } as const;
}
