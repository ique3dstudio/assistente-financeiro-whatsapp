import { Router } from "express";
import * as dieta from "./service.js";

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

rota("get", "/", (req) => dieta.painel(req.usuario));

rota("get", "/alimentos", async (req) => ({
  alimentos: await dieta.buscarAlimentos(req.usuario, { busca: req.query.busca || null, favoritos: req.query.favoritos === "1" }),
}));
rota("post", "/alimentos", (req) => dieta.criarAlimento(req.usuario, req.body || {}));
rota("get", "/alimentos/codigo/:codigo", (req) => dieta.buscarPorCodigoBarras(req.usuario, req.params.codigo));
rota("post", "/alimentos/:id/favorito", (req) => dieta.alternarFavorito(req.usuario, req.params.id));

rota("get", "/salvas", async (req) => ({ salvas: await dieta.refeicoesSalvas(req.usuario) }));
rota("post", "/salvas", (req) => dieta.salvarComoModelo(req.usuario, req.body || {}));
rota("delete", "/salvas/:id", (req) => dieta.excluirModelo(req.usuario, req.params.id));
rota("post", "/salvas/:id/registrar", (req) => dieta.registrarModelo(req.usuario, req.params.id, req.body || {}));

rota("post", "/refeicoes/alimento", (req) => dieta.registrarAlimento(req.usuario, req.body || {}));
rota("post", "/refeicoes/texto", (req) => dieta.registrarTexto(req.usuario, req.body || {}));
rota("put", "/refeicoes/:id/sensacoes", (req) => dieta.registrarSensacoes(req.usuario, req.params.id, req.body || {}));
rota("delete", "/refeicoes/:id", (req) => dieta.excluirRegistro(req.usuario, req.params.id));

rota("post", "/checkin", (req) => dieta.registrarCheckin(req.usuario, req.body?.avaliacao, req.body || {}));

rota("get", "/alvo", (req) => dieta.alvoAtual(req.usuario));
rota("post", "/alvo", (req) => dieta.definirAlvo(req.usuario, req.body || {}));
rota("get", "/ajuste", (req) =>
  dieta.calcularSugestaoAjuste(req.usuario, { objetivo: req.query.objetivo || "manter", taxaSemanalKg: Number(req.query.taxa) || 0.4 })
);
rota("post", "/ajuste/aplicar", (req) => dieta.aplicarAjuste(req.usuario, req.body || {}));

rota("get", "/plano", (req) => dieta.planoDaSemana(req.usuario, req.query.inicio || undefined));
rota("post", "/plano", (req) => dieta.adicionarAoPlano(req.usuario, req.body || {}));
rota("delete", "/plano/:id", (req) => dieta.removerDoPlano(req.usuario, req.params.id));
rota("post", "/plano/gerar-lista", (req) => dieta.gerarListaDeCompras(req.usuario, req.body?.inicio));

rota("get", "/lista", async (req) => ({ lista: await dieta.listaDeCompras(req.usuario) }));
rota("post", "/lista", (req) => dieta.adicionarItemLista(req.usuario, req.body?.item, req.body?.secao));
rota("put", "/lista/:id", (req) => dieta.marcarComprado(req.usuario, req.params.id, req.body?.comprado !== false));
rota("post", "/lista/limpar", (req) => dieta.limparComprados(req.usuario));

rota("get", "/sensacoes", (req) => dieta.sensacoesXHumor(req.usuario, Number(req.query.dias) || 30));

export default router;
