// Service worker mínimo: guarda a casca do app para abrir rápido e offline.
// Os dados (chamadas /api) nunca são cacheados — sempre vêm da rede.
const CACHE = "lifeos-v6";
const CASCA = [
  "/", "/styles.css", "/app.js", "/ui.js", "/sync.js", "/manifest.json", "/icone.svg",
  "/telas/hoje.js", "/telas/habitos.js", "/telas/agua.js", "/telas/agenda.js",
  "/telas/metas.js", "/telas/dinheiro.js", "/telas/eu.js", "/telas/foco.js", "/telas/treino.js",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CASCA)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  const url = new URL(evento.request.url);
  if (evento.request.method !== "GET" || url.pathname.startsWith("/api")) return;

  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE).then((cache) => cache.put(evento.request, copia));
        return resposta;
      })
      .catch(() => caches.match(evento.request))
  );
});
