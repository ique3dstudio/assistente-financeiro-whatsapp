import rotas from "./routes.js";
import { estatisticas, rotinaDoDia, sessaoDeHoje } from "./service.js";

export default {
  id: "treino",
  nome: "Treino",
  emoji: "🏋️",
  aba: "corpo",
  rotas,

  async resumoDoDia(usuario, data) {
    const [sessao, prevista] = await Promise.all([sessaoDeHoje(usuario, data), rotinaDoDia(usuario, data)]);

    if (sessao?.concluida_em) {
      return { principal: "✓", apoio: `${prevista?.nome || "treino"} concluído`, progresso: 1 };
    }
    if (sessao) {
      return { principal: "▶", apoio: "treino em andamento", progresso: 0.5 };
    }
    return {
      principal: prevista ? prevista.nome.replace(/^Treino\s*/i, "") : "—",
      apoio: prevista ? "previsto hoje" : "descanso hoje",
      progresso: 0,
    };
  },

  // O treino do dia entra no checklist da tela Hoje.
  async itensDoDia(usuario, data) {
    const [sessao, prevista] = await Promise.all([sessaoDeHoje(usuario, data), rotinaDoDia(usuario, data)]);
    if (!prevista && !sessao) return [];

    return [
      {
        id: sessao?.id || prevista.id,
        tipo: "treino",
        modulo: "treino",
        nome: prevista?.nome || "Treino",
        emoji: "🏋️",
        cor: "#4ade80",
        periodo: "qualquer",
        horario: null,
        concluido: Boolean(sessao?.concluida_em),
        frequencia_texto: sessao && !sessao.concluida_em ? "em andamento" : "treino do dia",
        streak: 0,
      },
    ];
  },

  async metricas(usuario) {
    const stats = await estatisticas(usuario, 90);
    return [
      { id: "treino.sessoes_90d", nome: "Treinos em 90 dias", valor: stats.sessoes },
      { id: "treino.volume_90d", nome: "Volume total 90 dias (kg)", valor: Math.round(stats.volume_total) },
      ...stats.mais_treinados.map((exercicio) => ({
        id: `treino.1rm.${exercicio.exercicio_id}`,
        nome: `1RM estimado: ${exercicio.nome}`,
        valor: exercicio.curva.length ? exercicio.curva[exercicio.curva.length - 1].um_rm : 0,
      })),
    ];
  },
};
