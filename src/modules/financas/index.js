import rotas from "./routes.js";
import { resumoDoDia, resumoDoMes } from "./service.js";

export default {
  id: "financas",
  nome: "Finanças",
  emoji: "💰",
  aba: "dinheiro",
  rotas,
  async resumoDoDia(usuario) {
    const { despesas, receitas } = await resumoDoDia(usuario);
    return {
      principal: `R$ ${despesas.toFixed(2).replace(".", ",")}`,
      apoio: receitas > 0 ? `gastos hoje · +R$ ${receitas.toFixed(2).replace(".", ",")}` : "gastos hoje",
    };
  },

  async metricas(usuario) {
    const { despesas, receitas } = await resumoDoMes(usuario);
    return [
      { id: "financas.despesas_mes", nome: "Gastos do mês (R$)", valor: despesas },
      { id: "financas.receitas_mes", nome: "Receitas do mês (R$)", valor: receitas },
      { id: "financas.sobra_mes", nome: "Sobra do mês (R$)", valor: receitas - despesas },
    ];
  },
};
