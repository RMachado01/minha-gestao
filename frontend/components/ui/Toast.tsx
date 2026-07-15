"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, X, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="size-5 text-pos" />,
  error: <AlertTriangle className="size-5 text-neg" />,
  warning: <AlertTriangle className="size-5 text-warn" />,
  info: <Info className="size-5 text-accent" />,
};

const BG: Record<ToastType, string> = {
  success: "border-pos/20 bg-pos/5",
  error: "border-neg/20 bg-neg/5",
  warning: "border-warn/20 bg-warn/5",
  info: "border-accent/20 bg-accent/5",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl ${BG[t.type]} ${t.exiting ? "toast-exit" : "toast-enter"}`}
          >
            {ICONS[t.type]}
            <span className="text-sm font-medium text-ink">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="ml-2 rounded-lg p-1 text-ink-muted transition-colors hover:text-ink"
              aria-label="Fechar"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
