import "dotenv/config";
import { salvarTransacao, resumoDoMes } from "../src/modules/financas/service.js";
import { USUARIO } from "../src/core/auth.js";

const registro = await salvarTransacao(USUARIO, {
  valor: 50,
  tipo: "despesa",
  categoria: "alimentacao",
  descricao: "teste manual",
});

console.log("Lançamento gravado:", registro);
console.log("Resumo do mês:", await resumoDoMes(USUARIO));
