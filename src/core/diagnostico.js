// Checagem rápida de conexão com o banco: diz, tabela por tabela, se o servidor
// consegue ler. Serve para separar "tabela não criada" de "chave/URL errada".
import { getSupabase } from "./supabase.js";

const TABELAS = ["configuracoes", "agua_registros", "transacoes"];

export async function diagnosticar() {
  const configurado = {
    SUPABASE_URL: process.env.SUPABASE_URL ? "preenchida" : "FALTANDO",
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? "preenchida" : "FALTANDO",
    APP_SENHA: process.env.APP_SENHA ? "preenchida" : "FALTANDO",
    APP_SECRET: process.env.APP_SECRET ? "preenchida" : "FALTANDO",
    projeto: (process.env.SUPABASE_URL || "").replace(/^https?:\/\//, "").split(".")[0] || null,
  };

  const tabelas = {};
  for (const tabela of TABELAS) {
    try {
      const { error } = await getSupabase().from(tabela).select("*", { count: "exact", head: true });
      tabelas[tabela] = error ? `erro: ${error.message}` : "ok";
    } catch (erro) {
      tabelas[tabela] = `erro: ${erro.message}`;
    }
  }

  return { configurado, tabelas };
}
