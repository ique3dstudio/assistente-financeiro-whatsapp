import { Router } from "express";
import * as saude from "./service.js";

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

rota("get", "/", (req) => saude.painel(req.usuario));
rota("get", "/consulta-resumo", (req) => saude.resumoParaConsulta(req.usuario));

rota("post", "/medicamentos", (req) => saude.criarMedicamento(req.usuario, req.body || {}));
rota("put", "/medicamentos/:id", (req) => saude.atualizarMedicamento(req.usuario, req.params.id, req.body || {}));
rota("delete", "/medicamentos/:id", (req) => saude.excluirMedicamento(req.usuario, req.params.id));
rota("post", "/medicamentos/:id/dose", (req) =>
  saude.marcarDose(req.usuario, req.params.id, req.body?.horario, req.body?.data, req.body?.tomado !== false)
);

rota("post", "/consultas", (req) => saude.criarConsulta(req.usuario, req.body || {}));
rota("put", "/consultas/:id", (req) => saude.atualizarConsulta(req.usuario, req.params.id, req.body || {}));
rota("delete", "/consultas/:id", (req) => saude.excluirConsulta(req.usuario, req.params.id));

rota("post", "/recorrencias", (req) => saude.criarRecorrencia(req.usuario, req.body || {}));
rota("put", "/recorrencias/:id", (req) => saude.atualizarRecorrencia(req.usuario, req.params.id, req.body || {}));

rota("post", "/exames", (req) => saude.criarExame(req.usuario, req.body || {}));
rota("get", "/marcadores", async (req) => ({ marcadores: await saude.evolucaoMarcadores(req.usuario) }));

rota("post", "/sinais", (req) => saude.criarSinal(req.usuario, req.body || {}));
rota("post", "/sono", (req) => saude.registrarSono(req.usuario, req.body || {}));
rota("post", "/sintomas", (req) => saude.criarSintoma(req.usuario, req.body || {}));
rota("post", "/vacinas", (req) => saude.criarVacina(req.usuario, req.body || {}));
rota("post", "/contatos", (req) => saude.criarContato(req.usuario, req.body || {}));

export default router;
