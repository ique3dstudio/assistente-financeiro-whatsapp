// Deduplicação de reenvios (offline-first).
//
// Todo registro feito pelo app leva um `origem_id` gerado no celular. Se o
// aparelho estava sem rede, o registro fica numa fila e é reenviado depois —
// e o reenvio pode acontecer duas vezes (rede voltando e caindo, app reaberto).
// Este middleware garante que o segundo envio devolva a mesma resposta do
// primeiro, sem gravar de novo: o clássico "idempotency key" de API de pagamento,
// aplicado a copos de água e séries de treino.
import { getSupabase } from "./supabase.js";

const METODOS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

export async function idempotencia(req, res, next) {
  const origemId = req.body?.origem_id;
  if (!METODOS.has(req.method) || !origemId) return next();

  const supabase = getSupabase();

  try {
    const { data: existente } = await supabase
      .from("sync_idempotencia")
      .select("resposta")
      .eq("user_id", req.usuario)
      .eq("origem_id", origemId)
      .maybeSingle();

    if (existente) {
      res.set("X-Idempotente", "repetido");
      return res.json(existente.resposta ?? { ok: true, repetido: true });
    }
  } catch {
    // Sem a tabela ainda (SQL não rodado), seguimos sem deduplicação.
    return next();
  }

  // Intercepta a resposta para guardá-la junto do origem_id.
  const jsonOriginal = res.json.bind(res);
  res.json = (corpo) => {
    if (res.statusCode < 400) {
      supabase
        .from("sync_idempotencia")
        .insert({ user_id: req.usuario, origem_id: origemId, caminho: req.originalUrl, resposta: corpo })
        .then(() => {}, () => {});
    }
    return jsonOriginal(corpo);
  };

  next();
}
