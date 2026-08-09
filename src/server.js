import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import webhookRouter from "./routes/webhook.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", app: "assistente-financeiro-whatsapp" });
});

app.use("/webhook", webhookRouter);

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
app.use("/loja3d", express.static(path.join(__dirname, "..", "public", "loja3d")));

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
