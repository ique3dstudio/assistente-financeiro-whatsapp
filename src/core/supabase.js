// Cliente único do Supabase, compartilhado por todos os módulos.
// Usa a service_role key: só pode rodar no servidor, nunca no navegador.
import { createClient } from "@supabase/supabase-js";

let client;

// A URL costuma ser colada com barra no fim ou já com "/rest/v1" — o cliente
// acrescenta esse caminho por conta própria, e o endereço duplicado faz o
// Supabase responder "Invalid path specified in request URL". Normalizamos aqui.
export function normalizarUrl(valor) {
  const url = String(valor || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/, "");

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
    throw new Error(
      `SUPABASE_URL inválida ("${valor}"). O formato certo é https://SEU-PROJETO.supabase.co, sem barra no fim.`
    );
  }
  return url;
}

export function getSupabase() {
  if (!client) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error("SUPABASE_URL e SUPABASE_SERVICE_KEY precisam estar no .env");
    }
    client = createClient(normalizarUrl(process.env.SUPABASE_URL), process.env.SUPABASE_SERVICE_KEY.trim());
  }
  return client;
}
