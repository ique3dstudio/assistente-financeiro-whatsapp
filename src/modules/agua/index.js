// Contrato de um módulo do Life OS:
//   id, nome, emoji  → identificação e como aparece no app
//   rotas            → router do Express, montado em /api/<id>
//   resumoDoDia      → o que o módulo mostra no card do dashboard
import rotas from "./routes.js";
import { panorama } from "./service.js";

export default {
  id: "agua",
  nome: "Água",
  emoji: "💧",
  rotas,
  async resumoDoDia(usuario) {
    const { total, meta, progresso, sequencia } = await panorama(usuario, 14);
    return {
      principal: `${(total / 1000).toFixed(1).replace(".", ",")} L`,
      apoio: `de ${(meta / 1000).toFixed(1).replace(".", ",")} L`,
      progresso,
      sequencia,
    };
  },
};
