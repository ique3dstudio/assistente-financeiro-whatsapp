import rotas from "./routes.js";
import { contasDoDia, painel, resumoDoDia, resumoDoMes } from "./service.js";

export default {
  id: "financas",
  nome: "Finanças",
  emoji: "💰",
  aba: "dinheiro",
  rotas,

  async resumoDoDia(usuario, data) {
    const { despesas, receitas } = await resumoDoDia(usuario, data);
    return {
      principal: `R$ ${despesas.toFixed(2).replace(".", ",")}`,
      apoio: receitas > 0 ? `gastos hoje · +R$ ${receitas.toFixed(2).replace(".", ",")}` : "gastos hoje",
    };
  },

  // Conta que vence hoje e fatura no dia entram no checklist da tela Hoje.
  async itensDoDia(usuario, data) {
    const contas = await contasDoDia(usuario, data);

    return contas.map((conta) => ({
      id: conta.id,
      tipo: "conta",
      modulo: "financas",
      nome: conta.nome,
      emoji: "",
      cor: "var(--c-dinheiro)",
      periodo: "qualquer",
      horario: null,
      concluido: false,
      frequencia_texto: `R$ ${conta.valor.toFixed(2).replace(".", ",")} · vence hoje`,
      streak: 0,
    }));
  },

  async metricas(usuario) {
    const dados = await painel(usuario);
    return [
      { id: "financas.despesas_mes", nome: "Gastos do mês (R$)", valor: dados.despesas },
      { id: "financas.receitas_mes", nome: "Receitas do mês (R$)", valor: dados.receitas },
      { id: "financas.sobra_mes", nome: "Sobra do mês (R$)", valor: dados.sobra },
      { id: "financas.saldo_total", nome: "Saldo somado das contas (R$)", valor: dados.saldo_total },
      ...dados.metas.map((meta) => ({
        id: `financas.meta.${meta.id}`,
        nome: `Meta: ${meta.titulo} (R$)`,
        valor: Number(meta.valor_atual),
      })),
    ];
  },
};
