import { Router } from "express";
import * as agua from "./service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await agua.panorama(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

router.post("/", async (req, res, next) => {
  try {
    await agua.registrar(req.usuario, req.body?.quantidade_ml, req.body?.bebida || "agua");
    res.json(await agua.panorama(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

router.post("/desfazer", async (req, res, next) => {
  try {
    await agua.desfazerUltimo(req.usuario);
    res.json(await agua.panorama(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

router.put("/meta", async (req, res, next) => {
  try {
    if (req.body?.automatica) await agua.metaAutomatica(req.usuario);
    else await agua.definirMeta(req.usuario, req.body?.meta_ml);
    res.json(await agua.panorama(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

router.post("/recipientes", async (req, res, next) => {
  try {
    await agua.criarRecipiente(req.usuario, req.body || {});
    res.json(await agua.panorama(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

router.delete("/recipientes/:id", async (req, res, next) => {
  try {
    await agua.excluirRecipiente(req.usuario, req.params.id);
    res.json(await agua.panorama(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

export default router;
