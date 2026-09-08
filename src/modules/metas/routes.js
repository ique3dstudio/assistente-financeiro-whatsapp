import { Router } from "express";
import * as metas from "./service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await metas.painel(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

router.post("/", async (req, res, next) => {
  try {
    res.json(await metas.criar(req.usuario, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    res.json(await metas.atualizar(req.usuario, req.params.id, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    res.json(await metas.excluir(req.usuario, req.params.id));
  } catch (erro) {
    next(erro);
  }
});

router.post("/:id/concluir", async (req, res, next) => {
  try {
    res.json(await metas.concluir(req.usuario, req.params.id, req.body?.concluida !== false));
  } catch (erro) {
    next(erro);
  }
});

router.post("/:id/marcos", async (req, res, next) => {
  try {
    res.json(await metas.criarMarco(req.usuario, req.params.id, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.post("/marcos/:marcoId", async (req, res, next) => {
  try {
    res.json(await metas.marcarMarco(req.usuario, req.params.marcoId, req.body?.concluido !== false, req.body?.reflexao));
  } catch (erro) {
    next(erro);
  }
});

router.delete("/marcos/:marcoId", async (req, res, next) => {
  try {
    res.json(await metas.excluirMarco(req.usuario, req.params.marcoId));
  } catch (erro) {
    next(erro);
  }
});

router.post("/:id/vinculos", async (req, res, next) => {
  try {
    res.json(await metas.vincular(req.usuario, req.params.id, req.body?.tipo, req.body?.referencia_id));
  } catch (erro) {
    next(erro);
  }
});

router.delete("/:id/vinculos/:tipo/:referenciaId", async (req, res, next) => {
  try {
    res.json(await metas.desvincular(req.usuario, req.params.id, req.params.tipo, req.params.referenciaId));
  } catch (erro) {
    next(erro);
  }
});

export default router;
