// Motor de progressão de carga, sem banco:  node scripts/test-treino.js
import assert from "node:assert/strict";
import { arredondarPara, detectarEstagnacao, ehPR, epley1RM, melhor1RM, sugerir, volume } from "../src/modules/treino/progressao.js";

let passou = 0;
const teste = (nome, f) => (f(), passou++, console.log(`  ok  ${nome}`));

const serie = (peso, reps, rir = null) => ({ peso, reps, rir, tipo: "normal" });

teste("1RM estimado pela fórmula de Epley", () => {
  assert.equal(epley1RM(100, 1), 100, "1 rep é o próprio peso");
  assert.equal(epley1RM(60, 10), 80);
  assert.equal(epley1RM(0, 10), 0);
});

teste("volume é peso × reps, ignorando aquecimento", () => {
  const series = [serie(60, 10), serie(60, 8), { peso: 40, reps: 12, tipo: "aquecimento" }];
  assert.equal(volume(series), 60 * 10 + 60 * 8);
});

teste("arredonda para o incremento do equipamento", () => {
  assert.equal(arredondarPara(63.7, 2.5), 62.5, "63,7 está mais perto de 62,5 que de 65");
  assert.equal(arredondarPara(64.5, 2.5), 65);
  assert.equal(arredondarPara(63.7, 1), 64);
});

teste("primeira vez não inventa peso", () => {
  const s = sugerir({ regra: "dupla", reps_min: 8, rir_alvo: 2 }, null);
  assert.equal(s.peso, null);
  assert.match(s.motivo, /primeira vez/);
});

teste("linear: bateu o alvo, sobe o peso", () => {
  const config = { regra: "linear", series_alvo: 3, reps_min: 5, reps_max: 5, incremento_kg: 2.5 };
  const subiu = sugerir(config, { series: [serie(60, 5), serie(60, 5), serie(60, 5)] });
  assert.equal(subiu.peso, 62.5);

  const repetiu = sugerir(config, { series: [serie(60, 5), serie(60, 5), serie(60, 4)] });
  assert.equal(repetiu.peso, 60, "falhou uma série: repete o peso");
});

teste("linear: série a menos não conta como completo", () => {
  const config = { regra: "linear", series_alvo: 3, reps_min: 5, reps_max: 5, incremento_kg: 2.5 };
  const s = sugerir(config, { series: [serie(60, 5), serie(60, 5)] });
  assert.equal(s.peso, 60);
});

teste("dupla progressão: sobe reps na faixa, depois o peso", () => {
  const config = { regra: "dupla", series_alvo: 3, reps_min: 8, reps_max: 12, incremento_kg: 2.5 };

  const meio = sugerir(config, { series: [serie(50, 9), serie(50, 9), serie(50, 8)] });
  assert.equal(meio.peso, 50);
  assert.equal(meio.reps, 9, "mira em uma repetição a mais que a pior série");

  const topo = sugerir(config, { series: [serie(50, 12), serie(50, 12), serie(50, 12)] });
  assert.equal(topo.peso, 52.5);
  assert.equal(topo.reps, 8, "sobe o peso e volta para o piso da faixa");
});

teste("dupla progressão não passa do teto da faixa", () => {
  const config = { regra: "dupla", series_alvo: 3, reps_min: 8, reps_max: 12, incremento_kg: 2.5 };
  const s = sugerir(config, { series: [serie(50, 12), serie(50, 12), serie(50, 11)] });
  assert.equal(s.reps, 12);
  assert.equal(s.peso, 50);
});

teste("RIR: folga sobra sobe, esforço demais desce", () => {
  const config = { regra: "rir", series_alvo: 3, rir_alvo: 2, incremento_kg: 2.5 };

  assert.equal(sugerir(config, { series: [serie(80, 8, 4), serie(80, 8, 3), serie(80, 8, 3)] }).peso, 82.5);
  assert.equal(sugerir(config, { series: [serie(80, 8, 1), serie(80, 8, 0), serie(80, 8, 1)] }).peso, 77.5);
  assert.equal(sugerir(config, { series: [serie(80, 8, 2), serie(80, 8, 2), serie(80, 8, 2)] }).peso, 80);
});

teste("RIR sem registro mantém o peso, sem chutar", () => {
  const s = sugerir({ regra: "rir", rir_alvo: 2 }, { series: [serie(80, 8), serie(80, 8)] });
  assert.equal(s.peso, 80);
  assert.match(s.motivo, /sem RIR/);
});

teste("percentual do 1RM", () => {
  const s = sugerir(
    { regra: "percentual_1rm", percentual_1rm: 75, incremento_kg: 2.5, reps_min: 5 },
    { series: [serie(100, 5)] }
  );
  // 1RM ≈ 116,7 → 75% ≈ 87,5
  assert.equal(s.peso, 87.5);
});

teste("estagnação: 3 sessões sem melhorar nem 1RM nem volume", () => {
  const sessoes = [
    { series: [serie(60, 8), serie(60, 8), serie(60, 8)] },
    { series: [serie(62.5, 8), serie(62.5, 8), serie(62.5, 8)] },
    { series: [serie(62.5, 8), serie(62.5, 7), serie(62.5, 7)] },
    { series: [serie(62.5, 8), serie(62.5, 7), serie(62.5, 7)] },
    { series: [serie(62.5, 7), serie(62.5, 7), serie(62.5, 7)] },
  ];
  const resultado = detectarEstagnacao(sessoes, { incremento_kg: 2.5 });
  assert.equal(resultado.estagnado, true);
  assert.equal(resultado.sugestoes.length, 3);
  assert.match(resultado.sugestoes[0], /Deload: volte para 57.5 kg/);
});

teste("subir uma repetição conta como progresso, não estagnação", () => {
  const sessoes = [
    { series: [serie(60, 8), serie(60, 8), serie(60, 8)] },
    { series: [serie(60, 8), serie(60, 8), serie(60, 8)] },
    { series: [serie(60, 9), serie(60, 8), serie(60, 8)] },
    { series: [serie(60, 10), serie(60, 9), serie(60, 8)] },
  ];
  assert.equal(detectarEstagnacao(sessoes).estagnado, false);
});

teste("histórico curto não é estagnação", () => {
  assert.equal(detectarEstagnacao([{ series: [serie(60, 8)] }, { series: [serie(60, 8)] }]).estagnado, false);
});

teste("PR: peso novo ou 1RM novo", () => {
  const historico = [serie(60, 8), serie(60, 8)];
  assert.equal(ehPR(serie(62.5, 8), historico), true, "peso maior é PR");
  assert.equal(ehPR(serie(60, 9), historico), true, "mesma carga com uma rep a mais é PR");
  assert.equal(ehPR(serie(60, 8), historico), false);
  assert.equal(ehPR(serie(60, 8), []), true, "primeira vez é sempre PR");
  assert.equal(ehPR({ peso: 0, reps: 0 }, historico), false);
});

teste("melhor 1RM do histórico", () => {
  assert.equal(melhor1RM([serie(60, 10), serie(80, 3), serie(70, 6)]), epley1RM(80, 3));
});

console.log(`\n${passou} testes passaram.`);
