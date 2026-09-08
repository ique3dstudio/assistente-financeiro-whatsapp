import { Router } from "express";
import * as agenda from "./service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await agenda.painel(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

router.post("/eventos", async (req, res, next) => {
  try {
    res.json(await agenda.criarEvento(req.usuario, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.put("/eventos/:id", async (req, res, next) => {
  try {
    res.json(await agenda.atualizarEvento(req.usuario, req.params.id, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.delete("/eventos/:id", async (req, res, next) => {
  try {
    res.json(await agenda.excluirEvento(req.usuario, req.params.id));
  } catch (erro) {
    next(erro);
  }
});

router.post("/tarefas", async (req, res, next) => {
  try {
    res.json(await agenda.criarTarefa(req.usuario, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.put("/tarefas/:id", async (req, res, next) => {
  try {
    res.json(await agenda.atualizarTarefa(req.usuario, req.params.id, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.post("/tarefas/:id/concluir", async (req, res, next) => {
  try {
    res.json(await agenda.concluirTarefa(req.usuario, req.params.id, req.body?.concluida !== false));
  } catch (erro) {
    next(erro);
  }
});

router.delete("/tarefas/:id", async (req, res, next) => {
  try {
    res.json(await agenda.excluirTarefa(req.usuario, req.params.id));
  } catch (erro) {
    next(erro);
  }
});

export default router;
