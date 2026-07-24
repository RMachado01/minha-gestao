/*
 * Service worker do Minha Gestão.
 * Conservador de propósito (app financeiro): faz cache apenas de estáticos
 * imutáveis (ícones, /_next/static). NUNCA guarda respostas de API, páginas
 * autenticadas ou dados do Supabase — essas passam sempre pela rede.
 */
const CACHE = "mg-static-v1";
const STATIC = ["/icon.svg", "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Só mexe em recursos do próprio domínio (deixa Supabase/Groq/Logo.dev passar).
  if (url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    STATIC.includes(url.pathname) ||
    /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname);

  // Cache-first para estáticos imutáveis.
  if (isStatic) {
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Navegações: rede primeiro; se offline, página mínima de fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(
            "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Sem conexão</title><body style='font-family:system-ui;background:#0d1512;color:#eef2ef;display:grid;place-items:center;height:100vh;margin:0;text-align:center;padding:24px'><div><h1 style='font-size:20px;margin:0 0 8px'>Sem conexão</h1><p style='color:#adbbb3;margin:0'>Reconecte para acessar o Minha Gestão.</p></div>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          ),
      ),
    );
    return;
  }

  // Demais requisições (API, autenticadas): rede apenas, sem cache.
});

// ── Notificações push ──
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Minha Gestão", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Minha Gestão";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        // Se já há uma aba aberta, foca nela e navega.
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(target);
          return undefined;
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
