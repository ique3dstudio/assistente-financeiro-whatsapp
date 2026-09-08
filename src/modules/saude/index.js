import rotas from "./routes.js";
import { medicamentosDoDia, painel } from "./service.js";

export default {
  id: "saude",
  nome: "Saúde",
  emoji: "🩺",
  aba: "corpo",
  rotas,

  async resumoDoDia(usuario, data) {
    const doses = await medicamentosDoDia(usuario, data);
    const tomadas = doses.filter((dose) => dose.tomado).length;

    return {
      principal: doses.length ? `${tomadas}/${doses.length}` : "—",
      apoio: doses.length ? "doses de hoje" : "nenhum medicamento",
      progresso: doses.length ? tomadas / doses.length : null,
    };
  },

  // Cada dose do dia entra no checklist da tela Hoje, no horário certo.
  async itensDoDia(usuario, data) {
    const doses = await medicamentosDoDia(usuario, data);

    return doses.map((dose) => ({
      id: `${dose.medicamento_id}|${dose.horario}`,
      tipo: "dose",
      modulo: "saude",
      nome: `${dose.nome}${dose.dose ? ` (${dose.dose})` : ""}`,
      emoji: "💊",
      cor: "var(--c-agenda)",
      periodo: Number(dose.horario.slice(0, 2)) < 12 ? "manha" : Number(dose.horario.slice(0, 2)) < 18 ? "tarde" : "noite",
      horario: dose.horario,
      concluido: dose.tomado,
      frequencia_texto: dose.recomprar ? `estoque para ${dose.dias} dias` : "",
      streak: 0,
    }));
  },

  async metricas(usuario) {
    const dados = await painel(usuario);
    const peso = dados.ultimos_sinais.find((s) => s.id === "peso")?.ultimo;

    return [
      { id: "saude.media_sono_7d", nome: "Sono médio 7 dias (min)", valor: dados.media_sono_7d || 0 },
      { id: "saude.peso", nome: "Peso mais recente (kg)", valor: peso ? Number(peso.valor) : 0 },
      ...dados.marcadores.map((serie) => ({
        id: `saude.marcador.${serie.marcador}`,
        nome: `Exame: ${serie.marcador}`,
        valor: serie.ultimo?.valor || 0,
      })),
    ];
  },
};
