// Cálculos das metas, sem banco:  node scripts/test-metas.js
import assert from "node:assert/strict";
import { diasRestantes, estaOrfa, progresso, ritmoNecessario, situacao } from "../src/modules/metas/regras.js";

let passou = 0;
const teste = (nome, f) => (f(), passou++, console.log(`  ok  ${nome}`));
const HOJE = "2026-09-08";

teste("progresso crescente", () => {
  assert.equal(progresso({ valor_inicial: 60, valor_atual: 70, valor_alvo: 80 }), 0.5);
  assert.equal(progresso({ valor_inicial: 0, valor_atual: 0, valor_alvo: 100 }), 0);
  assert.equal(progresso({ valor_inicial: 0, valor_atual: 150, valor_alvo: 100 }), 1, "não passa de 100%");
});

teste("progresso decrescente (perder peso, quitar dívida)", () => {
  assert.equal(progresso({ valor_inicial: 100, valor_atual: 90, valor_alvo: 80 }), 0.5);
  assert.equal(progresso({ valor_inicial: 100, valor_atual: 110, valor_alvo: 80 }), 0, "não fica negativo");
});

teste("meta sem alvo não tem barra", () => {
  assert.equal(progresso({ valor_inicial: 0, valor_atual: 5, valor_alvo: null }), null);
});

teste("dias restantes", () => {
  assert.equal(diasRestantes("2026-09-18", HOJE), 10);
  assert.equal(diasRestantes("2026-09-01", HOJE), -7);
  assert.equal(diasRestantes(null, HOJE), null);
});

teste("ritmo necessário transforma alvo em número do dia", () => {
  const r = ritmoNecessario({ valor_atual: 2000, valor_alvo: 10000, prazo: "2026-12-07" }, HOJE);
  assert.equal(r.dias, 90);
  assert.equal(Math.round(r.por_dia), 89);
  assert.equal(ritmoNecessario({ valor_atual: 10000, valor_alvo: 10000, prazo: "2026-12-07" }, HOJE), null);
});

teste("meta órfã: sem vínculo e parada há 14 dias", () => {
  const base = { criado_em: "2026-08-01T10:00:00Z", vinculos: 0 };
  assert.equal(estaOrfa({ ...base, atualizado_em: "2026-08-20T10:00:00Z" }, HOJE), true);
  assert.equal(estaOrfa({ ...base, atualizado_em: "2026-09-05T10:00:00Z" }, HOJE), false, "mexeu recentemente");
  assert.equal(estaOrfa({ ...base, atualizado_em: "2026-08-01T10:00:00Z", vinculos: 1 }, HOJE), false, "tem hábito ligado");
  assert.equal(estaOrfa({ ...base, atualizado_em: "2026-08-01T10:00:00Z", metrica_id: "agua.sequencia" }, HOJE), false, "atualiza sozinha");
  assert.equal(estaOrfa({ ...base, atualizado_em: "2026-08-01T10:00:00Z", concluida_em: "2026-08-10" }, HOJE), false);
});

teste("situação da meta", () => {
  assert.equal(situacao({ concluida_em: "2026-09-01" }, HOJE).id, "concluida");
  assert.equal(situacao({ prazo: "2026-09-01", vinculos: 1 }, HOJE).id, "atrasada");
  assert.equal(situacao({ prazo: "2026-09-08", vinculos: 1 }, HOJE).texto, "vence hoje");
  assert.equal(situacao({ prazo: "2026-10-08", vinculos: 1 }, HOJE).texto, "30 dias restantes");
});

console.log(`\n${passou} testes passaram.`);
