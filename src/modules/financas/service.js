import { getSupabase } from "../../core/supabase.js";
import { hoje, somarDias } from "../../core/datas.js";
import { diaSemana } from "../habitos/regras.js";
import {
  FORMAS, comprometimento, consumoOrcamento, dataNoMes, diasNoMes, faturaDaCompra, foraDoPadrao,
  mesDe, ocorrenciasRecorrente, parcelar, planoQuitacao, projecaoDoMes, regra502030, somarMeses,
} from "./calculos.js";

const T = "transacoes";

// ---------- cadastros ----------

export async function contas(usuario) {
  const supabase = getSupabase();

  const [contasRes, movimentoRes] = await Promise.all([
    supabase.from("contas").select("*").eq("user_id", usuario).eq("arquivada", false).order("ordem"),
    supabase.from(T).select("conta_id, valor, tipo").eq("user_id", usuario).eq("efetivada", true).not("conta_id", "is", null),
  ]);

  if (contasRes.error) throw new Error(`Falha ao ler contas: ${contasRes.error.message}`);
  if (movimentoRes.error) throw new Error(`Falha ao ler movimento das contas: ${movimentoRes.error.message}`);

  return contasRes.data.map((conta) => {
    const movimento = movimentoRes.data
      .filter((m) => m.conta_id === conta.id)
      .reduce((total, m) => total + (m.tipo === "receita" ? Number(m.valor) : -Number(m.valor)), 0);

    return { ...conta, saldo: Number((Number(conta.saldo_inicial) + movimento).toFixed(2)) };
  });
}

export async function categorias(usuario, tipo = null) {
  let consulta = getSupabase()
    .from("categorias")
    .select("*")
    .eq("user_id", usuario)
    .eq("arquivada", false)
    .order("ordem")
    .order("nome");

  if (tipo) consulta = consulta.eq("tipo", tipo);

  const { data, error } = await consulta;
  if (error) throw new Error(`Falha ao ler categorias: ${error.message}`);
  return data;
}

export async function cartoes(usuario) {
  const supabase = getSupabase();
  const mesAtual = mesDe(hoje());

  const [cartoesRes, comprasRes] = await Promise.all([
    supabase.from("cartoes").select("*").eq("user_id", usuario).eq("ativo", true).order("nome"),
    supabase.from(T).select("cartao_id, valor, tipo, fatura_mes, transferencia").eq("user_id", usuario).not("cartao_id", "is", null),
  ]);

  if (cartoesRes.error) throw new Error(`Falha ao ler cartões: ${cartoesRes.error.message}`);
  if (comprasRes.error) throw new Error(`Falha ao ler compras do cartão: ${comprasRes.error.message}`);

  return cartoesRes.data.map((cartao) => {
    const doCartao = comprasRes.data.filter((c) => c.cartao_id === cartao.id);
    const somaMes = (mes) =>
      doCartao
        .filter((c) => c.fatura_mes === mes && !c.transferencia && c.tipo === "despesa")
        .reduce((total, c) => total + Number(c.valor), 0);

    const pagoMes = (mes) =>
      doCartao
        .filter((c) => c.fatura_mes === mes && c.transferencia)
        .reduce((total, c) => total + Number(c.valor), 0);

    const futuras = doCartao
      .filter((c) => c.fatura_mes > mesAtual && !c.transferencia && c.tipo === "despesa")
      .reduce((total, c) => total + Number(c.valor), 0);

    const atual = somaMes(mesAtual);

    return {
      ...cartao,
      fatura_atual: { mes: mesAtual, total: Number(atual.toFixed(2)), pago: Number(pagoMes(mesAtual).toFixed(2)), vencimento: dataNoMes(mesAtual, cartao.vencimento) },
      fatura_proxima: { mes: somarMeses(mesAtual, 1), total: Number(somaMes(somarMeses(mesAtual, 1)).toFixed(2)) },
      comprometido_futuro: Number(futuras.toFixed(2)),
      limite_usado: cartao.limite ? Number(((atual + futuras) / Number(cartao.limite)).toFixed(3)) : null,
    };
  });
}

export async function recorrentes(usuario) {
  const { data, error } = await getSupabase()
    .from("recorrentes")
    .select("*")
    .eq("user_id", usuario)
    .eq("ativo", true)
    .order("dia_do_mes");

  if (error) throw new Error(`Falha ao ler recorrentes: ${error.message}`);
  return data;
}

async function criar(tabela, usuario, dados, campos, rotulo) {
  const limpos = Object.fromEntries(
    Object.entries(dados).filter(([chave, valor]) => campos.includes(chave) && valor !== undefined && valor !== "")
  );

  const { data, error } = await getSupabase()
    .from(tabela)
    .insert({ user_id: usuario, ...limpos })
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar ${rotulo}: ${error.message}`);
  return data;
}

async function atualizar(tabela, usuario, id, dados, campos, rotulo) {
  const limpos = Object.fromEntries(Object.entries(dados).filter(([chave]) => campos.includes(chave)));

  const { data, error } = await getSupabase()
    .from(tabela)
    .update(limpos)
    .eq("user_id", usuario)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar ${rotulo}: ${error.message}`);
  return data;
}

async function excluir(tabela, usuario, id, rotulo) {
  const { error } = await getSupabase().from(tabela).delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir ${rotulo}: ${error.message}`);
  return { ok: true };
}

const CAMPOS_CONTA = ["nome", "tipo", "saldo_inicial", "icone", "cor", "ordem", "arquivada"];
const CAMPOS_CATEGORIA = ["nome", "tipo", "icone", "cor", "teto_mensal", "essencial", "parent_id", "ordem", "arquivada"];
const CAMPOS_CARTAO = ["nome", "limite", "fechamento", "vencimento", "conta_id", "icone", "cor", "ativo"];
const CAMPOS_RECORRENTE = ["descricao", "valor", "tipo", "categoria_id", "conta_id", "cartao_id", "dia_do_mes", "frequencia", "inicio", "fim", "ativo"];
const CAMPOS_META = ["titulo", "valor_alvo", "valor_atual", "prazo", "conta_id"];
const CAMPOS_DIVIDA = ["nome", "saldo_atual", "juros_mes", "parcela_min"];

export const criarConta = (u, d) => criar("contas", u, d, CAMPOS_CONTA, "conta");
export const atualizarConta = (u, id, d) => atualizar("contas", u, id, d, CAMPOS_CONTA, "conta");
export const criarCategoria = (u, d) => criar("categorias", u, d, CAMPOS_CATEGORIA, "categoria");
export const atualizarCategoria = (u, id, d) => atualizar("categorias", u, id, d, CAMPOS_CATEGORIA, "categoria");
export const criarCartao = (u, d) => criar("cartoes", u, d, CAMPOS_CARTAO, "cartão");
export const atualizarCartao = (u, id, d) => atualizar("cartoes", u, id, d, CAMPOS_CARTAO, "cartão");
export const criarRecorrente = (u, d) => criar("recorrentes", u, d, CAMPOS_RECORRENTE, "recorrente");
export const atualizarRecorrente = (u, id, d) => atualizar("recorrentes", u, id, d, CAMPOS_RECORRENTE, "recorrente");
export const excluirRecorrente = (u, id) => excluir("recorrentes", u, id, "recorrente");
export const criarMetaFinanceira = (u, d) => criar("metas_financeiras", u, d, CAMPOS_META, "meta");
export const atualizarMetaFinanceira = (u, id, d) => atualizar("metas_financeiras", u, id, d, CAMPOS_META, "meta");
export const excluirMetaFinanceira = (u, id) => excluir("metas_financeiras", u, id, "meta");
export const criarDivida = (u, d) => criar("dividas", u, d, CAMPOS_DIVIDA, "dívida");
export const atualizarDivida = (u, id, d) => atualizar("dividas", u, id, d, CAMPOS_DIVIDA, "dívida");
export const excluirDivida = (u, id) => excluir("dividas", u, id, "dívida");

// ---------- lançamentos ----------

// Um lançamento pode virar várias linhas: compra parcelada no crédito cria uma
// linha por parcela, cada uma na fatura certa.
export async function criarLancamento(usuario, dados) {
  const valor = Number(String(dados.valor).replace(",", "."));
  if (!Number.isFinite(valor) || valor <= 0) throw new Error("Informe um valor maior que zero");
  if (!["receita", "despesa"].includes(dados.tipo)) throw new Error("Tipo deve ser receita ou despesa");

  const supabase = getSupabase();
  const data = dados.data || hoje();
  const parcelas = Math.max(1, Number(dados.parcelas) || 1);
  const noCredito = dados.forma_pagamento === "credito" && dados.cartao_id;

  const base = {
    user_id: usuario,
    tipo: dados.tipo,
    categoria_id: dados.categoria_id || null,
    categoria: dados.categoria || null,
    descricao: dados.descricao || null,
    observacao: dados.observacao || null,
    tags: dados.tags || [],
    conta_id: noCredito ? null : dados.conta_id || null,
    cartao_id: noCredito ? dados.cartao_id : null,
    forma_pagamento: dados.forma_pagamento || "dinheiro",
    transferencia: Boolean(dados.transferencia),
  };

  // Crédito: precisa do cartão para saber em que fatura cai.
  if (noCredito) {
    const { data: cartao, error } = await supabase
      .from("cartoes")
      .select("*")
      .eq("user_id", usuario)
      .eq("id", dados.cartao_id)
      .single();

    if (error) throw new Error(`Cartão não encontrado: ${error.message}`);

    const linhas = parcelar(valor, parcelas, data, cartao).map((parcela) => ({
      ...base,
      data: parcela.data,
      valor: parcela.valor,
      fatura_mes: parcela.fatura_mes,
      parcela_num: parcelas > 1 ? parcela.parcela_num : null,
      parcela_total: parcelas > 1 ? parcela.parcela_total : null,
      grupo_parcelas: parcelas > 1 ? crypto.randomUUID() : null,
      efetivada: parcela.data <= hoje(),
    }));

    // Todas as parcelas da mesma compra compartilham o grupo.
    if (parcelas > 1) {
      const grupo = linhas[0].grupo_parcelas;
      for (const linha of linhas) linha.grupo_parcelas = grupo;
    }

    const { data: criadas, error: erroInsert } = await supabase.from(T).insert(linhas).select();
    if (erroInsert) throw new Error(`Falha ao lançar compra no cartão: ${erroInsert.message}`);
    return { lancamentos: criadas, parcelas: criadas.length };
  }

  const { data: criada, error } = await supabase
    .from(T)
    .insert({ ...base, data, valor, efetivada: dados.efetivada !== false })
    .select()
    .single();

  if (error) throw new Error(`Falha ao lançar: ${error.message}`);
  return { lancamentos: [criada], parcelas: 1 };
}

// Lançamento vindo da IA/WhatsApp, que só conhece o nome da categoria.
export async function salvarTransacao(usuario, { valor, tipo, categoria, descricao, telefone = null, data = hoje() }) {
  const lista = await categorias(usuario, tipo).catch(() => []);
  const achada = lista.find((c) => c.nome.toLowerCase() === String(categoria || "").toLowerCase());

  const { lancamentos } = await criarLancamento(usuario, {
    valor,
    tipo,
    categoria,
    categoria_id: achada?.id || null,
    descricao,
    data,
  });

  if (telefone) {
    await getSupabase().from(T).update({ telefone }).eq("id", lancamentos[0].id);
  }
  return lancamentos[0];
}

export async function atualizarLancamento(usuario, id, dados) {
  const campos = ["data", "valor", "tipo", "categoria_id", "categoria", "descricao", "observacao", "tags", "conta_id", "cartao_id", "forma_pagamento", "efetivada"];
  return atualizar(T, usuario, id, dados, campos, "lançamento");
}

// Apagar uma parcela apaga a compra inteira, senão o total do mês fica errado.
export async function excluirLancamento(usuario, id, { grupoInteiro = true } = {}) {
  const supabase = getSupabase();

  const { data: lancamento } = await supabase.from(T).select("grupo_parcelas").eq("user_id", usuario).eq("id", id).maybeSingle();

  if (grupoInteiro && lancamento?.grupo_parcelas) {
    const { error } = await supabase.from(T).delete().eq("user_id", usuario).eq("grupo_parcelas", lancamento.grupo_parcelas);
    if (error) throw new Error(`Falha ao excluir a compra parcelada: ${error.message}`);
    return { ok: true, grupo: true };
  }

  return excluir(T, usuario, id, "lançamento");
}

export async function lancamentos(usuario, { mes = null, desde = null, ate = null, tipo = null, categoria_id = null, conta_id = null, cartao_id = null, busca = null, limite = 100, incluirFuturos = false } = {}) {
  let consulta = getSupabase()
    .from(T)
    .select("*")
    .eq("user_id", usuario)
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (mes) consulta = consulta.gte("data", `${mes}-01`).lte("data", dataNoMes(mes, 31));
  if (desde) consulta = consulta.gte("data", desde);
  if (ate) consulta = consulta.lte("data", ate);
  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (categoria_id) consulta = consulta.eq("categoria_id", categoria_id);
  if (conta_id) consulta = consulta.eq("conta_id", conta_id);
  if (cartao_id) consulta = consulta.eq("cartao_id", cartao_id);
  if (busca) consulta = consulta.ilike("descricao", `%${busca}%`);
  if (!incluirFuturos) consulta = consulta.lte("data", hoje());

  const { data, error } = await consulta;
  if (error) throw new Error(`Falha ao ler lançamentos: ${error.message}`);
  return data;
}

// Pagar a fatura é uma transferência: sai da conta, quita o cartão, e não
// aparece como gasto novo (as compras já foram contadas).
export async function pagarFatura(usuario, cartaoId, mes, contaId, valor) {
  const { lancamentos: criados } = await criarLancamento(usuario, {
    valor,
    tipo: "despesa",
    descricao: `Pagamento da fatura ${mes}`,
    conta_id: contaId,
    forma_pagamento: "transferencia",
    transferencia: true,
    tags: ["fatura"],
  });

  const { error } = await getSupabase()
    .from(T)
    .update({ cartao_id: cartaoId, fatura_mes: mes })
    .eq("id", criados[0].id);

  if (error) throw new Error(`Falha ao registrar o pagamento: ${error.message}`);
  return criados[0];
}

export async function faturaDoCartao(usuario, cartaoId, mes) {
  const { data, error } = await getSupabase()
    .from(T)
    .select("*")
    .eq("user_id", usuario)
    .eq("cartao_id", cartaoId)
    .eq("fatura_mes", mes)
    .order("data");

  if (error) throw new Error(`Falha ao ler a fatura: ${error.message}`);

  const compras = data.filter((linha) => !linha.transferencia);
  const pagamentos = data.filter((linha) => linha.transferencia);

  return {
    mes,
    itens: compras,
    total: Number(compras.reduce((soma, c) => soma + Number(c.valor), 0).toFixed(2)),
    pago: Number(pagamentos.reduce((soma, p) => soma + Number(p.valor), 0).toFixed(2)),
  };
}

// ---------- orçamento ----------

export async function definirOrcamento(usuario, mes, categoriaId, valor) {
  const { data, error } = await getSupabase()
    .from("orcamentos")
    .upsert({ user_id: usuario, mes, categoria_id: categoriaId, valor_planejado: Number(valor) }, { onConflict: "user_id,mes,categoria_id" })
    .select()
    .single();

  if (error) throw new Error(`Falha ao definir orçamento: ${error.message}`);
  return data;
}

async function orcamentoDoMes(usuario, mes) {
  const supabase = getSupabase();

  const [orcamentosRes, listaCategorias] = await Promise.all([
    supabase.from("orcamentos").select("*").eq("user_id", usuario).eq("mes", mes),
    categorias(usuario, "despesa"),
  ]);

  if (orcamentosRes.error) throw new Error(`Falha ao ler orçamentos: ${orcamentosRes.error.message}`);

  // Teto do mês: o que você definiu para este mês; se não definiu, o teto fixo
  // da categoria.
  return listaCategorias
    .map((categoria) => {
      const doMes = orcamentosRes.data.find((o) => o.categoria_id === categoria.id);
      const planejado = doMes ? Number(doMes.valor_planejado) : categoria.teto_mensal ? Number(categoria.teto_mensal) : 0;
      return { categoria, planejado };
    })
    .filter((item) => item.planejado > 0);
}

// ---------- painel, projeção e relatórios ----------

export async function painel(usuario, mes = mesDe(hoje())) {
  const hojeISO = hoje();
  const supabase = getSupabase();

  const [doMes, listaContas, listaCartoes, listaRecorrentes, envelopes, listaCategorias, metasRes, dividasRes] =
    await Promise.all([
      lancamentos(usuario, { mes, limite: 1000, incluirFuturos: true }),
      contas(usuario),
      cartoes(usuario).catch(() => []),
      recorrentes(usuario).catch(() => []),
      orcamentoDoMes(usuario, mes).catch(() => []),
      categorias(usuario).catch(() => []),
      supabase.from("metas_financeiras").select("*").eq("user_id", usuario).order("prazo", { nullsFirst: false }),
      supabase.from("dividas").select("*").eq("user_id", usuario).is("quitada_em", null),
    ]);

  const reais = doMes.filter((linha) => !linha.transferencia);
  const soma = (linhas) => Number(linhas.reduce((total, l) => total + Number(l.valor), 0).toFixed(2));

  const receitas = soma(reais.filter((l) => l.tipo === "receita" && l.efetivada));
  const despesas = soma(reais.filter((l) => l.tipo === "despesa" && l.efetivada));
  const previstas = soma(reais.filter((l) => l.tipo === "despesa" && !l.efetivada));

  // Projeção: recorrentes que ainda vão cair + ritmo de gasto variável.
  const fimDoMes = dataNoMes(mes, diasNoMes(mes));
  const diasRestantes = mes === mesDe(hojeISO) ? Math.max(0, diasNoMes(mes) - Number(hojeISO.slice(8, 10))) : 0;

  const recorrentesPrevistos = listaRecorrentes.reduce((total, recorrente) => {
    const proximas = ocorrenciasRecorrente(recorrente, somarDias(hojeISO, 1), fimDoMes).length;
    return total + proximas * Number(recorrente.valor) * (recorrente.tipo === "receita" ? 1 : -1);
  }, 0);

  const diasCorridos = Math.max(1, Number(hojeISO.slice(8, 10)));
  const variaveis = soma(
    reais.filter((l) => l.tipo === "despesa" && l.efetivada && !l.recorrente_id && !l.parcela_num)
  );

  const saldoTotal = Number(listaContas.reduce((total, conta) => total + conta.saldo, 0).toFixed(2));

  const projecao = projecaoDoMes({
    saldoAtual: saldoTotal,
    recorrentesPrevistos,
    mediaDiariaVariavel: variaveis / diasCorridos,
    diasRestantes,
  });

  // Consumo dos envelopes
  const gastoPorCategoria = {};
  for (const linha of reais.filter((l) => l.tipo === "despesa")) {
    const chave = linha.categoria_id || `texto:${linha.categoria || "outros"}`;
    gastoPorCategoria[chave] = (gastoPorCategoria[chave] || 0) + Number(linha.valor);
  }

  const orcamentos = envelopes
    .map((envelope) => ({
      categoria: envelope.categoria,
      ...consumoOrcamento(envelope.planejado, gastoPorCategoria[envelope.categoria.id] || 0),
    }))
    .sort((a, b) => b.proporcao - a.proporcao);

  const porCategoria = Object.entries(gastoPorCategoria)
    .map(([chave, total]) => {
      const categoria = listaCategorias.find((c) => c.id === chave);
      return {
        id: chave,
        nome: categoria?.nome || String(chave).replace("texto:", ""),
        icone: categoria?.icone || "📦",
        cor: categoria?.cor || "#86877f",
        essencial: categoria?.essencial || false,
        total: Number(total.toFixed(2)),
      };
    })
    .sort((a, b) => b.total - a.total);

  const essenciais = porCategoria.filter((c) => c.essencial).reduce((t, c) => t + c.total, 0);
  const investido = porCategoria.filter((c) => /investi/i.test(c.nome)).reduce((t, c) => t + c.total, 0);

  return {
    mes,
    data: hojeISO,
    receitas,
    despesas,
    sobra: Number((receitas - despesas).toFixed(2)),
    previstas,
    saldo_total: saldoTotal,
    projecao,
    contas: listaContas,
    cartoes: listaCartoes,
    recorrentes: listaRecorrentes,
    orcamentos,
    por_categoria: porCategoria,
    regra_502030: regra502030(receitas, essenciais, despesas - essenciais - investido, investido),
    metas: (metasRes.data || []).map((meta) => ({
      ...meta,
      progresso: Number(meta.valor_alvo) > 0 ? Math.min(1, Number(meta.valor_atual) / Number(meta.valor_alvo)) : 0,
    })),
    dividas: dividasRes.data || [],
    plano_quitacao: {
      avalanche: planoQuitacao(dividasRes.data || [], 0, "avalanche"),
      bola_de_neve: planoQuitacao(dividasRes.data || [], 0, "bola_de_neve"),
    },
    lancamentos: reais.filter((l) => l.efetivada).slice(0, 20),
    alertas: await alertas(usuario, mes, { reais, listaRecorrentes, porCategoria }).catch(() => []),
    formas: FORMAS,
    categorias: listaCategorias,
  };
}

// Alertas de vazamento (E3.7)
async function alertas(usuario, mes, { reais, listaRecorrentes, porCategoria }) {
  const lista = [];
  const supabase = getSupabase();

  // 1. categoria acima da média dos 3 meses anteriores
  const desde = `${somarMeses(mes, -3)}-01`;
  const { data: historico } = await supabase
    .from(T)
    .select("valor, categoria_id, data, descricao, transferencia, tipo")
    .eq("user_id", usuario)
    .gte("data", desde)
    .lt("data", `${mes}-01`);

  const anteriores = (historico || []).filter((l) => !l.transferencia && l.tipo === "despesa");

  for (const categoria of porCategoria.slice(0, 8)) {
    const doHistorico = anteriores.filter((l) => l.categoria_id === categoria.id);
    if (doHistorico.length < 3) continue;

    const meses = [...new Set(doHistorico.map((l) => mesDe(l.data)))].length || 1;
    const media = doHistorico.reduce((t, l) => t + Number(l.valor), 0) / meses;

    if (media > 0 && categoria.total > media * 1.4) {
      lista.push({
        tipo: "categoria_acima",
        texto: `${categoria.nome} está ${Math.round((categoria.total / media - 1) * 100)}% acima da sua média`,
      });
    }
  }

  // 2. assinatura que não aparece há dois meses (recorrente sem lançamento)
  for (const recorrente of listaRecorrentes.filter((r) => r.tipo === "despesa")) {
    const usou = anteriores.some((l) => l.descricao && l.descricao.toLowerCase().includes(recorrente.descricao.toLowerCase()));
    const noMes = reais.some((l) => l.recorrente_id === recorrente.id);
    if (!usou && !noMes) {
      lista.push({ tipo: "assinatura_esquecida", texto: `"${recorrente.descricao}" está cadastrada como fixa mas não aparece nos lançamentos` });
    }
  }

  // 3. gasto fora do padrão no mês
  const valores = anteriores.map((l) => Number(l.valor));
  for (const linha of reais.filter((l) => l.tipo === "despesa")) {
    if (foraDoPadrao(valores, Number(linha.valor))) {
      lista.push({
        tipo: "fora_do_padrao",
        texto: `${linha.descricao || "Um gasto"} de R$ ${Number(linha.valor).toFixed(2)} está fora do seu padrão`,
      });
    }
  }

  return lista.slice(0, 5);
}

export async function relatorios(usuario, meses = 6) {
  const mesAtual = mesDe(hoje());
  const desde = `${somarMeses(mesAtual, -(meses - 1))}-01`;

  const [{ data, error }, listaCategorias] = await Promise.all([
    getSupabase().from(T).select("*").eq("user_id", usuario).gte("data", desde).lte("data", hoje()),
    categorias(usuario).catch(() => []),
  ]);

  if (error) throw new Error(`Falha ao ler relatórios: ${error.message}`);

  const reais = data.filter((l) => !l.transferencia && l.efetivada);
  const despesas = reais.filter((l) => l.tipo === "despesa");

  const agrupar = (linhas, chave) => {
    const mapa = {};
    for (const linha of linhas) mapa[chave(linha)] = (mapa[chave(linha)] || 0) + Number(linha.valor);
    return Object.entries(mapa)
      .map(([nome, total]) => ({ nome, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);
  };

  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  return {
    meses,
    por_mes: Object.entries(
      reais.reduce((mapa, linha) => {
        const mes = mesDe(linha.data);
        mapa[mes] ||= { mes, receitas: 0, despesas: 0 };
        mapa[mes][linha.tipo === "receita" ? "receitas" : "despesas"] += Number(linha.valor);
        return mapa;
      }, {})
    )
      .sort()
      .map(([, valores]) => ({
        ...valores,
        receitas: Number(valores.receitas.toFixed(2)),
        despesas: Number(valores.despesas.toFixed(2)),
        sobra: Number((valores.receitas - valores.despesas).toFixed(2)),
      })),
    por_categoria: agrupar(despesas, (l) => listaCategorias.find((c) => c.id === l.categoria_id)?.nome || l.categoria || "Outros"),
    por_forma: agrupar(despesas, (l) => FORMAS.find((f) => f.id === l.forma_pagamento)?.nome || l.forma_pagamento),
    por_dia_semana: DIAS.map((nome, indice) => ({
      nome,
      total: Number(despesas.filter((l) => diaSemana(l.data) === indice).reduce((t, l) => t + Number(l.valor), 0).toFixed(2)),
    })),
    maiores: despesas
      .map((l) => ({ descricao: l.descricao || l.categoria || "Sem descrição", valor: Number(l.valor), data: l.data }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10),
  };
}

// ---------- ganchos do núcleo ----------

export async function resumoDoDia(usuario, data = hoje()) {
  const { data: linhas, error } = await getSupabase()
    .from(T)
    .select("valor, tipo, transferencia")
    .eq("user_id", usuario)
    .eq("data", data)
    .eq("efetivada", true);

  if (error) throw new Error(`Falha ao resumir o dia: ${error.message}`);

  const reais = linhas.filter((l) => !l.transferencia);
  const somar = (tipo) => reais.filter((l) => l.tipo === tipo).reduce((t, l) => t + Number(l.valor), 0);

  return { despesas: somar("despesa"), receitas: somar("receita") };
}

export async function resumoDoMes(usuario, data = hoje()) {
  const dados = await painel(usuario, mesDe(data));
  return {
    mes: dados.mes,
    despesas: dados.despesas,
    receitas: dados.receitas,
    por_categoria: dados.por_categoria.map((c) => ({ categoria: c.nome, total: c.total })),
  };
}

// Contas que vencem hoje entram no checklist da tela Hoje.
export async function contasDoDia(usuario, data = hoje()) {
  const [listaRecorrentes, listaCartoes] = await Promise.all([
    recorrentes(usuario).catch(() => []),
    cartoes(usuario).catch(() => []),
  ]);

  const itens = [];

  for (const recorrente of listaRecorrentes.filter((r) => r.tipo === "despesa")) {
    if (ocorrenciasRecorrente(recorrente, data, data).length > 0) {
      itens.push({ id: recorrente.id, nome: `Pagar ${recorrente.descricao}`, valor: Number(recorrente.valor) });
    }
  }

  for (const cartao of listaCartoes) {
    if (cartao.fatura_atual.vencimento === data && cartao.fatura_atual.total > cartao.fatura_atual.pago) {
      itens.push({ id: cartao.id, nome: `Fatura do ${cartao.nome}`, valor: cartao.fatura_atual.total });
    }
  }

  return itens;
}
