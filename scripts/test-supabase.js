import "dotenv/config";
import { salvarTransacao } from "../src/services/supabase.js";

const registro = await salvarTransacao("5511999999999", {
  valor: 50,
  tipo: "despesa",
  categoria: "alimentacao",
  descricao: "teste manual",
});

console.log(registro);
