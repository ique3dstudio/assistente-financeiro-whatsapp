import { Router } from "express";
import * as diario from "./service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await diario.historico(req.usuario, Number(req.query.dias) || 30));
  } catch (erro) {
    next(erro);
  }
});

router.get("/hoje", async (req, res, next) => {
  try {
    res.json(await diario.doDia(req.usuario, req.query.data));
  } catch (erro) {
    next(erro);
  }
});

router.post("/humor", async (req, res, next) => {
  try {
    res.json(await diario.salvarHumor(req.usuario, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.post("/anotacao", async (req, res, next) => {
  try {
    res.json(await diario.anotar(req.usuario, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.delete("/anotacao/:id", async (req, res, next) => {
  try {
    res.json(await diario.excluirAnotacao(req.usuario, req.params.id));
  } catch (erro) {
    next(erro);
  }
});

export default router;
