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

// Confere que o cascade funciona (apagar hábito apaga o log dele)
await db.exec("delete from habitos");
const sobrou = await db.query("select count(*)::int as n from habitos_log");
console.log(`\napagar hábito apagou o log junto: ${sobrou.rows[0].n === 0 ? "ok" : "✗ sobrou " + sobrou.rows[0].n}`);
