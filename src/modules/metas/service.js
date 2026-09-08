import { getSupabase } from "../../core/supabase.js";
import { hoje } from "../../core/datas.js";
import { mapaDeMetricas } from "../../core/metricas.js";
import { AREAS, HORIZONTES, estaOrfa, progresso, ritmoNecessario, situacao } from "./regras.js";

const CAMPOS = [
  "titulo",
  "horizonte",
  "area",
  "metrica",
  "unidade",
  "valor_inicial",
  "valor_alvo",
  "valor_atual",
  "metrica_id",
  "prazo",
  "motivo",
  "parent_id",
];

function limpar(dados) {
  const limpos = Object.fromEntries(Object.entries(dados).filter(([chave]) => CAMPOS.includes(chave)));

  for (const numero of ["valor_inicial", "valor_alvo", "valor_atual"]) {
    if (limpos[numero] === "" || limpos[numero] === undefined) delete limpos[numero];
    else if (limpos[numero] !== null) limpos[numero] = Number(limpos[numero]);
  }
  for (const texto of ["prazo", "metrica_id", "parent_id", "unidade", "motivo", "metrica"]) {
    if (limpos[texto] === "") limpos[texto] = null;
  }
  return limpos;
}

function validar(dados) {
  if (!dados.titulo?.trim()) throw new Error("A meta precisa de um título");
  if (dados.horizonte && !HORIZONTES.some((h) => h.id === dados.horizonte)) throw new Error("Horizonte inválido");
  if (dados.area && !AREAS.some((a) => a.id === dados.area)) throw new Error("Área inválida");
}

export async function criar(usuario, dados) {
  validar(dados);

  const { data, error } = await getSupabase()
    .from("metas")
    .insert({ user_id: usuario, ...limpar(dados) })
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar meta: ${error.message}`);
  return data;
}

export async function atualizar(usuario, id, dados) {
  if (dados.titulo !== undefined) validar(dados);

  const { data, error } = await getSupabase()
    .from("metas")
    .update({ ...limpar(dados), atualizado_em: new Date().toISOString() })
    .eq("user_id", usuario)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar meta: ${error.message}`);
  return data;
}

export async function excluir(usuario, id) {
  const { error } = await getSupabase().from("metas").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir meta: ${error.message}`);
  return { ok: true };
}

export async function concluir(usuario, id, concluida = true) {
  const { data, error } = await getSupabase()
    .from("metas")
    .update({ concluida_em: concluida ? hoje() : null, atualizado_em: new Date().toISOString() })
    .eq("user_id", usuario)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao concluir meta: ${error.message}`);
  return data;
}

export async function painel(usuario) {
  const supabase = getSupabase();
  const hojeISO = hoje();

  const [metasRes, marcosRes, vinculosRes, metricas] = await Promise.all([
    supabase.from("metas").select("*").eq("user_id", usuario).order("horizonte").order("criado_em"),
    supabase.from("metas_marcos").select("*").eq("user_id", usuario).order("ordem"),
    supabase.from("metas_vinculos").select("meta_id, tipo, referencia_id").eq("user_id", usuario),
    mapaDeMetricas(usuario),
  ]);

  for (const resposta of [metasRes, marcosRes, vinculosRes]) {
    if (resposta.error) throw new Error(`Falha ao ler metas: ${resposta.error.message}`);
  }

  const metas = metasRes.data.map((meta) => {
    const vinculada = meta.metrica_id ? metricas.get(meta.metrica_id) : null;
    const valorAtual = vinculada ? Number(vinculada.valor) : Number(meta.valor_atual || 0);
    const completa = {
      ...meta,
      valor_atual: valorAtual,
      valor_alvo: meta.valor_alvo === null ? null : Number(meta.valor_alvo),
      valor_inicial: Number(meta.valor_inicial || 0),
      metrica_nome: vinculada?.nome || meta.metrica || null,
      automatica: Boolean(vinculada),
      marcos: marcosRes.data.filter((m) => m.meta_id === meta.id),
      vinculos: vinculosRes.data.filter((v) => v.meta_id === meta.id).length,
    };

    return {
      ...completa,
      progresso: progresso(completa),
      ritmo: ritmoNecessario(completa, hojeISO),
      situacao: situacao(completa, hojeISO),
      orfa: estaOrfa(completa, hojeISO),
    };
  });

  return {
    data: hojeISO,
    horizontes: HORIZONTES.map((h) => ({ ...h, metas: metas.filter((m) => m.horizonte === h.id) })),
    areas: AREAS,
    metricas: [...metricas.values()],
    total: metas.length,
    concluidas: metas.filter((m) => m.concluida_em).length,
    orfas: metas.filter((m) => m.orfa).length,
  };
}

export async function criarMarco(usuario, metaId, { titulo, data_alvo = null, ordem = 0 }) {
  if (!titulo?.trim()) throw new Error("O marco precisa de um título");

  const { data, error } = await getSupabase()
    .from("metas_marcos")
    .insert({ user_id: usuario, meta_id: metaId, titulo: titulo.trim(), data_alvo, ordem })
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar marco: ${error.message}`);
  return data;
}

export async function marcarMarco(usuario, marcoId, concluido = true, reflexao = null) {
  const { data, error } = await getSupabase()
    .from("metas_marcos")
    .update({ concluido_em: concluido ? hoje() : null, reflexao })
    .eq("user_id", usuario)
    .eq("id", marcoId)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar marco: ${error.message}`);
  return data;
}

export async function excluirMarco(usuario, marcoId) {
  const { error } = await getSupabase().from("metas_marcos").delete().eq("user_id", usuario).eq("id", marcoId);
  if (error) throw new Error(`Falha ao excluir marco: ${error.message}`);
  return { ok: true };
}

export async function vincular(usuario, metaId, tipo, referenciaId) {
  const { error } = await getSupabase()
    .from("metas_vinculos")
    .upsert({ user_id: usuario, meta_id: metaId, tipo, referencia_id: referenciaId }, { onConflict: "meta_id,tipo,referencia_id" });

  if (error) throw new Error(`Falha ao vincular: ${error.message}`);
  return { ok: true };
}

export async function desvincular(usuario, metaId, tipo, referenciaId) {
  const { error } = await getSupabase()
    .from("metas_vinculos")
    .delete()
    .eq("user_id", usuario)
    .eq("meta_id", metaId)
    .eq("tipo", tipo)
    .eq("referencia_id", referenciaId);

  if (error) throw new Error(`Falha ao desvincular: ${error.message}`);
  return { ok: true };
}
