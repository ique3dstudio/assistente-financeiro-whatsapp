// Tira fotos das telas do app, no tamanho de um iPhone, com dados de mentira —
// para conferir o layout sem precisar do celular nem do banco.
//
//   npm install --no-save playwright && node scripts/telas-foto.js
//
// As imagens saem em /tmp/telas/. Requer o Chromium do ambiente.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const PASTA_SAIDA = process.env.SAIDA || "/tmp/telas";
const PORTA = 4321;

// Reaproveita exatamente as respostas de mentira dos testes de tela.
import { RESPOSTAS } from "./fixtures.js";

RESPOSTAS["/treino/estatisticas?dias=180"] = RESPOSTAS["/treino"].estatisticas;
RESPOSTAS["/sessao"] = { autenticado: true };

const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname.startsWith("/api")) {
    const caminho = url.pathname.replace("/api", "") + (url.search || "");
    const dados = RESPOSTAS[caminho] ?? RESPOSTAS[url.pathname.replace("/api", "")] ?? { ok: true };
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(dados));
  }

  const arquivo = path.join("public", url.pathname === "/" ? "index.html" : url.pathname);
  if (!fs.existsSync(arquivo)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(arquivo)] || "text/plain" });
  res.end(fs.readFileSync(arquivo));
});

await new Promise((resolve) => servidor.listen(PORTA, resolve));
fs.mkdirSync(PASTA_SAIDA, { recursive: true });

const TELAS = [
  ["hoje", "/#/hoje"],
  ["agua", "/#/agua"],
  ["corpo", "/#/corpo"],
  ["treino-exec", "/#/treino/exec"],
  ["treino-stats", "/#/treino/stats"],
  ["metas", "/#/metas"],
  ["agenda", "/#/agenda"],
  ["eu", "/#/eu"],
  ["habito-novo", "/#/habitos/novo"],
];

// O Chromium do ambiente já está instalado; apontamos direto para ele em vez
// de deixar o Playwright tentar baixar a versão que ele espera.
const CAMINHO_CHROME = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const navegador = await chromium.launch(
  fs.existsSync(CAMINHO_CHROME) ? { executablePath: CAMINHO_CHROME } : {}
);

for (const tema of ["dark", "light"]) {
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: tema,
    isMobile: true,
    hasTouch: true,
  });

  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on("pageerror", (erro) => erros.push(erro.message));
  pagina.on("console", (msg) => msg.type() === "error" && erros.push(msg.text()));

  for (const [nome, rota] of TELAS) {
    await pagina.goto(`http://localhost:${PORTA}${rota}`, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(700); // deixa as animações terminarem
    await pagina.screenshot({ path: `${PASTA_SAIDA}/${tema}-${nome}.png`, fullPage: nome !== "hoje" });
  }

  console.log(`${tema}: ${TELAS.length} telas${erros.length ? ` — ERROS: ${[...new Set(erros)].join(" | ")}` : " — sem erros no console"}`);
  await contexto.close();
}

await navegador.close();
servidor.close();
console.log(`fotos em ${PASTA_SAIDA}`);
