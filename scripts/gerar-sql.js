// Junta o SQL do núcleo e de todos os módulos num arquivo só, na ordem certa:
//   node scripts/gerar-sql.js
// Roda depois de criar ou mudar qualquer schema.sql — assim db/RODAR-TUDO.sql
// nunca fica desatualizado em relação ao código.
import fs from "node:fs";
import path from "node:path";

// A ordem importa: quem tem referência (foreign key) vem depois de quem é referenciado.
const PARTES = [
  ["NÚCLEO", "db/00-core.sql"],
  ["MÓDULO: ROTINA E HÁBITOS", "src/modules/habitos/schema.sql"],
  ["MÓDULO: ÁGUA", "src/modules/agua/schema.sql"],
  ["MÓDULO: METAS", "src/modules/metas/schema.sql"],
  ["MÓDULO: AGENDA E TAREFAS", "src/modules/agenda/schema.sql"],
  ["MÓDULO: DIÁRIO E HUMOR", "src/modules/diario/schema.sql"],
  ["MÓDULO: TREINO", "src/modules/treino/schema.sql"],
  ["MÓDULO: TREINO — BIBLIOTECA DE EXERCÍCIOS", "src/modules/treino/seed-exercicios.sql"],
  ["MÓDULO: SAÚDE", "src/modules/saude/schema.sql"],
  ["MÓDULO: VÍCIOS E CONTROLE DE IMPULSOS", "src/modules/vicios/schema.sql"],
  ["MÓDULO: FINANÇAS", "src/modules/financas/schema.sql"],
  ["MÓDULO: FINANÇAS — CATEGORIAS INICIAIS", "src/modules/financas/seed-categorias.sql"],
];

const cabecalho = `-- Life OS — banco completo (núcleo + todos os módulos já construídos).
--
-- COMO USAR: cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- Pode rodar quantas vezes quiser: tudo é "create if not exists" / "add column if
-- not exists", então nada é apagado, duplicado ou sobrescrito.
--
-- Gerado por scripts/gerar-sql.js — não edite à mão; edite o schema.sql do módulo.
`;

// Tira o comentário de cabeçalho de cada arquivo: quem manda é o cabeçalho daqui.
function corpo(caminho) {
  const linhas = fs.readFileSync(caminho, "utf8").split("\n");
  while (linhas.length && (linhas[0].startsWith("--") || linhas[0].trim() === "")) linhas.shift();
  return linhas.join("\n").trim();
}

const partes = PARTES.filter(([, caminho]) => fs.existsSync(caminho)).map(
  ([titulo, caminho]) => `-- ${"=".repeat(6)} ${titulo} ${"=".repeat(6)}\n\n${corpo(caminho)}`
);

const destino = "db/RODAR-TUDO.sql";
fs.writeFileSync(destino, `${cabecalho}\n${partes.join("\n\n")}\n`);

const tabelas = fs.readFileSync(destino, "utf8").match(/create table if not exists (\w+)/g) || [];
console.log(`${destino}: ${partes.length} partes, ${tabelas.length} tabelas`);
console.log(tabelas.map((t) => `  - ${t.replace("create table if not exists ", "")}`).join("\n"));
