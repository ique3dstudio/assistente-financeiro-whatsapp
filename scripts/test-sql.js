// Roda db/RODAR-TUDO.sql num Postgres real (PGlite = Postgres compilado para
// WASM) antes de você colar o SQL no Supabase:
//
//   node scripts/test-sql.js
//
// Confere três coisas: o SQL aplica limpo, aplica DUAS vezes sem quebrar
// (idempotente), e as tabelas aceitam exatamente os inserts que o app faz —
// barrando os inválidos. É a rede de segurança de quem roda SQL no celular,
// na estrada, sem poder testar.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

const sql = fs.readFileSync("db/RODAR-TUDO.sql", "utf8");
const db = await new PGlite();

async function rodar(rodada) {
  try {
    await db.exec(sql);
    console.log(`rodada ${rodada}: OK`);
  } catch (erro) {
    console.log(`rodada ${rodada}: ERRO → ${erro.message}`);
    process.exitCode = 1;
  }
}

await rodar(1);
await rodar(2); // tem que poder rodar de novo sem quebrar

const tabelas = await db.query(
  "select table_name from information_schema.tables where table_schema='public' order by table_name"
);
console.log(`\n${tabelas.rows.length} tabelas criadas:`);
console.log(tabelas.rows.map((r) => `  - ${r.table_name}`).join("\n"));

// Testa os inserts que o app realmente faz
const testes = [
  ["perfil", "insert into perfil (user_id, nome, peso_kg) values ('eu','Gustavo',80)"],
  ["habito", "insert into habitos (user_id, nome, emoji, periodo, frequencia) values ('eu','Beber água','💧','manha','{\"tipo\":\"dias_semana\",\"dias\":[1,3,5]}')"],
  ["habito_log", "insert into habitos_log (user_id, habito_id, data) select 'eu', id, current_date from habitos limit 1"],
  ["habito_log duplicado", "insert into habitos_log (user_id, habito_id, data) select 'eu', id, current_date from habitos limit 1"],
  ["folga", "insert into habitos_folgas (user_id, habito_id, data) select 'eu', id, current_date from habitos limit 1"],
  ["agua", "insert into agua_registros (user_id, data, quantidade_ml, bebida, fator) values ('eu', current_date, 500, 'cafe', 0.6)"],
  ["recipiente", "insert into agua_recipientes (user_id, nome, volume_ml) values ('eu','Garrafa',500)"],
  ["meta", "insert into metas (user_id, titulo, horizonte, area, valor_alvo, metrica_id) values ('eu','Supino 80kg','curto','saude',80,'agua.sequencia')"],
  ["marco", "insert into metas_marcos (user_id, meta_id, titulo) select 'eu', id, '70kg x 5' from metas limit 1"],
  ["vinculo", "insert into metas_vinculos (user_id, meta_id, tipo, referencia_id) select 'eu', m.id, 'habito', h.id from metas m, habitos h limit 1"],
  ["evento", "insert into agenda_eventos (user_id, titulo, tipo, data, hora, recorrencia, lembretes) values ('eu','Dentista','consulta',current_date,'15:00','{\"tipo\":\"mensal\",\"dia\":10}','{1440,30}')"],
  ["tarefa", "insert into tarefas (user_id, titulo, prazo, prioridade, periodo) values ('eu','Pagar cartão',current_date,1,'tarde')"],
  ["humor", "insert into humor_log (user_id, data, nota, emocoes, fatores) values ('eu', current_date, 4, '{calmo,grato}', '{sono,treino}')"],
  ["humor upsert", "insert into humor_log (user_id, data, nota) values ('eu', current_date, 5) on conflict (user_id, data) do update set nota = 5"],
  ["diario", "insert into diario (user_id, data, tipo, conteudo) values ('eu', current_date, 'gratidao', 'dia bom')"],
  ["transacao", "insert into transacoes (user_id, data, valor, tipo, categoria) values ('eu', current_date, 45.90, 'despesa', 'alimentacao')"],
  ["rotina de treino", "insert into treino_rotinas (user_id, nome, tipo, dias_semana) values ('eu','Treino A','abc','{1,4}')"],
  ["exercício na rotina", "insert into treino_rotina_exercicios (user_id, rotina_id, exercicio_id, regra_progressao, ordem) select 'eu', r.id, e.id, 'dupla', 1 from treino_rotinas r, exercicios e where e.slug='supino-reto-barra' limit 1"],
  ["sessão de treino", "insert into treino_sessoes (user_id, rotina_id, data) select 'eu', id, current_date from treino_rotinas limit 1"],
  ["série", "insert into treino_series (user_id, sessao_id, exercicio_id, serie, peso, reps, rir) select 'eu', s.id, e.id, 1, 60, 8, 2 from treino_sessoes s, exercicios e where e.slug='supino-reto-barra' limit 1"],
  ["medida corporal", "insert into medidas_corporais (user_id, data, peso_kg, braco_cm) values ('eu', current_date, 80.5, 36.0)"],
  ["conta", "insert into contas (user_id, nome, tipo, saldo_inicial) values ('eu','Nubank','corrente',1500)"],
  ["categoria", "insert into categorias (user_id, nome, tipo, teto_mensal) values ('eu','Cafeteria','despesa',120)"],
  ["categoria repetida (deve falhar)", "insert into categorias (user_id, nome, tipo) values ('eu','Cafeteria','despesa')"],
  ["cartão", "insert into cartoes (user_id, nome, limite, fechamento, vencimento) select 'eu','Visa',5000,20,1 from contas limit 1"],
  ["fechamento fora da faixa (deve falhar)", "insert into cartoes (user_id, nome, fechamento, vencimento) values ('eu','X',31,10)"],
  ["recorrente", "insert into recorrentes (user_id, descricao, valor, tipo, dia_do_mes, frequencia) values ('eu','Aluguel',1800,'despesa',5,'mensal')"],
  ["lançamento completo", "insert into transacoes (user_id, data, valor, tipo, categoria_id, conta_id, forma_pagamento, tags) select 'eu', current_date, 45.90, 'despesa', c.id, ct.id, 'pix', '{mercado}' from categorias c, contas ct where c.nome='Cafeteria' limit 1"],
  ["parcela no cartão", "insert into transacoes (user_id, data, valor, tipo, cartao_id, forma_pagamento, fatura_mes, parcela_num, parcela_total, grupo_parcelas, efetivada) select 'eu', current_date, 100, 'despesa', id, 'credito', '2026-10', 1, 3, gen_random_uuid(), false from cartoes limit 1"],
  ["pagamento de fatura é transferência", "insert into transacoes (user_id, data, valor, tipo, conta_id, forma_pagamento, transferencia, fatura_mes) select 'eu', current_date, 350, 'despesa', id, 'transferencia', true, '2026-10' from contas limit 1"],
  ["orçamento do mês", "insert into orcamentos (user_id, mes, categoria_id, valor_planejado) select 'eu', '2026-09', id, 400 from categorias where nome='Cafeteria' limit 1"],
  ["orçamento repetido faz upsert", "insert into orcamentos (user_id, mes, categoria_id, valor_planejado) select 'eu', '2026-09', id, 500 from categorias where nome='Cafeteria' limit 1 on conflict (user_id, mes, categoria_id) do update set valor_planejado = 500"],
  ["meta financeira", "insert into metas_financeiras (user_id, titulo, valor_alvo, valor_atual, prazo) values ('eu','Reserva de emergência',15000,2000,'2027-06-30')"],
  ["dívida", "insert into dividas (user_id, nome, saldo_atual, juros_mes, parcela_min) values ('eu','Cartão antigo',5000,12,500)"],
  ["forma de pagamento livre é aceita", "insert into transacoes (user_id, data, valor, tipo, forma_pagamento) values ('eu', current_date, 10, 'despesa', 'vale_alimentacao')"],
  ["regra de progressão inválida (deve falhar)", "insert into treino_rotina_exercicios (user_id, rotina_id, exercicio_id, regra_progressao, ordem) select 'eu', r.id, e.id, 'mágica', 9 from treino_rotinas r, exercicios e limit 1"],
  ["sensação fora da escala (deve falhar)", "insert into treino_sessoes (user_id, data, sensacao) values ('eu', current_date - 1, 9)"],
  ["config", "insert into configuracoes (user_id, chave, valor) values ('eu','agua.meta_ml','2800') on conflict (user_id, chave) do update set valor='2800'"],
  ["humor nota inválida (deve falhar)", "insert into humor_log (user_id, data, nota) values ('eu', current_date - 1, 9)"],
  ["tipo de transação inválido (deve falhar)", "insert into transacoes (user_id, data, valor, tipo, categoria) values ('eu', current_date, 10, 'outro', 'x')"],
  ["periodo de hábito inválido (deve falhar)", "insert into habitos (user_id, nome, periodo) values ('eu','x','madrugada')"],
];

console.log("\nInserts:");
for (const [nome, comando] of testes) {
  const deveFalhar = nome.includes("deve falhar") || nome.includes("duplicado");
  try {
    await db.exec(comando);
    console.log(`  ${deveFalhar ? "✗ PASSOU (era pra barrar)" : "ok "} ${nome}`);
    if (deveFalhar) process.exitCode = 1;
  } catch (erro) {
    const curto = erro.message.split("\n")[0].slice(0, 60);
    console.log(`  ${deveFalhar ? "ok  barrado:" : "✗ ERRO:"} ${nome}${deveFalhar ? "" : ` → ${curto}`}`);
    if (!deveFalhar) process.exitCode = 1;
  }
}

// As categorias iniciais vieram no seed?
const cats = await db.query("select count(*)::int as n, count(*) filter (where tipo='receita')::int as r from categorias");
console.log(`\ncategorias iniciais: ${cats.rows[0].n} (${cats.rows[0].r} de receita)`);
if (cats.rows[0].n < 25) process.exitCode = 1;

const contaPadrao = await db.query("select count(*)::int as n from contas");
console.log(`conta inicial criada: ${contaPadrao.rows[0].n > 0 ? "ok" : "✗ nenhuma"}`);

// A biblioteca de exercícios veio no seed?
const exercicios = await db.query("select count(*)::int as n, count(distinct musculo_primario)::int as m from exercicios");
console.log(`\nbiblioteca de exercícios: ${exercicios.rows[0].n} exercícios em ${exercicios.rows[0].m} grupos musculares`);
if (exercicios.rows[0].n < 70) process.exitCode = 1;

// Rodar duas vezes não duplicou a biblioteca?
const antes = exercicios.rows[0].n;
await db.exec(fs.readFileSync("src/modules/treino/seed-exercicios.sql", "utf8"));
const depois = await db.query("select count(*)::int as n from exercicios");
console.log(`seed rodado de novo: ${depois.rows[0].n === antes ? "ok, não duplicou" : `✗ duplicou (${antes} → ${depois.rows[0].n})`}`);
if (depois.rows[0].n !== antes) process.exitCode = 1;

// Confere que o cascade funciona (apagar hábito apaga o log dele)
await db.exec("delete from habitos");
const sobrou = await db.query("select count(*)::int as n from habitos_log");
console.log(`\napagar hábito apagou o log junto: ${sobrou.rows[0].n === 0 ? "ok" : "✗ sobrou " + sobrou.rows[0].n}`);
