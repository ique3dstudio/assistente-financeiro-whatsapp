import { getSupabase } from "../../core/supabase.js";
import { hoje, somarDias, ultimosDias } from "../../core/datas.js";
import { inicioDaSemana } from "../habitos/regras.js";

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

// ---------- revisão semanal guiada (E5.5) ----------

// As 5 perguntas da revisão de domingo — ficam vazias se você pular a semana,
// não acumulam como pendência.
export const PERGUNTAS_REVISAO = [
  { campo: "vitorias", pergunta: "O que deu certo essa semana?" },
  { campo: "travas", pergunta: "O que travou ou ficou pelo caminho?" },
  { campo: "aprendizado", pergunta: "O que essa semana ensinou?" },
  { campo: "foco_semana", pergunta: "Qual é o foco da próxima semana?" },
];

export async function salvarRevisao(usuario, { semana_inicio, vitorias = null, travas = null, aprendizado = null, foco_semana = null }) {
  const inicio = semana_inicio || inicioDaSemana(hoje());

  const { data, error } = await getSupabase()
    .from("revisoes")
    .upsert({ user_id: usuario, semana_inicio: inicio, vitorias, travas, aprendizado, foco_semana }, { onConflict: "user_id,semana_inicio" })
    .select()
    .single();

  if (error) throw new Error(`Falha ao salvar a revisão: ${error.message}`);
  return data;
}

export async function revisoesRecentes(usuario, quantidade = 12) {
  const { data, error } = await getSupabase()
    .from("revisoes")
    .select("*")
    .eq("user_id", usuario)
    .order("semana_inicio", { ascending: false })
    .limit(quantidade);

  if (error) throw new Error(`Falha ao ler revisões: ${error.message}`);
  return data;
}

export async function revisaoDaSemana(usuario, semanaInicio = inicioDaSemana(hoje())) {
  const { data, error } = await getSupabase()
    .from("revisoes")
    .select("*")
    .eq("user_id", usuario)
    .eq("semana_inicio", semanaInicio)
    .maybeSingle();

  if (error) throw new Error(`Falha ao ler a revisão: ${error.message}`);
  return data;
}

// ---------- linha do tempo da vida ----------

// "Um ano atrás você...": junta o que foi escrito e o humor no mesmo dia,
// em anos anteriores.
export async function umAnoAtras(usuario, dataReferencia = hoje()) {
  const supabase = getSupabase();
  const [ano, mes, dia] = dataReferencia.split("-");
  const datasPassadas = [1, 2, 3].map((anos) => `${Number(ano) - anos}-${mes}-${dia}`);

  const [diarioRes, humorRes] = await Promise.all([
    supabase.from("diario").select("*").eq("user_id", usuario).in("data", datasPassadas).order("data", { ascending: false }),
    supabase.from("humor_log").select("*").eq("user_id", usuario).in("data", datasPassadas),
  ]);

  if (diarioRes.error) throw new Error(`Falha ao buscar o passado: ${diarioRes.error.message}`);

  const humorPorData = Object.fromEntries((humorRes.data || []).map((h) => [h.data, h]));

  return datasPassadas
    .map((data) => ({
      data,
      anos_atras: Number(ano) - Number(data.slice(0, 4)),
      anotacoes: (diarioRes.data || []).filter((a) => a.data === data),
      humor: humorPorData[data] || null,
    }))
    .filter((entrada) => entrada.anotacoes.length > 0 || entrada.humor);
}

// Marco na linha do tempo: reaproveita a tabela diario com tipo 'marco'.
export async function marcarMomento(usuario, { conteudo, data = hoje(), foto_url = null }) {
  if (!conteudo?.trim()) throw new Error("Escreva o que aconteceu");

  const { data: registro, error } = await getSupabase()
    .from("diario")
    .insert({ user_id: usuario, data, tipo: "marco", conteudo: conteudo.trim(), foto_url })
    .select()
    .single();

  if (error) throw new Error(`Falha ao guardar o marco: ${error.message}`);
  return registro;
}

export async function linhaDoTempo(usuario, limite = 50) {
  const { data, error } = await getSupabase()
    .from("diario")
    .select("*")
    .eq("user_id", usuario)
    .in("tipo", ["marco", "gratidao"])
    .order("data", { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Falha ao ler a linha do tempo: ${error.message}`);
  return data;
}
