// Contas do módulo Vícios:  node scripts/test-vicios.js
import assert from "node:assert/strict";
import {
  aplicarRecaida, contador, economia, linhaRecuperacao, mapaGatilhos, marcosAlcancados, proximoMarco, sequenciaPledge,
} from "../src/modules/vicios/calculos.js";

let passou = 0;
const teste = (nome, f) => (f(), passou++, console.log(`  ok  ${nome}`));

const AGORA = new Date("2026-09-08T20:30:45Z");

teste("contador ao vivo", () => {
  const c = contador("2026-08-09T18:00:00Z", AGORA);
  assert.equal(c.dias, 30);
  assert.equal(c.horas, 2);
  assert.equal(c.minutos, 30);
  assert.equal(c.segundos, 45);
});

teste("contador não fica negativo com data no futuro", () => {
  assert.equal(contador("2027-01-01T00:00:00Z", AGORA).dias, 0);
});

teste("próximo marco e marcos já alcançados", () => {
  assert.deepEqual(proximoMarco(0), { dias: 1, faltam: 1 });
  assert.deepEqual(proximoMarco(30), { dias: 60, faltam: 30 });
  assert.deepEqual(proximoMarco(45), { dias: 60, faltam: 15 });
  assert.equal(proximoMarco(9999), null);
  assert.deepEqual(marcosAlcancados(31), [1, 3, 7, 14, 30]);
});

teste("economia de dinheiro e de tempo, com projeção", () => {
  const e = economia(15, 40, 30);
  assert.equal(e.dinheiro, 450);
  assert.equal(e.dinheiro_6m, 2730);
  assert.equal(e.dinheiro_12m, 5475);
  assert.equal(e.horas, 20);
  assert.equal(e.dias_de_vida, 0.8);
});

const FISSURAS = [
  { data: "2026-09-07", hora: "22:10", gatilho: "estresse", emocao: "ansioso", intensidade: 8, cedeu: false },
  { data: "2026-09-07", hora: "23:40", gatilho: "estresse", emocao: "ansioso", intensidade: 9, cedeu: true },
  { data: "2026-09-05", hora: "20:30", gatilho: "cerveja", emocao: "animado", intensidade: 6, cedeu: false },
  { data: "2026-09-04", hora: "09:15", gatilho: "café", emocao: "cansado", intensidade: 4, cedeu: false },
];

teste("mapa de gatilhos aponta horário, gatilho e emoção mais frequentes", () => {
  const mapa = mapaGatilhos(FISSURAS);
  assert.equal(mapa.total, 4);
  assert.equal(mapa.cedeu, 1);
  assert.equal(mapa.taxa_cedeu, 0.25);
  assert.equal(mapa.intensidade_media, 6.8);
  assert.equal(mapa.por_faixa[0].id, "noite", "3 das 4 fissuras foram à noite");
  assert.equal(mapa.por_faixa[0].total, 3);
  assert.equal(mapa.por_gatilho[0].nome, "estresse");
  assert.equal(mapa.por_gatilho[0].cedeu, 1);
  assert.equal(mapa.por_emocao[0].nome, "ansioso");
});

teste("mapa vazio não quebra", () => {
  const mapa = mapaGatilhos([]);
  assert.equal(mapa.total, 0);
  assert.deepEqual(mapa.por_gatilho, []);
});

teste("linha do tempo marca o que já foi alcançado", () => {
  const linha = linhaRecuperacao("cigarro", 30);
  assert.ok(linha.length > 5);
  assert.equal(linha.find((e) => e.dias === 14).alcancado, true);
  assert.equal(linha.find((e) => e.dias === 90).alcancado, false);
  assert.ok(linhaRecuperacao("tipo_que_nao_existe", 1).length > 0, "cai no genérico");
});

teste("sequência de compromissos cumpridos", () => {
  const pledges = [
    { data: "2026-09-08", cumprido: null },
    { data: "2026-09-07", cumprido: true },
    { data: "2026-09-06", cumprido: true },
    { data: "2026-09-05", cumprido: false },
    { data: "2026-09-04", cumprido: true },
  ];
  assert.equal(sequenciaPledge(pledges, "2026-09-08"), 2, "hoje em aberto não conta nem quebra");
});

teste("recaída zera o contador mas preserva o recorde", () => {
  const vicio = { data_inicio: "2026-08-09T18:00:00Z", recorde_dias: 12 };
  const resultado = aplicarRecaida(vicio, AGORA);
  assert.equal(resultado.recorde_dias, 30, "30 dias atuais viram o novo recorde");
  assert.equal(resultado.dias_perdidos, 30);
  assert.equal(resultado.data_inicio, AGORA.toISOString());

  const comRecordeMaior = { data_inicio: "2026-09-01T00:00:00Z", recorde_dias: 47 };
  assert.equal(aplicarRecaida(comRecordeMaior, AGORA).recorde_dias, 47, "o recorde antigo continua valendo");
});

console.log(`\n${passou} testes passaram.`);
