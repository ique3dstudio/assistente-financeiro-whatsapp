import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { entrar, exigirLogin, sair, autenticado } from "./core/auth.js";
import { MODULOS, dashboard } from "./core/modulos.js";
import { hoje } from "./core/datas.js";
import webhookRouter from "./core/webhook.js";

const PASTA = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const porta = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(PASTA, "..", "public")));

// --- Núcleo ---
app.get("/saude", (req, res) => {
  res.json({ status: "ok", app: "vida-os", data: hoje(), modulos: MODULOS.map((m) => m.id) });
});

app.post("/api/login", entrar);
app.post("/api/sair", sair);
app.get("/api/sessao", (req, res) => res.json({ autenticado: autenticado(req) }));

app.get("/api/dashboard", exigirLogin, async (req, res, next) => {
  try {
    res.json({ data: hoje(), ...(await dashboard(req.usuario)) });
  } catch (erro) {
    next(erro);
  }
});

// --- Módulos: cada um vira /api/<id> ---
for (const modulo of MODULOS) {
  app.use(`/api/${modulo.id}`, exigirLogin, modulo.rotas);
}

// --- WhatsApp (entrada rápida por mensagem) ---
app.use("/webhook", webhookRouter);

app.use((erro, req, res, next) => {
  console.error(erro);
  res.status(500).json({ erro: erro.message });
});

app.listen(porta, () => {
  console.log(`Vida OS rodando em http://localhost:${porta}`);
});
