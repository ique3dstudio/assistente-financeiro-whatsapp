import { Router } from "express";
import * as financas from "./service.js";

const router = Router();

// Um jeito curto de declarar rota: função + o que ela devolve.
function rota(metodo, caminho, executar) {
  router[metodo](caminho, async (req, res, next) => {
    try {
      res.json(await executar(req));
    } catch (erro) {
      next(erro);
    }
  });
}

rota("get", "/", (req) => financas.painel(req.usuario, req.query.mes || undefined));
rota("get", "/relatorios", (req) => financas.relatorios(req.usuario, Number(req.query.meses) || 6));
rota("get", "/lancamentos", async (req) => ({
  lancamentos: await financas.lancamentos(req.usuario, {
    mes: req.query.mes || null,
    tipo: req.query.tipo || null,
    categoria_id: req.query.categoria_id || null,
    conta_id: req.query.conta_id || null,
    cartao_id: req.query.cartao_id || null,
    busca: req.query.busca || null,
    limite: Number(req.query.limite) || 100,
    incluirFuturos: req.query.futuros === "1",
  }),
}));

rota("post", "/", (req) => financas.criarLancamento(req.usuario, req.body || {}));
rota("put", "/lancamentos/:id", (req) => financas.atualizarLancamento(req.usuario, req.params.id, req.body || {}));
rota("delete", "/lancamentos/:id", (req) => financas.excluirLancamento(req.usuario, req.params.id));

rota("get", "/contas", async (req) => ({ contas: await financas.contas(req.usuario) }));
rota("post", "/contas", (req) => financas.criarConta(req.usuario, req.body || {}));
rota("put", "/contas/:id", (req) => financas.atualizarConta(req.usuario, req.params.id, req.body || {}));

rota("get", "/categorias", async (req) => ({ categorias: await financas.categorias(req.usuario, req.query.tipo || null) }));
rota("post", "/categorias", (req) => financas.criarCategoria(req.usuario, req.body || {}));
rota("put", "/categorias/:id", (req) => financas.atualizarCategoria(req.usuario, req.params.id, req.body || {}));

rota("get", "/cartoes", async (req) => ({ cartoes: await financas.cartoes(req.usuario) }));
rota("post", "/cartoes", (req) => financas.criarCartao(req.usuario, req.body || {}));
rota("put", "/cartoes/:id", (req) => financas.atualizarCartao(req.usuario, req.params.id, req.body || {}));
rota("get", "/cartoes/:id/fatura", (req) => financas.faturaDoCartao(req.usuario, req.params.id, req.query.mes));
rota("post", "/cartoes/:id/pagar", (req) =>
  financas.pagarFatura(req.usuario, req.params.id, req.body?.mes, req.body?.conta_id, req.body?.valor)
);

rota("post", "/recorrentes", (req) => financas.criarRecorrente(req.usuario, req.body || {}));
rota("put", "/recorrentes/:id", (req) => financas.atualizarRecorrente(req.usuario, req.params.id, req.body || {}));
rota("delete", "/recorrentes/:id", (req) => financas.excluirRecorrente(req.usuario, req.params.id));

rota("post", "/orcamentos", (req) =>
  financas.definirOrcamento(req.usuario, req.body?.mes, req.body?.categoria_id, req.body?.valor_planejado)
);

rota("post", "/metas", (req) => financas.criarMetaFinanceira(req.usuario, req.body || {}));
rota("put", "/metas/:id", (req) => financas.atualizarMetaFinanceira(req.usuario, req.params.id, req.body || {}));
rota("delete", "/metas/:id", (req) => financas.excluirMetaFinanceira(req.usuario, req.params.id));

rota("post", "/dividas", (req) => financas.criarDivida(req.usuario, req.body || {}));
rota("put", "/dividas/:id", (req) => financas.atualizarDivida(req.usuario, req.params.id, req.body || {}));
rota("delete", "/dividas/:id", (req) => financas.excluirDivida(req.usuario, req.params.id));

export default router;
