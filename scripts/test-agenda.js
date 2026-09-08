// Recorrência, conflitos e contagem regressiva:  node scripts/test-agenda.js
import assert from "node:assert/strict";
import { aconteceEm, conflitos, faltaTexto, ocorrencias, somarMinutos } from "../src/modules/agenda/regras.js";

let passou = 0;
const teste = (nome, f) => (f(), passou++, console.log(`  ok  ${nome}`));

// 2026-09-08 é uma terça-feira
teste("evento sem recorrência aparece só no dia", () => {
  const e = { data: "2026-09-10", recorrencia: { tipo: "nenhuma" } };
  assert.deepEqual(ocorrencias(e, "2026-09-08", "2026-09-14"), ["2026-09-10"]);
  assert.deepEqual(ocorrencias(e, "2026-09-11", "2026-09-14"), []);
});

teste("recorrência semanal em dias escolhidos", () => {
  const e = { data: "2026-09-01", recorrencia: { tipo: "semanal", dias: [2, 4] } }; // ter e qui
  assert.deepEqual(ocorrencias(e, "2026-09-08", "2026-09-14"), ["2026-09-08", "2026-09-10"]);
});

teste("recorrência mensal no dia 10", () => {
  const e = { data: "2026-09-10", recorrencia: { tipo: "mensal", dia: 10 } };
  assert.deepEqual(ocorrencias(e, "2026-09-01", "2026-11-30"), ["2026-09-10", "2026-10-10", "2026-11-10"]);
});

teste("a cada 15 dias", () => {
  const e = { data: "2026-09-01", recorrencia: { tipo: "cada_n_dias", n: 15 } };
  assert.deepEqual(ocorrencias(e, "2026-09-01", "2026-10-01"), ["2026-09-01", "2026-09-16", "2026-10-01"]);
});

teste('recorrência respeita a data "ate"', () => {
  const e = { data: "2026-09-01", recorrencia: { tipo: "diaria", ate: "2026-09-03" } };
  assert.deepEqual(ocorrencias(e, "2026-09-01", "2026-09-10"), ["2026-09-01", "2026-09-02", "2026-09-03"]);
});

teste("nada acontece antes da data de início", () => {
  const e = { data: "2026-09-10", recorrencia: { tipo: "diaria" } };
  assert.equal(aconteceEm(e, "2026-09-09"), false);
  assert.equal(aconteceEm(e, "2026-09-10"), true);
});

teste("conflito de horário é detectado", () => {
  const eventos = [
    { titulo: "Reunião", hora: "14:00", duracao_min: 60 },
    { titulo: "Consulta", hora: "14:30", duracao_min: 30 },
    { titulo: "Treino", hora: "18:00", duracao_min: 60 },
  ];
  assert.deepEqual(conflitos(eventos), [["Reunião", "Consulta"]]);
  assert.deepEqual(conflitos([eventos[0], eventos[2]]), []);
});

teste("soma de minutos vira hora final", () => {
  assert.equal(somarMinutos("14:00", 90), "15:30");
  assert.equal(somarMinutos("23:30", 60), "00:30");
});

teste("contagem regressiva em linguagem humana", () => {
  assert.equal(faltaTexto(3), "agora");
  assert.equal(faltaTexto(40), "em 40 min");
  assert.equal(faltaTexto(150), "em 2h30");
  assert.equal(faltaTexto(120), "em 2h");
  assert.equal(faltaTexto(-30), "há 30 min");
  assert.equal(faltaTexto(2880), "em 2 dias");
});

console.log(`\n${passou} testes passaram.`);
