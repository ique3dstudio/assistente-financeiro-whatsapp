import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./supabase-url.js";

let client;
function getClient() {
  if (!client) {
    client = createClient(supabaseUrl(), process.env.SUPABASE_SERVICE_KEY);
  }
  return client;
}

export async function salvarTransacao(telefone, { valor, tipo, categoria, descricao }) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from("transacoes")
    .insert({ telefone, valor, tipo, categoria, descricao })
    .select()
    .single();

  if (error) {
    throw new Error(`Falha ao salvar transação: ${error.message}`);
  }

  return data;
}
