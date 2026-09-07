// Cliente único do Supabase, compartilhado por todos os módulos.
// Usa a service_role key: só pode rodar no servidor, nunca no navegador.
import { createClient } from "@supabase/supabase-js";

let client;

export function getSupabase() {
  if (!client) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error("SUPABASE_URL e SUPABASE_SERVICE_KEY precisam estar no .env");
    }
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return client;
}
