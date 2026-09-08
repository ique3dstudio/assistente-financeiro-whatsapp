import { getSupabase } from "../../core/supabase.js";
import { lerConfig, salvarConfig } from "../../core/config.js";
import { lerPerfil } from "../../core/perfil.js";
import { hoje, horaAgora, ultimosDias } from "../../core/datas.js";
import { BEBIDAS, esperadoAte, fatorDaBebida, metaPorPeso } from "./bebidas.js";

const TABELA = "agua_registros";
const CHAVE_META = "agua.meta_ml";

const RECIPIENTES_PADRAO = [
  { nome: "Copo", volume_ml: 200, bebida: "agua", emoji: "🥛", ordem: 0 },
  { nome: "Caneca", volume_ml: 300, bebida: "agua", emoji: "🍶", ordem: 1 },
  { nome: "Garrafa", volume_ml: 500, bebida: "agua", emoji: "💧", ordem: 2 },
  { nome: "Garrafão", volume_ml: 750, bebida: "agua", emoji: "🫙", ordem: 3 },
];

export async function meta(usuario) {
  const [manual, perfil] = await Promise.all([lerConfig(usuario, CHAVE_META, null), lerPerfil(usuario)]);
  if (manual) return Number(manual);
  return metaPorPeso(perfil.peso_kg ? Number(perfil.peso_kg) : null);
}

export async function definirMeta(usuario, metaMl) {
  const valor = Number(metaMl);
  if (!Number.isFinite(valor) || valor < 100 || valor > 10000) {
    throw new Error("Meta inválida: use um valor entre 100 e 10000 ml");
  }
  await salvarConfig(usuario, CHAVE_META, Math.round(valor));
  return Math.round(valor);
}

// Volta a usar o cálculo por peso.
export async function metaAutomatica(usuario) {
  await salvarConfig(usuario, CHAVE_META, "");
  return meta(usuario);
}

export async function registrar(usuario, quantidadeMl, bebida = "agua", data = hoje()) {
  const ml = Math.round(Number(quantidadeMl));
  if (!Number.isFinite(ml) || ml === 0 || Math.abs(ml) > 5000) {
    throw new Error("Quantidade inválida: informe algo entre 1 e 5000 ml");
  }
  if (!BEBIDAS[bebida]) throw new Error("Bebida desconhecida");

  const { data: registro, error } = await getSupabase()
    .from(TABELA)
    .insert({ user_id: usuario, data, quantidade_ml: ml, bebida, fator: fatorDaBebida(bebida) })
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar água: ${error.message}`);
  return registro;
}

export async function desfazerUltimo(usuario, data = hoje()) {
  const supabase = getSupabase();

  const { data: ultimo, error: erroBusca } = await supabase
    .from(TABELA)
    .select("id, quantidade_ml, bebida")
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

// Devolve, por dia: volume bruto e hidratação de verdade (já com o fator).
export async function totaisPorDia(usuario, datas) {
  if (datas.length === 0) return {};

  const { data: registros, error } = await getSupabase()
    .from(TABELA)
    .select("data, quantidade_ml, fator")
    .eq("user_id", usuario)
    .gte("data", datas[0])
    .lte("data", datas[datas.length - 1]);

  if (error) throw new Error(`Falha ao ler registros de água: ${error.message}`);

  const totais = Object.fromEntries(datas.map((d) => [d, { bruto: 0, hidratacao: 0 }]));
  for (const { data, quantidade_ml, fator } of registros) {
    if (!(data in totais)) continue;
    totais[data].bruto += quantidade_ml;
    totais[data].hidratacao += Math.round(quantidade_ml * Number(fator ?? 1));
  }
  return totais;
}

export async function totalDoDia(usuario, data = hoje()) {
  const totais = await totaisPorDia(usuario, [data]);
  return totais[data]?.hidratacao ?? 0;
}

export function calcularSequencia(totais, datas, metaMl) {
  let sequencia = 0;
  for (let i = datas.length - 1; i >= 0; i--) {
    const bateu = (totais[datas[i]]?.hidratacao ?? 0) >= metaMl;
    if (bateu) sequencia++;
    else if (i === datas.length - 1) continue; // hoje ainda em andamento
    else break;
  }
  return sequencia;
}

export async function recipientes(usuario) {
  const { data, error } = await getSupabase()
    .from("agua_recipientes")
    .select("*")
    .eq("user_id", usuario)
    .order("ordem");

  if (error) throw new Error(`Falha ao ler recipientes: ${error.message}`);
  if (data.length > 0) return data;

  // Primeira vez: cria os quatro padrão para o app não abrir vazio.
  const { data: criados, error: erroCriar } = await getSupabase()
    .from("agua_recipientes")
    .insert(RECIPIENTES_PADRAO.map((r) => ({ ...r, user_id: usuario })))
    .select();

  if (erroCriar) return RECIPIENTES_PADRAO.map((r, i) => ({ id: `padrao-${i}`, ...r }));
  return criados;
}

export async function criarRecipiente(usuario, { nome, volume_ml, bebida = "agua", emoji = "🥤" }) {
  if (!nome?.trim()) throw new Error("Dê um nome ao recipiente");
  const volume = Math.round(Number(volume_ml));
  if (!Number.isFinite(volume) || volume < 10 || volume > 5000) throw new Error("Volume inválido");
  if (!BEBIDAS[bebida]) throw new Error("Bebida desconhecida");

  const { data, error } = await getSupabase()
    .from("agua_recipientes")
    .insert({ user_id: usuario, nome: nome.trim(), volume_ml: volume, bebida, emoji, ordem: 99 })
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar recipiente: ${error.message}`);
  return data;
}

export async function excluirRecipiente(usuario, id) {
  const { error } = await getSupabase().from("agua_recipientes").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir recipiente: ${error.message}`);
  return { ok: true };
}

export async function panorama(usuario, dias = 14) {
  const datas = ultimosDias(dias);
  const [totais, metaMl, listaRecipientes] = await Promise.all([
    totaisPorDia(usuario, datas),
    meta(usuario),
    recipientes(usuario).catch(() => RECIPIENTES_PADRAO),
  ]);

  const data = datas[datas.length - 1];
  const doDia = totais[data] || { bruto: 0, hidratacao: 0 };
  const hora = horaAgora();
  const esperado = esperadoAte(hora, metaMl);

  return {
    data,
    total: doDia.hidratacao,
    bruto: doDia.bruto,
    meta: metaMl,
    progresso: Math.min(1, metaMl > 0 ? doDia.hidratacao / metaMl : 0),
    esperado_agora: esperado,
    atraso: Math.max(0, esperado - doDia.hidratacao),
    sequencia: calcularSequencia(totais, datas, metaMl),
    recipientes: listaRecipientes,
    bebidas: BEBIDAS,
    historico: datas.map((d) => ({
      data: d,
      total: totais[d]?.hidratacao ?? 0,
      bateu: (totais[d]?.hidratacao ?? 0) >= metaMl,
    })),
  };
}
