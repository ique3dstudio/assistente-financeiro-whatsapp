import { getSupabase } from "../../core/supabase.js";
import { hoje, somarDias, ultimosDias } from "../../core/datas.js";
import { sessaoDeHoje } from "../treino/service.js";
import {
  CHECKINS, REFEICOES, alvoDoDia, escalarMacros, minutosDesde, planoParaLista,
  progresso as calcularProgresso, secaoDoItem, somarMacros, sugerirAjuste,
} from "./calculos.js";

const HORA_INICIO_DIA = "05:00:00"; // jejum não conta antes disso (evita "3000h" no primeiro uso)

// ---------- biblioteca de alimentos ----------

export async function buscarAlimentos(usuario, { busca = null, favoritos = false, limite = 30 } = {}) {
  const supabase = getSupabase();

  if (favoritos) {
    const { data, error } = await supabase
      .from("alimentos_favoritos")
      .select("alimento:alimentos(*)")
      .eq("user_id", usuario)
      .order("criado_em", { ascending: false });

    if (error) throw new Error(`Falha ao ler favoritos: ${error.message}`);
    return data.map((linha) => linha.alimento).filter(Boolean);
  }

  let consulta = supabase.from("alimentos").select("*").in("user_id", [usuario, "sistema"]).order("nome").limit(limite);
  if (busca) consulta = consulta.ilike("nome", `%${busca}%`);

  const { data, error } = await consulta;
  if (error) throw new Error(`Falha ao buscar alimentos: ${error.message}`);
  return data;
}

export async function criarAlimento(usuario, dados) {
  if (!dados.nome?.trim()) throw new Error("Dê um nome ao alimento");

  const { data, error } = await getSupabase()
    .from("alimentos")
    .insert({
      user_id: usuario,
      nome: dados.nome.trim(),
      marca: dados.marca || null,
      codigo_barras: dados.codigo_barras || null,
      porcao_padrao_g: Number(dados.porcao_padrao_g) || 100,
      kcal: Number(dados.kcal) || 0,
      proteina_g: Number(dados.proteina_g) || 0,
      carbo_g: Number(dados.carbo_g) || 0,
      gordura_g: Number(dados.gordura_g) || 0,
      fibra_g: dados.fibra_g === undefined || dados.fibra_g === "" ? null : Number(dados.fibra_g),
      sodio_mg: dados.sodio_mg === undefined || dados.sodio_mg === "" ? null : Number(dados.sodio_mg),
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao cadastrar alimento: ${error.message}`);
  return data;
}

// Código de barras: primeiro olha o que já está no seu banco; se não achar,
// tenta o Open Food Facts (catálogo público e gratuito). Se a rede falhar,
// devolve null — a tela cai para o cadastro manual, sem travar o app.
export async function buscarPorCodigoBarras(usuario, codigo) {
  const supabase = getSupabase();

  const { data: local } = await supabase
    .from("alimentos")
    .select("*")
    .in("user_id", [usuario, "sistema"])
    .eq("codigo_barras", codigo)
    .maybeSingle();

  if (local) return { alimento: local, origem: "local" };

  try {
    const resposta = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json`);
    if (!resposta.ok) return { alimento: null, origem: "nao_encontrado" };

    const corpo = await resposta.json();
    if (corpo.status !== 1 || !corpo.product) return { alimento: null, origem: "nao_encontrado" };

    const nutrientes = corpo.product.nutriments || {};
    const encontrado = {
      nome: corpo.product.product_name_pt || corpo.product.product_name || "Produto sem nome",
      marca: corpo.product.brands || null,
      codigo_barras: codigo,
      porcao_padrao_g: 100,
      kcal: Number(nutrientes["energy-kcal_100g"]) || 0,
      proteina_g: Number(nutrientes.proteins_100g) || 0,
      carbo_g: Number(nutrientes.carbohydrates_100g) || 0,
      gordura_g: Number(nutrientes.fat_100g) || 0,
      fibra_g: nutrientes.fiber_100g === undefined ? null : Number(nutrientes.fiber_100g),
      sodio_mg: nutrientes.sodium_100g === undefined ? null : Number(nutrientes.sodium_100g) * 1000,
    };

    return { alimento: encontrado, origem: "open_food_facts" };
  } catch {
    return { alimento: null, origem: "sem_rede" };
  }
}

export async function alternarFavorito(usuario, alimentoId) {
  const supabase = getSupabase();
  const { data: existente } = await supabase
    .from("alimentos_favoritos")
    .select("alimento_id")
    .eq("user_id", usuario)
    .eq("alimento_id", alimentoId)
    .maybeSingle();

  if (existente) {
    await supabase.from("alimentos_favoritos").delete().eq("user_id", usuario).eq("alimento_id", alimentoId);
    return { favorito: false };
  }

  const { error } = await supabase.from("alimentos_favoritos").insert({ user_id: usuario, alimento_id: alimentoId });
  if (error) throw new Error(`Falha ao favoritar: ${error.message}`);
  return { favorito: true };
}

// ---------- refeições salvas ----------

export async function refeicoesSalvas(usuario) {
  const { data, error } = await getSupabase().from("refeicoes_salvas").select("*").eq("user_id", usuario).order("nome");
  if (error) throw new Error(`Falha ao ler refeições salvas: ${error.message}`);
  return data;
}

// Salva a refeição de hoje (já registrada) como um atalho reutilizável.
export async function salvarComoModelo(usuario, { nome, refeicao, itens, macros }) {
  if (!nome?.trim()) throw new Error("Dê um nome para salvar essa refeição");

  const { data, error } = await getSupabase()
    .from("refeicoes_salvas")
    .insert({
      user_id: usuario,
      nome: nome.trim(),
      refeicao_padrao: refeicao || "outro",
      itens: itens || [],
      kcal: macros.kcal,
      proteina_g: macros.proteina_g,
      carbo_g: macros.carbo_g,
      gordura_g: macros.gordura_g,
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao salvar modelo: ${error.message}`);
  return data;
}

export async function excluirModelo(usuario, id) {
  const { error } = await getSupabase().from("refeicoes_salvas").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir: ${error.message}`);
  return { ok: true };
}

// ---------- registro de refeições ----------

export async function registrarAlimento(usuario, { alimento_id, quantidade_g, refeicao = "outro", data = hoje(), hora = null }) {
  const supabase = getSupabase();
  const { data: alimento, error: erroAlimento } = await supabase.from("alimentos").select("*").eq("id", alimento_id).single();
  if (erroAlimento) throw new Error(`Alimento não encontrado: ${erroAlimento.message}`);

  const macros = escalarMacros(alimento, Number(quantidade_g) || alimento.porcao_padrao_g);

  const { data: registro, error } = await supabase
    .from("refeicoes_log")
    .insert({
      user_id: usuario,
      data,
      hora: hora || new Date().toTimeString().slice(0, 8),
      refeicao,
      tipo_registro: "alimento",
      alimento_id,
      quantidade_g: Number(quantidade_g) || alimento.porcao_padrao_g,
      descricao: alimento.nome,
      ...macros,
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar refeição: ${error.message}`);
  return registro;
}

export async function registrarTexto(usuario, { descricao, refeicao = "outro", data = hoje(), macros = {}, foto_url = null }) {
  if (!descricao?.trim() && !foto_url) throw new Error("Descreva a refeição ou anexe uma foto");

  const { data: registro, error } = await getSupabase()
    .from("refeicoes_log")
    .insert({
      user_id: usuario,
      data,
      hora: new Date().toTimeString().slice(0, 8),
      refeicao,
      tipo_registro: foto_url ? "foto" : "texto",
      descricao: descricao?.trim() || null,
      foto_url,
      kcal: Number(macros.kcal) || 0,
      proteina_g: Number(macros.proteina_g) || 0,
      carbo_g: Number(macros.carbo_g) || 0,
      gordura_g: Number(macros.gordura_g) || 0,
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar refeição: ${error.message}`);
  return registro;
}

// Registra tudo de um modelo salvo de uma vez ("café da manhã padrão", 1 toque).
export async function registrarModelo(usuario, modeloId, { data = hoje() } = {}) {
  const supabase = getSupabase();
  const { data: modelo, error } = await supabase.from("refeicoes_salvas").select("*").eq("user_id", usuario).eq("id", modeloId).single();
  if (error) throw new Error(`Modelo não encontrado: ${error.message}`);

  const { data: registro, error: erroInsert } = await supabase
    .from("refeicoes_log")
    .insert({
      user_id: usuario,
      data,
      hora: new Date().toTimeString().slice(0, 8),
      refeicao: modelo.refeicao_padrao,
      tipo_registro: "salva",
      descricao: modelo.nome,
      kcal: modelo.kcal,
      proteina_g: modelo.proteina_g,
      carbo_g: modelo.carbo_g,
      gordura_g: modelo.gordura_g,
    })
    .select()
    .single();

  if (erroInsert) throw new Error(`Falha ao registrar: ${erroInsert.message}`);
  return registro;
}

export async function registrarSensacoes(usuario, id, { energia = null, inchaco = null, sono = null }) {
  const { data, error } = await getSupabase()
    .from("refeicoes_log")
    .update({ sensacao_energia: energia, sensacao_inchaco: inchaco, sensacao_sono: sono })
    .eq("user_id", usuario)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar sensação: ${error.message}`);
  return data;
}

export async function excluirRegistro(usuario, id) {
  const { error } = await getSupabase().from("refeicoes_log").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir: ${error.message}`);
  return { ok: true };
}

export async function refeicoesDoDia(usuario, data = hoje()) {
  const { data: linhas, error } = await getSupabase()
    .from("refeicoes_log")
    .select("*")
    .eq("user_id", usuario)
    .eq("data", data)
    .order("hora");

  if (error) throw new Error(`Falha ao ler refeições: ${error.message}`);
  return linhas;
}

// ---------- modo simples ----------

export async function registrarCheckin(usuario, avaliacao, { nota = null, data = hoje() } = {}) {
  if (!CHECKINS.some((c) => c.id === avaliacao)) throw new Error("Avaliação inválida");

  const { data: registro, error } = await getSupabase()
    .from("dieta_checkins")
    .upsert({ user_id: usuario, data, avaliacao, nota }, { onConflict: "user_id,data" })
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar: ${error.message}`);
  return registro;
}

// ---------- alvos e ajuste adaptativo ----------

export async function alvoAtual(usuario) {
  const { data, error } = await getSupabase()
    .from("dieta_alvos")
    .select("*")
    .eq("user_id", usuario)
    .lte("ativo_em", hoje())
    .order("ativo_em", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao ler o alvo: ${error.message}`);
  return data;
}

export async function definirAlvo(usuario, dados, origem = "manual") {
  const { data, error } = await getSupabase()
    .from("dieta_alvos")
    .insert({
      user_id: usuario,
      kcal_treino: Number(dados.kcal_treino),
      kcal_descanso: Number(dados.kcal_descanso),
      proteina_g: Number(dados.proteina_g),
      carbo_g: Number(dados.carbo_g),
      gordura_g: Number(dados.gordura_g),
      origem,
      ativo_em: dados.ativo_em || hoje(),
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao definir alvo: ${error.message}`);
  return data;
}

// Calcula (sem gravar) a sugestão de ajuste desta semana, a partir do peso
// (lido do módulo Treino) e do consumo real dos últimos 21 dias.
export async function calcularSugestaoAjuste(usuario, { objetivo = "manter", taxaSemanalKg = 0.4 } = {}) {
  const supabase = getSupabase();
  const desde = somarDias(hoje(), -21);

  const [pesosRes, refeicoesRes, alvo] = await Promise.all([
    supabase.from("medidas_corporais").select("data, peso_kg").eq("user_id", usuario).gte("data", desde).not("peso_kg", "is", null).order("data"),
    supabase.from("refeicoes_log").select("data, kcal").eq("user_id", usuario).gte("data", desde),
    alvoAtual(usuario),
  ]);

  if (pesosRes.error) throw new Error(`Falha ao ler peso: ${pesosRes.error.message}`);
  if (refeicoesRes.error) throw new Error(`Falha ao ler refeições: ${refeicoesRes.error.message}`);

  const porDia = {};
  for (const linha of refeicoesRes.data) porDia[linha.data] = (porDia[linha.data] || 0) + Number(linha.kcal);
  const consumos = Object.entries(porDia)
    .map(([data, kcal]) => ({ data, kcal }))
    .sort((a, b) => a.data.localeCompare(b.data));

  const pesos = pesosRes.data.map((p) => ({ data: p.data, kg: Number(p.peso_kg) }));
  const alvoReferencia = alvo ? alvo.kcal_descanso : 2000;

  return sugerirAjuste({ pesos, consumos, alvoAtual: alvoReferencia, objetivo, taxaSemanalKg });
}

export async function salvarSugestaoAjuste(usuario, sugestao) {
  const { error } = await getSupabase()
    .from("dieta_ajustes")
    .upsert(
      {
        user_id: usuario,
        semana_inicio: somarDias(hoje(), -6),
        kcal_anterior: sugestao.kcal_atual,
        kcal_sugerido: sugestao.kcal_sugerido,
        variacao_peso_kg: sugestao.variacao_peso_kg,
        consumo_medio_kcal: sugestao.media_consumo,
        justificativa: sugestao.justificativa,
        aplicado: false,
      },
      { onConflict: "user_id,semana_inicio" }
    );

  if (error) throw new Error(`Falha ao guardar sugestão: ${error.message}`);
  return { ok: true };
}

export async function aplicarAjuste(usuario, sugestao) {
  const atual = await alvoAtual(usuario);
  const diferencaTreino = atual ? Number(atual.kcal_treino) - Number(atual.kcal_descanso) : 400;

  const novo = await definirAlvo(
    usuario,
    {
      kcal_descanso: sugestao.kcal_sugerido,
      kcal_treino: sugestao.kcal_sugerido + diferencaTreino,
      proteina_g: atual?.proteina_g || Math.round(sugestao.kcal_sugerido * 0.3 / 4),
      carbo_g: atual?.carbo_g || Math.round(sugestao.kcal_sugerido * 0.4 / 4),
      gordura_g: atual?.gordura_g || Math.round(sugestao.kcal_sugerido * 0.3 / 9),
    },
    "ajuste_automatico"
  );

  await getSupabase()
    .from("dieta_ajustes")
    .update({ aplicado: true })
    .eq("user_id", usuario)
    .eq("semana_inicio", somarDias(hoje(), -6));

  return novo;
}

// ---------- planejador e lista de compras ----------

export async function planoDaSemana(usuario, inicio = hoje()) {
  const dias = ultimosDias(7, somarDias(inicio, 6));
  const { data, error } = await getSupabase()
    .from("dieta_plano")
    .select("*, alimento:alimentos(nome)")
    .eq("user_id", usuario)
    .gte("data", dias[0])
    .lte("data", dias[dias.length - 1])
    .order("data");

  if (error) throw new Error(`Falha ao ler o plano: ${error.message}`);
  return { dias, itens: data };
}

export async function adicionarAoPlano(usuario, dados) {
  const { data, error } = await getSupabase()
    .from("dieta_plano")
    .insert({
      user_id: usuario,
      data: dados.data,
      refeicao: dados.refeicao || "almoco",
      alimento_id: dados.alimento_id || null,
      descricao: dados.descricao || null,
      quantidade_g: dados.quantidade_g ? Number(dados.quantidade_g) : null,
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao adicionar ao plano: ${error.message}`);
  return data;
}

export async function removerDoPlano(usuario, id) {
  const { error } = await getSupabase().from("dieta_plano").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao remover do plano: ${error.message}`);
  return { ok: true };
}

// Junta o plano da semana e grava a lista de compras (soma quantidades repetidas).
export async function gerarListaDeCompras(usuario, inicio = hoje()) {
  const supabase = getSupabase();
  const { itens } = await planoDaSemana(usuario, inicio);

  const itensComNome = itens.map((item) => ({ ...item, descricao: item.descricao || item.alimento?.nome }));
  const lista = planoParaLista(itensComNome);

  await supabase.from("lista_compras").delete().eq("user_id", usuario).eq("origem_plano", true).eq("comprado", false);

  if (lista.length > 0) {
    const { error } = await supabase.from("lista_compras").insert(
      lista.map((item) => ({ user_id: usuario, item: item.item, secao: item.secao, quantidade: item.quantidade, origem_plano: true }))
    );
    if (error) throw new Error(`Falha ao gerar lista: ${error.message}`);
  }

  return listaDeCompras(usuario);
}

export async function listaDeCompras(usuario) {
  const { data, error } = await getSupabase().from("lista_compras").select("*").eq("user_id", usuario).order("secao").order("item");
  if (error) throw new Error(`Falha ao ler a lista: ${error.message}`);
  return data;
}

export async function adicionarItemLista(usuario, item, secao = null) {
  const { data, error } = await getSupabase()
    .from("lista_compras")
    .insert({ user_id: usuario, item, secao: secao || secaoDoItem(item) })
    .select()
    .single();

  if (error) throw new Error(`Falha ao adicionar item: ${error.message}`);
  return data;
}

export async function marcarComprado(usuario, id, comprado = true) {
  const { error } = await getSupabase().from("lista_compras").update({ comprado }).eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao atualizar item: ${error.message}`);
  return { ok: true };
}

export async function limparComprados(usuario) {
  const { error } = await getSupabase().from("lista_compras").delete().eq("user_id", usuario).eq("comprado", true);
  if (error) throw new Error(`Falha ao limpar a lista: ${error.message}`);
  return { ok: true };
}

// ---------- painel ----------

export async function painel(usuario) {
  const hojeISO = hoje();

  const [refeicoes, sessao, alvo, checkinHoje, salvas] = await Promise.all([
    refeicoesDoDia(usuario, hojeISO),
    sessaoDeHoje(usuario, hojeISO).catch(() => null),
    alvoAtual(usuario),
    getSupabase().from("dieta_checkins").select("*").eq("user_id", usuario).eq("data", hojeISO).maybeSingle(),
    refeicoesSalvas(usuario),
  ]);

  const consumido = somarMacros(refeicoes);
  const alvoHoje = alvoDoDia(alvo, Boolean(sessao));
  const ultimaRefeicao = refeicoes[refeicoes.length - 1] || null;

  return {
    data: hojeISO,
    refeicoes,
    consumido,
    alvo: alvoHoje,
    progresso: calcularProgresso(consumido, alvoHoje),
    checkin_hoje: checkinHoje.data || null,
    checkins: CHECKINS,
    refeicoes_tipos: REFEICOES,
    salvas,
    treinou_hoje: Boolean(sessao),
    jejum: ultimaRefeicao
      ? { desde: `${ultimaRefeicao.data}T${ultimaRefeicao.hora}`, minutos: minutosDesde(`${ultimaRefeicao.data}T${ultimaRefeicao.hora}`) }
      : null,
  };
}

// ---------- correlação (E5.6) ----------

export async function sensacoesXHumor(usuario, dias = 30) {
  const desde = somarDias(hoje(), -dias);
  const supabase = getSupabase();

  const [refeicoesRes, humorRes] = await Promise.all([
    supabase.from("refeicoes_log").select("*").eq("user_id", usuario).gte("data", desde).not("sensacao_energia", "is", null),
    supabase.from("humor_log").select("data, nota").eq("user_id", usuario).gte("data", desde),
  ]);

  if (refeicoesRes.error) throw new Error(`Falha ao ler sensações: ${refeicoesRes.error.message}`);

  const humorPorDia = Object.fromEntries((humorRes.data || []).map((h) => [h.data, h.nota]));

  return refeicoesRes.data
    .map((refeicao) => ({
      id: refeicao.id,
      data: refeicao.data,
      descricao: refeicao.descricao,
      refeicao: refeicao.refeicao,
      energia: refeicao.sensacao_energia,
      inchaco: refeicao.sensacao_inchaco,
      sono: refeicao.sensacao_sono,
      humor_do_dia: humorPorDia[refeicao.data] ?? null,
    }))
    .sort((a, b) => b.data.localeCompare(a.data));
}

// ---------- ganchos do núcleo ----------

export async function resumoDoDia(usuario, data = hoje()) {
  const [refeicoes, alvo, sessao, checkin] = await Promise.all([
    refeicoesDoDia(usuario, data),
    alvoAtual(usuario),
    sessaoDeHoje(usuario, data).catch(() => null),
    getSupabase().from("dieta_checkins").select("*").eq("user_id", usuario).eq("data", data).maybeSingle(),
  ]);

  const consumido = somarMacros(refeicoes);
  const alvoHoje = alvoDoDia(alvo, Boolean(sessao));

  return { consumido, alvo: alvoHoje, checkin: checkin.data || null };
}

export async function metricas(usuario) {
  const dados = await resumoDoDia(usuario);
  return [
    { id: "dieta.kcal_hoje", nome: "Calorias de hoje", valor: Math.round(dados.consumido.kcal) },
    { id: "dieta.proteina_hoje", nome: "Proteína de hoje (g)", valor: Math.round(dados.consumido.proteina_g) },
  ];
}
