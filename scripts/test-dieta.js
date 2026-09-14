// Contas do módulo Dieta:  node scripts/test-dieta.js
import assert from "node:assert/strict";
import {
  alvoDoDia, escalarMacros, formatarJejum, minutosDesde, planoParaLista, progresso,
  secaoDoItem, somarMacros, sugerirAjuste,
} from "../src/modules/dieta/calculos.js";

let passou = 0;
const teste = (nome, f) => (f(), passou++, console.log(`  ok  ${nome}`));

teste("escala os macros a partir de 100 g", () => {
  const arroz = { kcal: 128, proteina_g: 2.5, carbo_g: 28.1, gordura_g: 0.2, fibra_g: 1.6, sodio_mg: 1 };
  assert.deepEqual(escalarMacros(arroz, 100), { kcal: 128, proteina_g: 2.5, carbo_g: 28.1, gordura_g: 0.2, fibra_g: 1.6, sodio_mg: 1 });
  assert.deepEqual(escalarMacros(arroz, 200), { kcal: 256, proteina_g: 5, carbo_g: 56.2, gordura_g: 0.4, fibra_g: 3.2, sodio_mg: 2 });
  assert.equal(escalarMacros(arroz, 50).kcal, 64);
});

teste("escala com quantidade zero dá tudo zero", () => {
  const ovo = { kcal: 155, proteina_g: 13, carbo_g: 1.1, gordura_g: 11 };
  assert.equal(escalarMacros(ovo, 0).kcal, 0);
});

teste("soma macros de vários itens de uma refeição", () => {
  const soma = somarMacros([
    { kcal: 128, proteina_g: 2.5, carbo_g: 28.1, gordura_g: 0.2, fibra_g: 1.6, sodio_mg: 1 },
    { kcal: 76, proteina_g: 4.8, carbo_g: 13.6, gordura_g: 0.5, fibra_g: 8.5, sodio_mg: 2 },
  ]);
  assert.equal(soma.kcal, 204);
  assert.equal(soma.proteina_g, 7.3);
});

teste("alvo do dia muda com treino", () => {
  const alvo = { kcal_treino: 2600, kcal_descanso: 2200, proteina_g: 160, carbo_g: 250, gordura_g: 70 };
  assert.equal(alvoDoDia(alvo, true).kcal, 2600);
  assert.equal(alvoDoDia(alvo, false).kcal, 2200);
  assert.equal(alvoDoDia(null, true), null);
});

teste("progresso mostra o que falta", () => {
  const p = progresso({ kcal: 1500, proteina_g: 90, carbo_g: 150, gordura_g: 40 }, { kcal: 2000, proteina_g: 150, carbo_g: 200, gordura_g: 60 });
  assert.equal(p.kcal.resta, 500);
  assert.equal(p.kcal.proporcao, 0.75);
  assert.equal(p.proteina_g.resta, 60);
});

// ---------- ajuste adaptativo ----------

function gerarDias(inicio, quantidade) {
  return Array.from({ length: quantidade }, (_, i) => {
    const data = new Date(`${inicio}T12:00:00Z`);
    data.setUTCDate(data.getUTCDate() + i);
    return data.toISOString().slice(0, 10);
  });
}

teste("sem dados suficientes, pede mais tempo", () => {
  const r = sugerirAjuste({ pesos: [{ data: "2026-09-01", kg: 80 }], consumos: [{ data: "2026-09-01", kcal: 2000 }], alvoAtual: 2200 });
  assert.equal(r.suficiente, false);
  assert.match(r.motivo, /faltam dados/);
});

teste("comendo mais que o alvo e engordando: sugere baixar para perder peso", () => {
  const dias = gerarDias("2026-08-20", 21);
  const consumos = dias.map((data) => ({ data, kcal: 2600 }));
  const pesos = [
    { data: dias[0], kg: 80.0 }, { data: dias[1], kg: 80.1 }, { data: dias[2], kg: 79.9 },
    { data: dias[18], kg: 81.0 }, { data: dias[19], kg: 81.2 }, { data: dias[20], kg: 81.1 },
  ];

  const r = sugerirAjuste({ pesos, consumos, alvoAtual: 2600, objetivo: "perder", taxaSemanalKg: 0.4 });
  assert.equal(r.suficiente, true);
  assert.equal(r.variacao_peso_kg > 0, true, "o peso subiu no período");
  assert.ok(r.manutencao_estimada < 2600, "comendo 2600 e engordando, a manutenção real é menor que 2600");
  assert.ok(r.kcal_sugerido < r.manutencao_estimada, "objetivo perder: alvo fica abaixo da manutenção");
  assert.equal(r.mudar, true);
  assert.match(r.justificativa, /subiu/);
});

teste("peso estável e alvo já correto: não sugere mudar", () => {
  const dias = gerarDias("2026-08-20", 21);
  const consumos = dias.map((data) => ({ data, kcal: 2200 }));
  const pesos = dias.slice(0, 3).map((data) => ({ data, kg: 80 })).concat(dias.slice(-3).map((data) => ({ data, kg: 80.05 })));

  const r = sugerirAjuste({ pesos, consumos, alvoAtual: 2200, objetivo: "manter" });
  assert.equal(r.suficiente, true);
  assert.equal(r.mudar, false, "diferença pequena não deveria pedir mudança");
});

teste("arredonda o alvo sugerido para múltiplo de 25", () => {
  const dias = gerarDias("2026-08-20", 21);
  const consumos = dias.map((data) => ({ data, kcal: 2513 }));
  const pesos = dias.slice(0, 3).map((data) => ({ data, kg: 75 })).concat(dias.slice(-3).map((data) => ({ data, kg: 75 })));

  const r = sugerirAjuste({ pesos, consumos, alvoAtual: 2500, objetivo: "manter" });
  assert.equal(r.kcal_sugerido % 25, 0);
});

teste("emagrecendo mais rápido que o alvo: sugere subir a comida", () => {
  const dias = gerarDias("2026-08-20", 21);
  const consumos = dias.map((data) => ({ data, kcal: 1800 }));
  const pesos = [
    { data: dias[0], kg: 90.0 }, { data: dias[1], kg: 90.1 }, { data: dias[2], kg: 89.9 },
    { data: dias[18], kg: 87.0 }, { data: dias[19], kg: 86.8 }, { data: dias[20], kg: 86.9 },
  ];

  const r = sugerirAjuste({ pesos, consumos, alvoAtual: 1800, objetivo: "perder", taxaSemanalKg: 0.3 });
  assert.ok(r.variacao_peso_kg < 0, "perdeu peso");
  // perdendo rápido demais para a meta de 0,3kg/semana: o alvo sugerido sobe
  assert.ok(r.kcal_sugerido > 1800);
});

// ---------- lista de compras ----------

teste("classifica item por palavra-chave", () => {
  assert.equal(secaoDoItem("Peito de frango"), "Açougue e peixaria");
  assert.equal(secaoDoItem("Banana prata"), "Hortifrúti");
  assert.equal(secaoDoItem("Leite integral"), "Laticínios e frios");
  assert.equal(secaoDoItem("Pão francês"), "Padaria");
  assert.equal(secaoDoItem("Arroz branco"), "Mercearia");
  assert.equal(secaoDoItem("Algo bem estranho"), "Outros");
});

teste("plano vira lista de compras somando quantidades repetidas", () => {
  const plano = [
    { descricao: "Peito de frango", quantidade_g: 200 },
    { descricao: "peito de frango", quantidade_g: 150 },
    { descricao: "Banana prata", quantidade_g: 100 },
  ];
  const lista = planoParaLista(plano);
  assert.equal(lista.length, 2);
  const frango = lista.find((i) => i.item.toLowerCase().includes("frango"));
  assert.equal(frango.quantidade, "350 g");
  assert.equal(frango.secao, "Açougue e peixaria");
});

// ---------- jejum ----------

teste("minutos e formato do jejum", () => {
  const agora = new Date("2026-09-08T20:00:00Z");
  assert.equal(minutosDesde("2026-09-08T18:30:00Z", agora), 90);
  assert.equal(formatarJejum(90), "1h30");
  assert.equal(formatarJejum(725), "12h05");
});

console.log(`\n${passou} testes passaram.`);
