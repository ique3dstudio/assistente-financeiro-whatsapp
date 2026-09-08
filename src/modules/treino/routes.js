import { Router } from "express";
import * as treino from "./service.js";

const router = Router();

// Painel do módulo: rotinas, treino de hoje, estatísticas e medidas.
router.get("/", async (req, res, next) => {
  try {
    res.json(await treino.painel(req.usuario));
  } catch (erro) {
    next(erro);
  }
});

// --- biblioteca ---
router.get("/exercicios", async (req, res, next) => {
  try {
    res.json({
      exercicios: await treino.exercicios(req.usuario, {
        musculo: req.query.musculo || null,
        equipamento: req.query.equipamento || null,
        busca: req.query.busca || null,
        nivel: req.query.nivel || null,
      }),
    });
  } catch (erro) {
    next(erro);
  }
});

router.post("/exercicios", async (req, res, next) => {
  try {
    res.json(await treino.criarExercicio(req.usuario, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.get("/mapa", async (req, res, next) => {
  try {
    res.json({ mapa: await treino.mapaCorporal(req.usuario) });
  } catch (erro) {
    next(erro);
  }
});

// --- rotinas ---
router.post("/rotinas", async (req, res, next) => {
  try {
    res.json(await treino.criarRotina(req.usuario, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.put("/rotinas/:id", async (req, res, next) => {
  try {
    res.json(await treino.atualizarRotina(req.usuario, req.params.id, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.delete("/rotinas/:id", async (req, res, next) => {
  try {
    res.json(await treino.excluirRotina(req.usuario, req.params.id));
  } catch (erro) {
    next(erro);
  }
});

router.post("/rotinas/:id/exercicios", async (req, res, next) => {
  try {
    res.json(await treino.adicionarExercicio(req.usuario, req.params.id, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.put("/itens/:itemId", async (req, res, next) => {
  try {
    res.json(await treino.atualizarItem(req.usuario, req.params.itemId, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

router.delete("/itens/:itemId", async (req, res, next) => {
  try {
    res.json(await treino.removerItem(req.usuario, req.params.itemId));
  } catch (erro) {
    next(erro);
  }
});

// --- execução ---
router.post("/sessoes", async (req, res, next) => {
  try {
    res.json(await treino.iniciarSessao(req.usuario, req.body?.rotina_id || null));
  } catch (erro) {
    next(erro);
  }
});

router.get("/sessoes/:id", async (req, res, next) => {
  try {
    res.json(await treino.planoDaSessao(req.usuario, req.params.id));
  } catch (erro) {
    next(erro);
  }
});

router.post("/sessoes/:id/series", async (req, res, next) => {
  try {
    const serie = await treino.registrarSerie(req.usuario, req.params.id, req.body || {});
    const plano = await treino.planoDaSessao(req.usuario, req.params.id);
    res.json({ ...plano, ultima_serie: serie });
  } catch (erro) {
    next(erro);
  }
});

router.delete("/series/:serieId", async (req, res, next) => {
  try {
    res.json(await treino.apagarSerie(req.usuario, req.params.serieId));
  } catch (erro) {
    next(erro);
  }
});

router.post("/sessoes/:id/concluir", async (req, res, next) => {
  try {
    res.json(await treino.concluirSessao(req.usuario, req.params.id, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

// --- estatísticas e medidas ---
router.get("/estatisticas", async (req, res, next) => {
  try {
    res.json(await treino.estatisticas(req.usuario, Number(req.query.dias) || 90));
  } catch (erro) {
    next(erro);
  }
});

router.get("/medidas", async (req, res, next) => {
  try {
    res.json({ medidas: await treino.medidas(req.usuario, Number(req.query.limite) || 30) });
  } catch (erro) {
    next(erro);
  }
});

router.post("/medidas", async (req, res, next) => {
  try {
    res.json(await treino.salvarMedida(req.usuario, req.body || {}));
  } catch (erro) {
    next(erro);
  }
});

export default router;
