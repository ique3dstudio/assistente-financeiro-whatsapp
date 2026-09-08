// Testa as regras de frequência e sequência sem precisar de banco:
//   node scripts/test-habitos.js
import assert from "node:assert/strict";
import { calcularStreak, descreverFrequencia, devido, diaBom, diaSemana, inicioDaSemana } from "../src/modules/habitos/regras.js";

const criado_em = "2026-09-01";
let passou = 0;
function teste(nome, funcao) {
  funcao();
  passou++;
  console.log(`  ok  ${nome}`);
}

// 2026-09-07 é uma segunda-feira
teste("dia da semana", () => assert.equal(diaSemana("2026-09-07"), 1));
teste("início da semana é domingo", () => assert.equal(inicioDaSemana("2026-09-07"), "2026-09-06"));

teste("diária cobra todo dia", () => {
  const h = { criado_em, frequencia: { tipo: "diaria" } };
  assert.equal(devido(h, "2026-09-07"), true);
  assert.equal(devido(h, "2026-08-31"), false, "antes de criar não cobra");
});

teste("dias específicos da semana", () => {
  const h = { criado_em, frequencia: { tipo: "dias_semana", dias: [1, 3, 5] } };
  assert.equal(devido(h, "2026-09-07"), true, "segunda");
  assert.equal(devido(h, "2026-09-08"), false, "terça");
});

teste("a cada N dias", () => {
  const h = { criado_em, frequencia: { tipo: "cada_n_dias", n: 3 } };
  assert.equal(devido(h, "2026-09-01"), true);
  assert.equal(devido(h, "2026-09-02"), false);
  assert.equal(devido(h, "2026-09-04"), true);
});

teste("X vezes por semana sai do checklist ao bater a meta", () => {
  const h = { criado_em, frequencia: { tipo: "vezes_semana", vezes: 3 } };
  assert.equal(devido(h, "2026-09-07", { feitosNaSemana: 2 }), true);
  assert.equal(devido(h, "2026-09-07", { feitosNaSemana: 3 }), false);
  assert.equal(devido(h, "2026-09-07", { feitosNaSemana: 3, feitoNoDia: true }), true, "o que foi feito hoje continua visível");
});

teste("streak conta dias seguidos", () => {
  const h = { criado_em: "2026-01-01", frequencia: { tipo: "diaria" } };
  const dados = { concluidos: new Set(["2026-09-05", "2026-09-06", "2026-09-07"]), folgas: new Set() };
  assert.equal(calcularStreak(h, dados, "2026-09-07"), 3);
});

teste("hoje em aberto não quebra o streak", () => {
  const h = { criado_em: "2026-01-01", frequencia: { tipo: "diaria" } };
  const dados = { concluidos: new Set(["2026-09-05", "2026-09-06"]), folgas: new Set() };
  assert.equal(calcularStreak(h, dados, "2026-09-07"), 2);
});

teste("dia de folga pula sem zerar", () => {
  const h = { criado_em: "2026-01-01", frequencia: { tipo: "diaria" } };
  const dados = { concluidos: new Set(["2026-09-04", "2026-09-06", "2026-09-07"]), folgas: new Set(["2026-09-05"]) };
  assert.equal(calcularStreak(h, dados, "2026-09-07"), 3);
});

teste("falta sem folga zera", () => {
  const h = { criado_em: "2026-01-01", frequencia: { tipo: "diaria" } };
  const dados = { concluidos: new Set(["2026-09-04", "2026-09-06", "2026-09-07"]), folgas: new Set() };
  assert.equal(calcularStreak(h, dados, "2026-09-07"), 2, "para no dia 5 que faltou");
});

teste("X vezes por semana conta semanas", () => {
  const h = { criado_em: "2026-01-01", frequencia: { tipo: "vezes_semana", vezes: 3 } };
  const dados = { concluidos: new Set(), folgas: new Set(), feitosPorSemana: { "2026-09-06": 1, "2026-08-30": 3, "2026-08-23": 4 } };
  assert.equal(calcularStreak(h, dados, "2026-09-07"), 2, "a semana em andamento não conta contra");
});

teste("dia bom: os não-negociáveis mandam", () => {
  assert.equal(diaBom([{ nao_negociavel: true, concluido: true }, { nao_negociavel: false, concluido: false }]), true);
  assert.equal(diaBom([{ nao_negociavel: true, concluido: false }, { nao_negociavel: false, concluido: true }]), false);
});

teste("dia bom sem âncora: 80% dos hábitos", () => {
  const cinco = (feitos) => Array.from({ length: 5 }, (_, i) => ({ nao_negociavel: false, concluido: i < feitos }));
  assert.equal(diaBom(cinco(4)), true);
  assert.equal(diaBom(cinco(3)), false);
  assert.equal(diaBom([]), false);
});

teste("texto da frequência", () => {
  assert.equal(descreverFrequencia({ tipo: "diaria" }), "todo dia");
  assert.equal(descreverFrequencia({ tipo: "dias_semana", dias: [1, 3] }), "seg, qua");
  assert.equal(descreverFrequencia({ tipo: "vezes_semana", vezes: 4 }), "4x por semana");
});

console.log(`\n${passou} testes passaram.`);
