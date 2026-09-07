import { getSupabase } from "../../core/supabase.js";
import { hoje } from "../../core/datas.js";

const TABELA = "transacoes";

export async function salvarTransacao(usuario, { valor, tipo, categoria, descricao, telefone = null, data = hoje() }) {
  const { data: registro, error } = await getSupabase()
    .from(TABELA)
    .insert({ user_id: usuario, telefone, data, valor, tipo, categoria, descricao: descricao || null })
    .select()
    .single();

  if (error) throw new Error(`Falha ao salvar transação: ${error.message}`);
  return registro;
}

export async function lancamentos(usuario, { desde = null, limite = 30 } = {}) {
  let consulta = getSupabase()
    .from(TABELA)
    .select("id, data, valor, tipo, categoria, descricao")
    .eq("user_id", usuario)
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (desde) consulta = consulta.gte("data", desde);

  const { data, error } = await consulta;
  if (error) throw new Error(`Falha ao ler lançamentos: ${error.message}`);
  return data;
}

function somar(registros, tipo) {
  return registros.filter((r) => r.tipo === tipo).reduce((total, r) => total + Number(r.valor), 0);
}

export async function resumoDoDia(usuario, data = hoje()) {
  const { data: registros, error } = await getSupabase()
    .from(TABELA)
    .select("valor, tipo")
    .eq("user_id", usuario)
    .eq("data", data);

  if (error) throw new Error(`Falha ao resumir o dia: ${error.message}`);
  return { despesas: somar(registros, "despesa"), receitas: somar(registros, "receita") };
}

export async function resumoDoMes(usuario, data = hoje()) {
  const primeiroDia = `${data.slice(0, 7)}-01`;
  const registros = await lancamentos(usuario, { desde: primeiroDia, limite: 1000 });

  const porCategoria = {};
  for (const r of registros.filter((r) => r.tipo === "despesa")) {
    porCategoria[r.categoria] = (porCategoria[r.categoria] || 0) + Number(r.valor);
  }

  return {
    mes: data.slice(0, 7),
    despesas: somar(registros, "despesa"),
    receitas: somar(registros, "receita"),
    por_categoria: Object.entries(porCategoria)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total),
  };
}
