"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Gerencia a inscrição de notificações push do navegador atual.
 * O service worker (registrado em produção) entrega as notificações; aqui
 * cuidamos de permissão, inscrição no PushManager e sincronização com o banco.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

type Status = "unsupported" | "default" | "granted" | "denied";

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [status, setStatus] = useState<Status>("default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    // Deferido para um microtask (leituras só-cliente), evitando setState
    // síncrono no corpo do efeito.
    void Promise.resolve().then(() => {
      const ok =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      setSupported(ok);
      if (!ok) {
        setStatus("unsupported");
        return;
      }
      setStatus(Notification.permission as Status);
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(Boolean(sub)))
        .catch(() => {
          /* SW ainda não pronto (ex.: dev): mantém não inscrito */
        });
    });
  }, []);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      if (!vapidKey) {
        setError("Notificações ainda não configuradas no servidor.");
        return false;
      }
      const permission = await Notification.requestPermission();
      setStatus(permission as Status);
      if (permission !== "granted") {
        setError(
          permission === "denied"
            ? "Permissão negada. Habilite as notificações nas configurações do navegador."
            : "Permissão não concedida.",
        );
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {});
        setError("Não foi possível salvar a inscrição. Tente novamente.");
        return false;
      }
      setSubscribed(true);
      return true;
    } catch {
      setError("Não foi possível ativar as notificações neste dispositivo.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [vapidKey]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setSubscribed(false);
      return true;
    } catch {
      setError("Não foi possível desativar as notificações.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setError("");
    const res = await fetch("/api/push/test", { method: "POST" });
    if (!res.ok) {
      setError("Não foi possível enviar o teste. Verifique se as notificações estão ativas.");
      return false;
    }
    return true;
  }, []);

  return { supported, subscribed, status, busy, error, subscribe, unsubscribe, sendTest } as const;
}
