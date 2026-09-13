// O painel do Supabase mostra o "Project URL" e, logo abaixo, endpoints já com caminho
// (.../rest/v1/). Colar o segundo faz o supabase-js montar ".../rest/v1/auth/v1/token",
// que o gateway recusa com 404 "Invalid path specified in request URL".
export function supabaseUrl() {
  const bruto = (process.env.SUPABASE_URL || "").trim();
  if (!bruto) return "";
  try {
    return new URL(bruto).origin;
  } catch {
    return bruto.replace(/\/+$/, "");
  }
}
