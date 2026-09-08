import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { entrar, exigirLogin, sair, autenticado } from "./core/auth.js";
import { ABAS, MODULOS, dashboard } from "./core/modulos.js";
import { montarHoje } from "./core/hoje.js";
import { lerPerfil, salvarPerfil } from "./core/perfil.js";
import { diagnosticar } from "./core/diagnostico.js";
import { hoje } from "./core/datas.js";
import webhookRouter from "./core/webhook.js";

const PASTA = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const porta = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(PASTA, "..", "public")));

// --- Núcleo ---
app.get("/saude", (req, res) => {
  res.json({ status: "ok", app: "life-os", data: hoje(), modulos: MODULOS.map((m) => m.id) });
});

app.post("/api/login", entrar);
app.post("/api/sair", sair);
app.get("/api/sessao", (req, res) => res.json({ autenticado: autenticado(req) }));

// Checagem de conexão com o Supabase — fica atrás do login porque mostra
// mensagens de erro do banco.
app.get("/api/diagnostico", exigirLogin, async (req, res, next) => {
  try {
    res.json(await diagnosticar());
  } catch (erro) {
    next(erro);
  }
});

app.get("/api/dashboard", exigirLogin, async (req, res, next) => {
  try {
    res.json({ data: hoje(), ...(await dashboard(req.usuario)) });
  } catch (erro) {
    next(erro);
  }
});

// Tela Hoje: checklist agregado de todos os módulos + anéis do dia.
app.get("/api/hoje", exigirLogin, async (req, res, next) => {
  try {
    res.json(await montarHoje(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

app.get("/api/abas", exigirLogin, (req, res) => {
  res.json({
    abas: ABAS,
    modulos: MODULOS.map((m) => ({ id: m.id, nome: m.nome, emoji: m.emoji, aba: m.aba || "eu" })),
  });
});

app.get("/api/perfil", exigirLogin, async (req, res, next) => {
  try {
    res.json(await lerPerfil(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

app.put("/api/perfil", exigirLogin, async (req, res, next) => {
  try {
    res.json(await salvarPerfil(req.usuario, req.body || {}));
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
  console.log(`Life OS rodando em http://localhost:${porta}`);
});
