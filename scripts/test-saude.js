// Contas do módulo Saúde:  node scripts/test-saude.js
import assert from "node:assert/strict";
import {
  classificarMarcador, classificarPressao, dosesDoDia, duracaoSono, estoque, formatarDuracao, proximaRecorrencia,
} from "../src/modules/saude/calculos.js";

let passou = 0;
const teste = (nome, f) => (f(), passou++, console.log(`  ok  ${nome}`));

teste("valor dentro e fora da faixa de referência", () => {
  assert.equal(classificarMarcador(35, 30, 60), "normal");
  assert.equal(classificarMarcador(18, 30, 60), "abaixo");
  assert.equal(classificarMarcador(75, 30, 60), "acima");
  assert.equal(classificarMarcador(200, 0, 190), "acima");
});

teste("doses do dia respeitam frequência", () => {
  const diario = { frequencia: "diaria", horarios: ["20:00:00", "08:00:00"], inicio: "2026-01-01" };
  assert.deepEqual(dosesDoDia(diario, "2026-09-08", 2), ["08:00", "20:00"], "vem ordenado");

  const seNecessario = { frequencia: "se_necessario", horarios: ["08:00"] };
  assert.deepEqual(dosesDoDia(seNecessario, "2026-09-08", 2), []);

  const diasEspecificos = { frequencia: "dias_semana", dias_semana: [1, 3, 5], horarios: ["08:00"], inicio: "2026-01-01" };
  assert.deepEqual(dosesDoDia(diasEspecificos, "2026-09-08", 2), [], "terça não é dia dele");
  assert.deepEqual(dosesDoDia(diasEspecificos, "2026-09-07", 1), ["08:00"]);
});

teste("medicamento fora do período não gera dose", () => {
  const encerrado = { frequencia: "diaria", horarios: ["08:00"], inicio: "2026-01-01", fim: "2026-08-31" };
  assert.deepEqual(dosesDoDia(encerrado, "2026-09-08", 2), []);

  const futuro = { frequencia: "diaria", horarios: ["08:00"], inicio: "2026-12-01" };
  assert.deepEqual(dosesDoDia(futuro, "2026-09-08", 2), []);
});

teste("estoque em dias e alerta de recompra", () => {
  assert.deepEqual(estoque({ horarios: ["08:00", "20:00"], estoque_atual: 30, estoque_alerta: 7 }), { dias: 15, recomprar: false });
  assert.deepEqual(estoque({ horarios: ["08:00", "20:00"], estoque_atual: 12, estoque_alerta: 7 }), { dias: 6, recomprar: true });
  assert.deepEqual(estoque({ horarios: ["08:00"], estoque_atual: null }), { dias: null, recomprar: false });
});

teste("rotina de saúde vencida", () => {
  const dentista = { cada_meses: 6, ultima_em: "2026-01-10" };
  const r = proximaRecorrencia(dentista, "2026-09-08");
  assert.equal(r.proxima, "2026-07-10");
  assert.equal(r.vencida, true);

  const checkup = { cada_meses: 12, ultima_em: "2026-06-15" };
  const c = proximaRecorrencia(checkup, "2026-09-08");
  assert.equal(c.proxima, "2027-06-15");
  assert.equal(c.vencida, false);
  assert.ok(c.dias > 200);
});

teste("rotina do dia 31 cai no último dia do mês alvo", () => {
  const r = proximaRecorrencia({ cada_meses: 1, ultima_em: "2026-01-31" }, "2026-02-01");
  assert.equal(r.proxima, "2026-02-28");
});

teste("sono que atravessa a meia-noite", () => {
  assert.equal(duracaoSono("23:30", "07:15"), 465, "7h45");
  assert.equal(duracaoSono("01:00", "09:00"), 480);
  assert.equal(duracaoSono("22:00", "22:00"), 0);
  assert.equal(duracaoSono(null, "07:00"), null);
  assert.equal(formatarDuracao(465), "7h45");
  assert.equal(formatarDuracao(null), "—");
});

teste("faixas de pressão", () => {
  assert.equal(classificarPressao(115, 75).id, "otima");
  assert.equal(classificarPressao(125, 82).id, "normal");
  assert.equal(classificarPressao(135, 88).id, "limitrofe");
  assert.equal(classificarPressao(150, 95).id, "elevada_1");
  assert.equal(classificarPressao(190, 120).id, "elevada_3");
});

console.log(`\n${passou} testes passaram.`);
