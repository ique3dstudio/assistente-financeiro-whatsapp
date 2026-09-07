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
    await agua.registrar(req.usuario, req.body?.quantidade_ml);
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
    await agua.definirMeta(req.usuario, req.body?.meta_ml);
    res.json(await agua.panorama(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

export default router;
