import { Router } from "express";
import * as vicios from "./service.js";

const router = Router();

function rota(metodo, caminho, executar) {
  router[metodo](caminho, async (req, res, next) => {
    try {
      res.json(await executar(req));
    } catch (erro) {
      next(erro);
    }
  });
}

rota("get", "/", (req) => vicios.painel(req.usuario));
rota("post", "/", (req) => vicios.criarVicio(req.usuario, req.body || {}));
rota("put", "/:id", (req) => vicios.atualizarVicio(req.usuario, req.params.id, req.body || {}));
rota("delete", "/:id", (req) => vicios.excluirVicio(req.usuario, req.params.id));

rota("post", "/:id/motivo", (req) => vicios.adicionarMotivo(req.usuario, req.params.id, req.body?.texto));
rota("post", "/:id/pledge", (req) => vicios.registrarPledge(req.usuario, req.params.id, req.body || {}));
rota("post", "/:id/recaida", (req) => vicios.registrarRecaida(req.usuario, req.params.id, req.body?.aprendizado));
rota("post", "/fissuras", (req) => vicios.registrarFissura(req.usuario, req.body || {}));

rota("post", "/apoio", (req) => vicios.criarApoio(req.usuario, req.body || {}));
rota("delete", "/apoio/:id", (req) => vicios.excluirApoio(req.usuario, req.params.id));
rota("post", "/acoes", (req) => vicios.criarAcao(req.usuario, req.body?.texto));

export default router;
