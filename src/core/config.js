// Configurações que você muda pelo app (meta de água, metas de treino, etc.).
// Guardadas como chave/valor no Supabase para não precisar de deploy a cada ajuste.
import { getSupabase } from "./supabase.js";

export async function lerConfig(usuario, chave, padrao = null) {
  const { data, error } = await getSupabase()
    .from("configuracoes")
    .select("valor")
    .eq("user_id", usuario)
    .eq("chave", chave)
    .maybeSingle();

  if (error) throw new Error(`Falha ao ler configuração ${chave}: ${error.message}`);
  return data ? data.valor : padrao;
}

export async function salvarConfig(usuario, chave, valor) {
  const { error } = await getSupabase()
    .from("configuracoes")
    .upsert({ user_id: usuario, chave, valor: String(valor) }, { onConflict: "user_id,chave" });

  if (error) throw new Error(`Falha ao salvar configuração ${chave}: ${error.message}`);
  return { chave, valor: String(valor) };
}
