// Contas de dinheiro, sem banco:  node scripts/test-financas.js
import assert from "node:assert/strict";
import {
  comprometimento, consumoOrcamento, dataNoMes, diasNoMes, faturaDaCompra, foraDoPadrao,
  ocorrenciasRecorrente, parcelar, planoQuitacao, projecaoDoMes, regra502030, somarMeses,
} from "../src/modules/financas/calculos.js";

let passou = 0;
const teste = (nome, f) => (f(), passou++, console.log(`  ok  ${nome}`));

const soma = (parcelas) => Number(parcelas.reduce((t, p) => t + p.valor, 0).toFixed(2));

teste("aritmética de mês", () => {
  assert.equal(somarMeses("2026-09", 1), "2026-10");
  assert.equal(somarMeses("2026-12", 1), "2027-01");
  assert.equal(somarMeses("2026-01", -1), "2025-12");
  assert.equal(somarMeses("2026-09", 12), "2027-09");
});

teste("dia que não existe cai no último do mês", () => {
  assert.equal(diasNoMes("2026-02"), 28);
  assert.equal(diasNoMes("2028-02"), 29, "ano bissexto");
  assert.equal(dataNoMes("2026-02", 31), "2026-02-28");
  assert.equal(dataNoMes("2026-09", 10), "2026-09-10");
});

// Cartão que fecha dia 20 e vence dia 1 (vencimento ANTES do fechamento:
// a fatura que fecha em setembro vence em outubro).
const cartaoFecha20Vence1 = { fechamento: 20, vencimento: 1 };

teste("compra antes do fechamento entra na fatura que fecha no mês", () => {
  const f = faturaDaCompra("2026-09-15", cartaoFecha20Vence1);
  assert.equal(f.fechamento_em, "2026-09-20");
  assert.equal(f.vencimento_em, "2026-10-01");
  assert.equal(f.fatura_mes, "2026-10");
});

teste("compra depois do fechamento pula para a fatura seguinte", () => {
  const f = faturaDaCompra("2026-09-21", cartaoFecha20Vence1);
  assert.equal(f.fechamento_em, "2026-10-20");
  assert.equal(f.vencimento_em, "2026-11-01");
  assert.equal(f.fatura_mes, "2026-11");
});

teste("compra no dia exato do fechamento ainda entra nela", () => {
  assert.equal(faturaDaCompra("2026-09-20", cartaoFecha20Vence1).fatura_mes, "2026-10");
});

// Cartão que fecha dia 3 e vence dia 10 (vencimento DEPOIS do fechamento:
// fecha e vence no mesmo mês).
const cartaoFecha3Vence10 = { fechamento: 3, vencimento: 10 };

teste("fechamento e vencimento no mesmo mês", () => {
  assert.equal(faturaDaCompra("2026-09-02", cartaoFecha3Vence10).fatura_mes, "2026-09");
  assert.equal(faturaDaCompra("2026-09-04", cartaoFecha3Vence10).fatura_mes, "2026-10");
});

teste("virada de ano na fatura", () => {
  const f = faturaDaCompra("2026-12-28", cartaoFecha20Vence1);
  assert.equal(f.fatura_mes, "2027-02");
  assert.equal(f.vencimento_em, "2027-02-01");
});

teste("parcelamento não perde centavo", () => {
  const p = parcelar(100, 3, "2026-09-15", cartaoFecha20Vence1);
  assert.equal(p.length, 3);
  assert.equal(soma(p), 100, "a soma das parcelas tem que dar o total exato");
  assert.equal(p[0].valor, 33.34, "a diferença do arredondamento vai na primeira");
  assert.equal(p[1].valor, 33.33);
});

teste("parcelamento espalha nas faturas certas", () => {
  const p = parcelar(1200, 10, "2026-09-25", cartaoFecha20Vence1);
  assert.equal(p[0].fatura_mes, "2026-11", "comprou depois do fechamento");
  assert.equal(p[9].fatura_mes, "2027-08");
  assert.equal(p[0].data, "2026-11-01");
  assert.equal(soma(p), 1200);
});

teste("parcelamento de valor difícil (R$ 0,10 em 3x)", () => {
  const p = parcelar(0.1, 3, "2026-09-01", cartaoFecha20Vence1);
  assert.equal(soma(p), 0.1);
  assert.equal(p[0].valor, 0.04);
  assert.equal(p[2].valor, 0.03);
});

teste("parcelamento recusa entrada inválida", () => {
  assert.throws(() => parcelar(0, 3, "2026-09-01", cartaoFecha20Vence1));
  assert.throws(() => parcelar(100, 61, "2026-09-01", cartaoFecha20Vence1));
});

teste("comprometimento das próximas faturas", () => {
  const p = [...parcelar(300, 3, "2026-09-10", cartaoFecha20Vence1), ...parcelar(600, 2, "2026-09-10", cartaoFecha20Vence1)];
  const c = comprometimento(p);
  assert.equal(c[0].mes, "2026-10");
  assert.equal(c[0].total, 400, "100 da primeira compra + 300 da segunda");
  assert.equal(c[2].total, 100);
});

teste("recorrente mensal cai todo mês, respeitando início e fim", () => {
  const r = { frequencia: "mensal", dia_do_mes: 5, inicio: "2026-09-01", fim: null };
  assert.deepEqual(ocorrenciasRecorrente(r, "2026-09-01", "2026-11-30"), ["2026-09-05", "2026-10-05", "2026-11-05"]);

  const comFim = { ...r, fim: "2026-10-10" };
  assert.deepEqual(ocorrenciasRecorrente(comFim, "2026-09-01", "2026-12-31"), ["2026-09-05", "2026-10-05"]);
});

teste("recorrente do dia 31 respeita fevereiro", () => {
  const r = { frequencia: "mensal", dia_do_mes: 31, inicio: "2026-01-01" };
  assert.deepEqual(ocorrenciasRecorrente(r, "2026-02-01", "2026-02-28"), ["2026-02-28"]);
});

teste("recorrente anual só no mês do início", () => {
  const r = { frequencia: "anual", dia_do_mes: 10, inicio: "2026-03-10" };
  assert.deepEqual(ocorrenciasRecorrente(r, "2026-01-01", "2027-12-31"), ["2026-03-10", "2027-03-10"]);
});

teste("recorrente semanal", () => {
  const r = { frequencia: "semanal", dia_do_mes: 1, inicio: "2026-09-01" };
  assert.deepEqual(ocorrenciasRecorrente(r, "2026-09-01", "2026-09-23"), [
    "2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22",
  ]);
});

teste("projeção do fim do mês", () => {
  const p = projecaoDoMes({ saldoAtual: 2000, recorrentesPrevistos: -800, mediaDiariaVariavel: 50, diasRestantes: 10 });
  assert.equal(p.variavel_previsto, 500);
  assert.equal(p.saldo_previsto, 700, "2000 - 800 - 500");
});

teste("envelope de orçamento avisa em 80% e em 100%", () => {
  assert.equal(consumoOrcamento(500, 300).situacao, "ok");
  assert.equal(consumoOrcamento(500, 400).situacao, "atencao");
  assert.equal(consumoOrcamento(500, 520).situacao, "estourou");
  assert.equal(consumoOrcamento(500, 520).resta, -20);
});

teste("regra 50/30/20", () => {
  const r = regra502030(5000, 2000, 1800, 500);
  assert.equal(r[0].alvo, 2500);
  assert.equal(r[1].alvo, 1500);
  assert.equal(r[2].alvo, 1000);
  assert.equal(r[1].real, 1800);
});

const DIVIDAS = [
  { nome: "Cartão", saldo_atual: 5000, juros_mes: 12, parcela_min: 500 },
  { nome: "Empréstimo", saldo_atual: 8000, juros_mes: 2, parcela_min: 400 },
  { nome: "Loja", saldo_atual: 800, juros_mes: 5, parcela_min: 100 },
];

teste("avalanche ataca o maior juros primeiro", () => {
  const plano = planoQuitacao(DIVIDAS, 300, "avalanche");
  assert.deepEqual(plano.ordem, ["Cartão", "Loja", "Empréstimo"]);
  assert.ok(plano.meses > 0 && plano.meses < 100);
  assert.equal(plano.nunca_quita, false);
});

teste("bola de neve ataca o menor saldo primeiro", () => {
  const plano = planoQuitacao(DIVIDAS, 300, "bola_de_neve");
  assert.deepEqual(plano.ordem, ["Loja", "Cartão", "Empréstimo"]);
});

teste("avalanche paga menos juros que bola de neve", () => {
  const a = planoQuitacao(DIVIDAS, 300, "avalanche");
  const b = planoQuitacao(DIVIDAS, 300, "bola_de_neve");
  assert.ok(a.total_juros <= b.total_juros, `avalanche ${a.total_juros} deveria ser <= bola de neve ${b.total_juros}`);
});

teste("dívida que não fecha com o pagamento atual é sinalizada", () => {
  const plano = planoQuitacao([{ nome: "Rotativo", saldo_atual: 10000, juros_mes: 14, parcela_min: 100 }], 0, "avalanche");
  assert.equal(plano.nunca_quita, true, "juros maiores que o pagamento: o saldo nunca zera");
});

teste("sem dívida, plano vazio", () => {
  assert.equal(planoQuitacao([], 500).meses, 0);
});

teste("gasto fora do padrão", () => {
  const rotina = [40, 45, 38, 52, 47, 43];
  assert.equal(foraDoPadrao(rotina, 300), true);
  assert.equal(foraDoPadrao(rotina, 50), false);
  assert.equal(foraDoPadrao(rotina, 49), false);
  assert.equal(foraDoPadrao([40, 45], 300), false, "histórico curto não acusa nada");
});

console.log(`\n${passou} testes passaram.`);
