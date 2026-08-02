import "dotenv/config";
import express from "express";
import webhookRouter from "./routes/webhook.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", app: "assistente-financeiro-whatsapp" });
});

app.use("/webhook", webhookRouter);

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
