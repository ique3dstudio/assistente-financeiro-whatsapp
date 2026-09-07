import { Router } from "express";
import * as financas from "./service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const [resumo, ultimos] = await Promise.all([
      financas.resumoDoMes(req.usuario),
      financas.lancamentos(req.usuario, { limite: 20 }),
    ]);
    res.json({ ...resumo, lancamentos: ultimos });
  } catch (erro) {
    next(erro);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { valor, tipo, categoria, descricao } = req.body || {};
    if (!Number.isFinite(Number(valor)) || !["receita", "despesa"].includes(tipo) || !categoria) {
      return res.status(400).json({ erro: "Informe valor, tipo (receita/despesa) e categoria" });
    }
    res.json(await financas.salvarTransacao(req.usuario, { valor: Number(valor), tipo, categoria, descricao }));
  } catch (erro) {
    next(erro);
  }
});

export default router;
