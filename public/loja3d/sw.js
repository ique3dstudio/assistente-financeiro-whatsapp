const CACHE = "pedidos3d-shell-v3";
const SHELL_FILES = [
  "/loja3d/",
  "/loja3d/index.html",
  "/loja3d/styles.css",
  "/loja3d/app.js",
  "/loja3d/manifest.json",
  "/loja3d/icon.svg",
  "/loja3d/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Só cuida do "app shell" (HTML/CSS/JS estáticos). Dados do Supabase sempre vão direto pra rede.
// Estratégia "rede primeiro": sempre busca a versão mais nova quando há internet (essencial numa
// app que recebe atualizações com frequência) e só usa o cache como reserva se estiver offline.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/loja3d/")) {
    return;
  }
  if (url.pathname === "/loja3d/config.js") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
