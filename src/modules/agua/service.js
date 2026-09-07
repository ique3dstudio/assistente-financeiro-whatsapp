import { getSupabase } from "../../core/supabase.js";
import { lerConfig, salvarConfig } from "../../core/config.js";
import { hoje, ultimosDias } from "../../core/datas.js";

const TABELA = "agua_registros";
const META_PADRAO = 2500;
const CHAVE_META = "agua.meta_ml";

export async function meta(usuario) {
  return Number(await lerConfig(usuario, CHAVE_META, META_PADRAO));
}

export async function definirMeta(usuario, metaMl) {
  const valor = Number(metaMl);
  if (!Number.isFinite(valor) || valor < 100 || valor > 10000) {
    throw new Error("Meta inválida: use um valor entre 100 e 10000 ml");
  }
  await salvarConfig(usuario, CHAVE_META, Math.round(valor));
  return Math.round(valor);
}

export async function registrar(usuario, quantidadeMl, data = hoje()) {
  const ml = Math.round(Number(quantidadeMl));
  if (!Number.isFinite(ml) || ml === 0 || Math.abs(ml) > 5000) {
    throw new Error("Quantidade inválida: informe algo entre 1 e 5000 ml");
  }

  const { data: registro, error } = await getSupabase()
    .from(TABELA)
    .insert({ user_id: usuario, data, quantidade_ml: ml })
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar água: ${error.message}`);
  return registro;
}

export async function desfazerUltimo(usuario, data = hoje()) {
  const supabase = getSupabase();

  const { data: ultimo, error: erroBusca } = await supabase
    .from(TABELA)
    .select("id, quantidade_ml")
    .eq("user_id", usuario)
    .eq("data", data)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroBusca) throw new Error(`Falha ao buscar último registro: ${erroBusca.message}`);
  if (!ultimo) return null;

  const { error } = await supabase.from(TABELA).delete().eq("id", ultimo.id);
  if (error) throw new Error(`Falha ao desfazer registro: ${error.message}`);

  return ultimo;
}

// Soma por dia, para um intervalo de datas. Devolve { "2026-09-07": 1750, ... }
export async function totaisPorDia(usuario, datas) {
  if (datas.length === 0) return {};

  const { data: registros, error } = await getSupabase()
    .from(TABELA)
    .select("data, quantidade_ml")
    .eq("user_id", usuario)
    .gte("data", datas[0])
    .lte("data", datas[datas.length - 1]);

  if (error) throw new Error(`Falha ao ler registros de água: ${error.message}`);

  const totais = Object.fromEntries(datas.map((d) => [d, 0]));
  for (const { data, quantidade_ml } of registros) {
    if (data in totais) totais[data] += quantidade_ml;
  }
  return totais;
}

export async function totalDoDia(usuario, data = hoje()) {
  const totais = await totaisPorDia(usuario, [data]);
  return totais[data] ?? 0;
}

// Dias seguidos batendo a meta, contando de trás para frente.
// O dia de hoje só entra na conta se a meta já foi batida — assim a sequência
// não "quebra" só porque o dia começou.
export function calcularSequencia(totais, datas, metaMl) {
  let sequencia = 0;
  for (let i = datas.length - 1; i >= 0; i--) {
    const bateu = (totais[datas[i]] ?? 0) >= metaMl;
    if (bateu) sequencia++;
    else if (i === datas.length - 1) continue; // hoje ainda em andamento
    else break;
  }
  return sequencia;
}

export async function panorama(usuario, dias = 14) {
  const datas = ultimosDias(dias);
  const [totais, metaMl] = await Promise.all([totaisPorDia(usuario, datas), meta(usuario)]);
  const data = datas[datas.length - 1];
  const total = totais[data] ?? 0;

  return {
    data,
    total,
    meta: metaMl,
    progresso: Math.min(1, metaMl > 0 ? total / metaMl : 0),
    sequencia: calcularSequencia(totais, datas, metaMl),
    historico: datas.map((d) => ({ data: d, total: totais[d] ?? 0, bateu: (totais[d] ?? 0) >= metaMl })),
  };
}
