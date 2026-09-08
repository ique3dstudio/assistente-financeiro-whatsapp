import { Router } from "express";
import * as habitos from "./service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    res.json({ habitos: await habitos.listar(req.usuario) });
  } catch (erro) {
    next(erro);
  }
});

router.get("/checklist", async (req, res, next) => {
  try {
    res.json(await habitos.checklist(req.usuario, req.query.data));
  } catch (erro) {
    next(erro);
  }
});

router.post("/", async (req, res, next) => {
  try {
    res.json(await habitos.criar(req.usuario, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    res.json(await habitos.atualizar(req.usuario, req.params.id, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    res.json(await habitos.excluir(req.usuario, req.params.id));
  } catch (erro) {
    next(erro);
  }
});

router.post("/:id/marcar", async (req, res, next) => {
  try {
    await habitos.marcar(req.usuario, req.params.id, req.body || {}, req.body?.data);
    res.json(await habitos.checklist(req.usuario, req.body?.data));
  } catch (erro) {
    next(erro);
  }
});

router.post("/:id/folga", async (req, res, next) => {
  try {
    await habitos.folgar(req.usuario, req.params.id, req.body?.data);
    res.json(await habitos.checklist(req.usuario, req.body?.data));
  } catch (erro) {
    next(erro);
  }
});

router.get("/:id/historico", async (req, res, next) => {
  try {
    res.json(await habitos.historico(req.usuario, req.params.id, Number(req.query.dias) || 365));
  } catch (erro) {
    next(erro);
  }
});

export default router;
