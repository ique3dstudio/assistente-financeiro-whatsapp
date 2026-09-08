// Teste manual com o banco de verdade (precisa do .env preenchido e do SQL rodado):
//   node scripts/test-financas-banco.js
import "dotenv/config";
import { USUARIO } from "../src/core/auth.js";
import { cartoes, contas, criarLancamento, painel } from "../src/modules/financas/service.js";

console.log("Contas:", await contas(USUARIO));
console.log("Cartões:", await cartoes(USUARIO));

const criado = await criarLancamento(USUARIO, {
  valor: 45.9,
  tipo: "despesa",
  categoria: "Mercado",
  descricao: "teste manual",
  forma_pagamento: "pix",
});
console.log("Lançado:", criado.lancamentos[0]);

const dados = await painel(USUARIO);
console.log(`Mês ${dados.mes}: entra ${dados.receitas} · sai ${dados.despesas} · sobra ${dados.sobra}`);
console.log("Projeção:", dados.projecao);
