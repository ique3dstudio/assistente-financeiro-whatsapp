import { getSupabase } from "../../core/supabase.js";
import { hoje, ultimosDias } from "../../core/datas.js";

export const HUMORES = [
  { nota: 1, emoji: "😞", nome: "Péssimo" },
  { nota: 2, emoji: "🙁", nome: "Ruim" },
  { nota: 3, emoji: "😐", nome: "Normal" },
  { nota: 4, emoji: "🙂", nome: "Bom" },
  { nota: 5, emoji: "😄", nome: "Ótimo" },
];

export const EMOCOES = ["calmo", "ansioso", "animado", "cansado", "irritado", "grato", "triste", "focado", "sozinho", "orgulhoso"];
export const FATORES = ["sono", "treino", "trabalho", "dinheiro", "pessoas", "saúde", "comida", "clima"];

export async function salvarHumor(usuario, { nota, emocoes = [], fatores = [], texto = null, data = hoje() }) {
  const valor = Number(nota);
  if (!Number.isInteger(valor) || valor < 1 || valor > 5) throw new Error("Humor deve ser de 1 a 5");

  const { data: registro, error } = await getSupabase()
    .from("humor_log")
    .upsert(
      { user_id: usuario, data, nota: valor, emocoes, fatores, texto },
      { onConflict: "user_id,data" }
    )
    .select()
    .single();

  if (error) throw new Error(`Falha ao salvar humor: ${error.message}`);
  return registro;
}

export async function anotar(usuario, { tipo = "nota", conteudo, data = hoje() }) {
  if (!conteudo?.trim()) throw new Error("Escreva algo antes de salvar");

  const { data: registro, error } = await getSupabase()
    .from("diario")
    .insert({ user_id: usuario, data, tipo, conteudo: conteudo.trim() })
    .select()
    .single();

  if (error) throw new Error(`Falha ao salvar no diário: ${error.message}`);
  return registro;
}

export async function excluirAnotacao(usuario, id) {
  const { error } = await getSupabase().from("diario").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir anotação: ${error.message}`);
  return { ok: true };
}

export async function doDia(usuario, data = hoje()) {
  const supabase = getSupabase();

  const [humorRes, diarioRes] = await Promise.all([
    supabase.from("humor_log").select("*").eq("user_id", usuario).eq("data", data).maybeSingle(),
    supabase.from("diario").select("*").eq("user_id", usuario).eq("data", data).order("criado_em"),
  ]);

  if (humorRes.error) throw new Error(`Falha ao ler humor: ${humorRes.error.message}`);
  if (diarioRes.error) throw new Error(`Falha ao ler diário: ${diarioRes.error.message}`);

  return { data, humor: humorRes.data, anotacoes: diarioRes.data };
}

export async function historico(usuario, dias = 30) {
  const datas = ultimosDias(dias);
  const supabase = getSupabase();

  const [humorRes, diarioRes] = await Promise.all([
    supabase.from("humor_log").select("*").eq("user_id", usuario).gte("data", datas[0]).order("data", { ascending: false }),
    supabase.from("diario").select("*").eq("user_id", usuario).gte("data", datas[0]).order("criado_em", { ascending: false }),
  ]);

  if (humorRes.error) throw new Error(`Falha ao ler humor: ${humorRes.error.message}`);
  if (diarioRes.error) throw new Error(`Falha ao ler diário: ${diarioRes.error.message}`);

  const notas = humorRes.data.map((h) => h.nota);
  const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;

  return {
    humores: humorRes.data,
    anotacoes: diarioRes.data,
    media_humor: media,
    dias_registrados: humorRes.data.length,
    humores_opcoes: HUMORES,
    emocoes_opcoes: EMOCOES,
    fatores_opcoes: FATORES,
    linha: datas.map((data) => ({ data, nota: humorRes.data.find((h) => h.data === data)?.nota ?? null })),
  };
}
