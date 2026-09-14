import rotas from "./routes.js";
import { metricas, resumoDoDia } from "./service.js";

export default {
  id: "dieta",
  nome: "Dieta",
  emoji: "🍽️",
  aba: "corpo",
  rotas,

  async resumoDoDia(usuario, data) {
    const { consumido, alvo, checkin } = await resumoDoDia(usuario, data);

    if (!alvo) {
      return {
        principal: checkin ? { bem: "🙂", mais_ou_menos: "😐", mal: "🙁" }[checkin.avaliacao] : "—",
        apoio: "toque para registrar",
        progresso: null,
      };
    }

    return {
      principal: `${Math.round(consumido.kcal)}`,
      apoio: `de ${Math.round(alvo.kcal)} kcal`,
      progresso: alvo.kcal > 0 ? consumido.kcal / alvo.kcal : 0,
    };
  },

  metricas: (usuario) => metricas(usuario),
};
