// Regras de hidratação, sem banco:  node scripts/test-agua.js
import assert from "node:assert/strict";
import { esperadoAte, fatorDaBebida, metaPorPeso } from "../src/modules/agua/bebidas.js";
import { calcularSequencia } from "../src/modules/agua/service.js";

let passou = 0;
const teste = (nome, f) => (f(), passou++, console.log(`  ok  ${nome}`));

teste("meta por peso, arredondada em 100 ml", () => {
  assert.equal(metaPorPeso(80), 2800);
  assert.equal(metaPorPeso(72), 2500);
  assert.equal(metaPorPeso(null), 2500, "sem peso cadastrado, usa o padrão");
  assert.equal(metaPorPeso(80, { diaDeTreino: true }), 3300);
});

teste("café hidrata menos, álcool desconta", () => {
  assert.equal(fatorDaBebida("agua"), 1);
  assert.equal(fatorDaBebida("cafe"), 0.6);
  assert.equal(fatorDaBebida("alcool"), -0.5);
  assert.equal(fatorDaBebida("inexistente"), 1);
});

teste("ritmo esperado ao longo do dia", () => {
  assert.equal(esperadoAte(6, 3000), 0, "antes das 7h não cobra nada");
  assert.equal(esperadoAte(7, 3000), 0);
  assert.equal(esperadoAte(14, 3000), 1400);
  assert.equal(esperadoAte(23, 3000), 3000, "depois das 22h cobra a meta inteira");
});

teste("sequência de água usa a hidratação, não o volume bruto", () => {
  const datas = ["2026-09-05", "2026-09-06", "2026-09-07"];
  const totais = {
    "2026-09-05": { hidratacao: 2600 },
    "2026-09-06": { hidratacao: 2500 },
    "2026-09-07": { hidratacao: 400 },
  };
  assert.equal(calcularSequencia(totais, datas, 2500), 2, "hoje em andamento não quebra");
});

console.log(`\n${passou} testes passaram.`);
