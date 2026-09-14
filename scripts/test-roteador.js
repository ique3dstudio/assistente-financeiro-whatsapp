// Barra de comando por IA: só a parte pura (sem rede, sem banco) —
// node scripts/test-roteador.js
import assert from "node:assert/strict";
import {
  acharExercicio, dataCurta, diaDaSemana, montarPreview, normalizar, resumoAgenda, resumoAgua,
  resumoGasto, resumoTreino,
} from "../src/core/roteador.js";

let passou = 0;
const teste = (nome, f) => (f(), passou++, console.log(`  ok  ${nome}`));

const EXERCICIOS = [
  { id: "1", nome: "Supino reto com barra" },
  { id: "2", nome: "Supino inclinado com halteres" },
  { id: "3", nome: "Agachamento livre" },
  { id: "4", nome: "Elevação lateral" },
];

teste("normaliza tirando acento e caixa", () => {
  assert.equal(normalizar("Elevação Lateral"), "elevacao lateral");
  assert.equal(normalizar("  Supino  "), "supino");
  assert.equal(normalizar(null), "");
});

teste("acha exercício por substring, preferindo o nome mais curto", () => {
  assert.equal(acharExercicio("supino", EXERCICIOS).id, "1", "os dois batem, 'reto com barra' é mais curto");
  assert.equal(acharExercicio("Supino Reto", EXERCICIOS).id, "1");
  assert.equal(acharExercicio("agachamento", EXERCICIOS).id, "3");
  assert.equal(acharExercicio("elevacao", EXERCICIOS).id, "4", "sem acento também acha");
});

teste("exercício sem correspondência devolve null", () => {
  assert.equal(acharExercicio("levantamento terra", EXERCICIOS), null);
  assert.equal(acharExercicio("", EXERCICIOS), null);
});

teste("dia da semana e data curta", () => {
  assert.equal(diaDaSemana("2026-09-17"), "quinta");
  assert.equal(dataCurta("2026-09-17"), "quinta, 17/09");
});

teste("resumo de gasto e de água", () => {
  assert.equal(resumoGasto({ valor: 45.9, tipo: "despesa", categoria: "Alimentação" }), "💸 Gasto de R$ 45,90 em Alimentação");
  assert.equal(
    resumoGasto({ valor: 200, tipo: "receita", categoria: "Freela", descricao: "logo" }),
    "💰 Recebimento de R$ 200,00 em Freela (logo)"
  );
  assert.equal(resumoAgua({ quantidade_ml: 500, bebida: "agua" }), "💧 500 ml de água");
});

teste("resumo de treino e de agenda", () => {
  assert.equal(resumoTreino({ exercicioNome: "Supino reto com barra", series: 4, reps: 8, peso: 60 }), "🏋️ 4 séries de Supino reto com barra: 8 reps a 60 kg");
  assert.equal(resumoTreino({ exercicioNome: "Prancha", series: 1, reps: 30, peso: 0 }), "🏋️ 1 série de Prancha: 30 reps");
  assert.equal(
    resumoAgenda({ titulo: "Dentista", tipo: "consulta", data: "2026-09-17", hora: "15:00" }),
    "📅 Consulta: Dentista, quinta, 17/09 às 15:00"
  );
});

teste("montarPreview: gasto válido vira prévia de financas", () => {
  const preview = montarPreview(
    { ferramenta: "registrar_gasto", dados: { valor: 45, tipo: "despesa", categoria: "Alimentação" } },
    { exercicios: [] }
  );
  assert.equal(preview.modulo, "financas");
  assert.equal(preview.acao, "registrar_gasto");
  assert.equal(preview.dados.valor, 45);
  assert.ok(preview.resumo.includes("45,00"));
});

teste("montarPreview: gasto com valor inválido vira erro", () => {
  const preview = montarPreview({ ferramenta: "registrar_gasto", dados: { valor: -5, tipo: "despesa", categoria: "x" } }, { exercicios: [] });
  assert.equal(preview.modulo, "financas");
  assert.ok(preview.erro);
  assert.equal(preview.acao, undefined);
});

teste("montarPreview: água arredonda e cai para 'agua' se a bebida for desconhecida", () => {
  const preview = montarPreview({ ferramenta: "registrar_agua", dados: { quantidade_ml: 499.6, bebida: "vinho" } }, { exercicios: [] });
  assert.equal(preview.dados.quantidade_ml, 500);
  assert.equal(preview.dados.bebida, "agua");
});

teste("montarPreview: treino acha o exercício e monta N séries", () => {
  const preview = montarPreview(
    { ferramenta: "registrar_treino", dados: { exercicio: "supino", series: 4, reps: 8, peso: 60 } },
    { exercicios: EXERCICIOS }
  );
  assert.equal(preview.modulo, "treino");
  assert.equal(preview.dados.exercicio_id, "1");
  assert.equal(preview.dados.series, 4);
});

teste("montarPreview: treino com exercício desconhecido vira erro", () => {
  const preview = montarPreview(
    { ferramenta: "registrar_treino", dados: { exercicio: "levantamento terra", reps: 5 } },
    { exercicios: EXERCICIOS }
  );
  assert.ok(preview.erro.includes("levantamento terra"));
});

teste("montarPreview: compromisso sem título ou data vira erro", () => {
  assert.ok(montarPreview({ ferramenta: "criar_compromisso", dados: { data: "2026-09-17" } }, { exercicios: [] }).erro);
  assert.ok(montarPreview({ ferramenta: "criar_compromisso", dados: { titulo: "Dentista" } }, { exercicios: [] }).erro);
});

teste("montarPreview: compromisso com tipo desconhecido cai para 'pessoal'", () => {
  const preview = montarPreview(
    { ferramenta: "criar_compromisso", dados: { titulo: "Dentista", tipo: "inventado", data: "2026-09-17" } },
    { exercicios: [] }
  );
  assert.equal(preview.dados.tipo, "pessoal");
});

teste("montarPreview: sem chamada de ferramenta (mensagem não reconhecida) devolve null", () => {
  assert.equal(montarPreview(null, { exercicios: [] }), null);
});

console.log(`\n${passou} testes passaram.`);
