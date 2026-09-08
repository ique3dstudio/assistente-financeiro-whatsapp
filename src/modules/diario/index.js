import rotas from "./routes.js";
import { HUMORES, doDia, historico } from "./service.js";

export default {
  id: "diario",
  nome: "Humor",
  emoji: "🧠",
  aba: "eu",
  rotas,

  async resumoDoDia(usuario, data) {
    const { humor, anotacoes } = await doDia(usuario, data);
    const info = humor ? HUMORES.find((h) => h.nota === humor.nota) : null;

    return {
      principal: info ? info.emoji : "—",
      apoio: info ? info.nome : "sem check-in hoje",
      progresso: humor ? humor.nota / 5 : 0,
      extra: { anotacoes: anotacoes.length },
    };
  },

  async metricas(usuario) {
    const { media_humor, dias_registrados } = await historico(usuario, 30);
    return [
      { id: "diario.media_humor_30d", nome: "Humor médio (30 dias)", valor: media_humor ? Number(media_humor.toFixed(2)) : 0 },
      { id: "diario.dias_registrados_30d", nome: "Dias com check-in (30 dias)", valor: dias_registrados },
    ];
  },
};
