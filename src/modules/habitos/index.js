import rotas from "./routes.js";
import { checklist } from "./service.js";

export default {
  id: "habitos",
  nome: "Rotina",
  emoji: "🔁",
  aba: "hoje",
  rotas,

  async resumoDoDia(usuario, data) {
    const { feitos, total, progresso, sequencia_geral } = await checklist(usuario, data);
    return {
      principal: `${feitos}/${total}`,
      apoio: total ? "hábitos de hoje" : "nenhum hábito cadastrado",
      progresso,
      sequencia: sequencia_geral,
    };
  },

  // Números que uma meta pode acompanhar sem você atualizar à mão.
  async metricas(usuario) {
    const { itens, sequencia_geral } = await checklist(usuario);
    return [
      { id: "habitos.sequencia_geral", nome: "Sequência geral (dias)", valor: sequencia_geral },
      ...itens.map((item) => ({
        id: `habitos.streak.${item.id}`,
        nome: `Sequência: ${item.nome}`,
        valor: item.streak,
      })),
    ];
  },

  // O que este módulo coloca no checklist da tela Hoje.
  async itensDoDia(usuario, data) {
    const { itens } = await checklist(usuario, data);
    return itens.map((item) => ({ ...item, tipo: "habito", modulo: "habitos" }));
  },
};
