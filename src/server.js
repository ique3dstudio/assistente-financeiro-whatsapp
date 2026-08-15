import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import webhookRouter from "./routes/webhook.js";
import loja3dIaRouter from "./routes/loja3d-ia.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Limite maior que o padrão (100kb): a entrada rápida por IA da Loja 3D manda foto/áudio em
// base64 dentro do JSON.
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ status: "ok", app: "assistente-financeiro-whatsapp" });
});

app.use("/webhook", webhookRouter);

// Loja 3D: entrada rápida por IA (texto/foto/áudio) — ver src/routes/loja3d-ia.js.
app.use("/loja3d/api", loja3dIaRouter);

// Loja 3D: app web (PWA) de gestão de pedidos, usado pela dupla comercial/produção.
app.get("/loja3d/config.js", (req, res) => {
  res.type("application/javascript");
  res.send(
    `window.SUPABASE_CONFIG = ${JSON.stringify({
      url: process.env.SUPABASE_URL || "",
      anonKey: process.env.SUPABASE_ANON_KEY || "",
    })};`
  );
});
// Ícone dinâmico: aponta pra logo enviada pela loja (⚙ Configurações), se houver, senão cai no
// ícone vetorial padrão. Vale pra abas novas e pra "adicionar à tela inicial" feito depois de
// trocar a foto — um ícone já instalado no celular não se atualiza sozinho (limitação do PWA).
let supabaseLogoClient;
app.get("/loja3d/logo-icon", async (req, res) => {
  try {
    if (!supabaseLogoClient) {
      supabaseLogoClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    }
    const { data } = await supabaseLogoClient.rpc("obter_configuracoes_publicas");
    const logoPath = data?.[0]?.logo_path;
    if (logoPath) {
      return res.redirect(302, `${process.env.SUPABASE_URL}/storage/v1/object/public/loja3d-branding/${logoPath}`);
    }
  } catch {
    // segue pro ícone padrão
  }
  // PNG, não SVG: ícone de tela inicial do iOS (apple-touch-icon) não reconhece SVG e cai
  // num "I" genérico (primeira letra do nome do app) se o formato não for suportado.
  res.redirect(302, "/loja3d/icon-512.png");
});

app.use("/loja3d", express.static(path.join(__dirname, "..", "public", "loja3d")));

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
