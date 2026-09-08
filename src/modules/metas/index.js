import rotas from "./routes.js";
import { painel } from "./service.js";

export default {
  id: "metas",
  nome: "Metas",
  emoji: "🎯",
  aba: "metas",
  rotas,

  async resumoDoDia(usuario) {
    const { total, concluidas, orfas, horizontes } = await painel(usuario);
    const emAndamento = total - concluidas;
    const comProgresso = horizontes.flatMap((h) => h.metas).filter((m) => m.progresso !== null && !m.concluida_em);
    const media = comProgresso.length
      ? comProgresso.reduce((soma, m) => soma + m.progresso, 0) / comProgresso.length
      : 0;

    return {
      principal: total ? `${emAndamento}` : "—",
      apoio: total ? (orfas ? `${orfas} sem hábito ligado` : "metas em andamento") : "nenhuma meta ainda",
      progresso: media,
    };
  },
};
