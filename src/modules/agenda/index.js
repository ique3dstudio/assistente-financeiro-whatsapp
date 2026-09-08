import rotas from "./routes.js";
import { eventosDoDia, proximos, tarefasDoDia } from "./service.js";

export default {
  id: "agenda",
  nome: "Agenda",
  emoji: "📅",
  aba: "hoje",
  rotas,

  async resumoDoDia(usuario, data) {
    const [eventos, tarefas] = await Promise.all([eventosDoDia(usuario, data), tarefasDoDia(usuario, data)]);
    const feitas = tarefas.filter((t) => t.concluida_em).length;

    return {
      principal: `${eventos.length}`,
      apoio: tarefas.length ? `compromissos · ${feitas}/${tarefas.length} tarefas` : "compromissos hoje",
      progresso: tarefas.length ? feitas / tarefas.length : null,
    };
  },

  // Tarefas entram no checklist junto com os hábitos.
  async itensDoDia(usuario, data) {
    const tarefas = await tarefasDoDia(usuario, data);

    return tarefas.map((tarefa) => ({
      id: tarefa.id,
      tipo: "tarefa",
      modulo: "agenda",
      nome: tarefa.titulo,
      emoji: "",
      cor: tarefa.prioridade === 1 ? "#f87171" : "#3ba9f4",
      periodo: tarefa.periodo,
      horario: tarefa.hora,
      concluido: Boolean(tarefa.concluida_em),
      frequencia_texto: tarefa.atrasada ? `atrasada desde ${tarefa.prazo}` : "tarefa",
      streak: 0,
    }));
  },

  // Compromissos aparecem em bloco próprio na tela Hoje, com contagem regressiva.
  async compromissosDoDia(usuario) {
    return proximos(usuario, 3);
  },
};
