// Contrato de um módulo do Life OS:
//   id, nome, emoji  → identificação e como aparece no app
//   aba              → em qual das 5 abas ele mora
//   rotas            → router do Express, montado em /api/<id>
//   resumoDoDia      → o anel/card do dia
//   itensDoDia       → o que ele coloca no checklist da tela Hoje (opcional)
//   metricas         → números que uma meta pode acompanhar (opcional)
import rotas from "./routes.js";
import { panorama } from "./service.js";

export default {
  id: "agua",
  nome: "Água",
  emoji: "💧",
  aba: "hoje",
  rotas,

  async resumoDoDia(usuario) {
    const { total, meta, progresso, sequencia, atraso } = await panorama(usuario, 14);
    return {
      principal: `${(total / 1000).toFixed(1).replace(".", ",")} L`,
      apoio: atraso > 0 ? `faltam ${atraso} ml para o ritmo` : `de ${(meta / 1000).toFixed(1).replace(".", ",")} L`,
      progresso,
      sequencia,
    };
  },

  async metricas(usuario) {
    const { total, meta, sequencia } = await panorama(usuario, 14);
    return [
      { id: "agua.hoje_ml", nome: "Água hoje (ml)", valor: total },
      { id: "agua.meta_ml", nome: "Meta de água (ml)", valor: meta },
      { id: "agua.sequencia", nome: "Dias seguidos batendo a água", valor: sequencia },
    ];
  },
};
