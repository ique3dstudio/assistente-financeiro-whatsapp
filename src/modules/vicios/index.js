import rotas from "./routes.js";
import { painel, pledgesPendentes } from "./service.js";

export default {
  id: "vicios",
  nome: "Controle",
  emoji: "🎯",
  aba: "eu",
  rotas,

  async resumoDoDia(usuario) {
    const { vicios } = await painel(usuario);
    if (vicios.length === 0) return { principal: "—", apoio: "nenhum hábito em controle", progresso: null };

    // Mostra o de maior sequência: é o número que dá orgulho de abrir o app.
    const maior = vicios.reduce((melhor, vicio) => (vicio.contador.dias > melhor.contador.dias ? vicio : melhor));
    const proximo = maior.proximo_marco;

    return {
      principal: `${maior.contador.dias}d`,
      apoio: proximo ? `faltam ${proximo.faltam} para ${proximo.dias} dias` : maior.nome,
      progresso: proximo ? 1 - proximo.faltam / proximo.dias : 1,
    };
  },

  async itensDoDia(usuario, data) {
    const pendentes = await pledgesPendentes(usuario, data);

    return pendentes.map((pendente) => ({
      id: pendente.id,
      tipo: "pledge",
      modulo: "vicios",
      nome: pendente.nome,
      emoji: "🎯",
      cor: "var(--c-humor)",
      periodo: "manha",
      horario: null,
      concluido: false,
      frequencia_texto: `${pendente.dias} dias até aqui`,
      streak: pendente.dias,
    }));
  },

  async metricas(usuario) {
    const { vicios } = await painel(usuario);
    return vicios.flatMap((vicio) => [
      { id: `vicios.dias.${vicio.id}`, nome: `Dias sem ${vicio.nome}`, valor: vicio.contador.dias },
      { id: `vicios.economia.${vicio.id}`, nome: `Economizado com ${vicio.nome} (R$)`, valor: vicio.economia.dinheiro },
    ]);
  },
};
