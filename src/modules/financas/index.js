import rotas from "./routes.js";
import { resumoDoDia } from "./service.js";

export default {
  id: "financas",
  nome: "Finanças",
  emoji: "💰",
  rotas,
  async resumoDoDia(usuario) {
    const { despesas, receitas } = await resumoDoDia(usuario);
    return {
      principal: `R$ ${despesas.toFixed(2).replace(".", ",")}`,
      apoio: receitas > 0 ? `gastos hoje · +R$ ${receitas.toFixed(2).replace(".", ",")}` : "gastos hoje",
    };
  },
};
