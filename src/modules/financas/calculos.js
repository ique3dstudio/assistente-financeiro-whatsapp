// Contas de dinheiro do Life OS — funções puras, testadas em
// scripts/test-financas.js.
//
// É o arquivo mais delicado do projeto junto com a progressão de carga: um erro
// de um dia na regra de fatura, ou um centavo perdido no arredondamento das
// parcelas, faz o app discordar do extrato do banco — e aí você para de confiar
// nele, que é o único jeito de um app de finanças morrer.

export const FORMAS = [
  { id: "dinheiro", nome: "Dinheiro" },
  { id: "debito", nome: "Débito" },
  { id: "credito", nome: "Crédito" },
  { id: "pix", nome: "Pix" },
  { id: "boleto", nome: "Boleto" },
  { id: "transferencia", nome: "Transferência" },
];

// ---------- datas por mês ----------

export function somarMeses(mesISO, quantidade) {
  const [ano, mes] = mesISO.split("-").map(Number);
  const total = (ano * 12 + (mes - 1) + quantidade);
  return `${String(Math.floor(total / 12)).padStart(4, "0")}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function diasNoMes(mesISO) {
  const [ano, mes] = mesISO.split("-").map(Number);
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

// Dia 31 em fevereiro não existe: cai no último dia do mês.
export function dataNoMes(mesISO, dia) {
  const limite = Math.min(Number(dia), diasNoMes(mesISO));
  return `${mesISO}-${String(limite).padStart(2, "0")}`;
}

export const mesDe = (dataISO) => dataISO.slice(0, 7);

// ---------- cartão de crédito ----------

// Em qual fatura cai uma compra.
//
// A fatura é identificada pelo MÊS DO VENCIMENTO, que é como as pessoas falam
// ("a fatura de outubro"). Duas regras:
//   1. comprou no dia do fechamento ou antes → entra na fatura que fecha neste mês;
//      comprou depois → entra na que fecha no mês seguinte;
//   2. se o dia de vencimento vem depois do de fechamento, o vencimento é no
//      mesmo mês do fechamento; se vem antes (ou é igual), é no mês seguinte.
export function faturaDaCompra(dataCompra, cartao) {
  const fechamento = Number(cartao.fechamento);
  const vencimento = Number(cartao.vencimento);
  const dia = Number(dataCompra.slice(8, 10));

  const mesFechamento = dia <= fechamento ? mesDe(dataCompra) : somarMeses(mesDe(dataCompra), 1);
  const mesVencimento = vencimento > fechamento ? mesFechamento : somarMeses(mesFechamento, 1);

  return {
    fatura_mes: mesVencimento,
    fechamento_em: dataNoMes(mesFechamento, fechamento),
    vencimento_em: dataNoMes(mesVencimento, vencimento),
  };
}

// Divide uma compra em parcelas sem perder centavo: a diferença do
// arredondamento vai na PRIMEIRA parcela, como fazem os cartões no Brasil.
export function parcelar(valorTotal, quantidade, dataCompra, cartao) {
  const total = Math.round(Number(valorTotal) * 100);
  const numero = Math.max(1, Math.round(Number(quantidade)));
  if (!Number.isFinite(total) || total <= 0) throw new Error("Valor da compra inválido");
  if (numero > 60) throw new Error("No máximo 60 parcelas");

  const base = Math.floor(total / numero);
  const resto = total - base * numero;

  const primeira = faturaDaCompra(dataCompra, cartao);

  return Array.from({ length: numero }, (_, i) => {
    const mes = somarMeses(primeira.fatura_mes, i);
    return {
      parcela_num: i + 1,
      parcela_total: numero,
      valor: (base + (i === 0 ? resto : 0)) / 100,
      fatura_mes: mes,
      data: dataNoMes(mes, cartao.vencimento),
    };
  });
}

// Quanto das próximas faturas já está comprometido com parcelas.
export function comprometimento(parcelas) {
  const meses = {};
  for (const parcela of parcelas) {
    meses[parcela.fatura_mes] = (meses[parcela.fatura_mes] || 0) + Number(parcela.valor);
  }
  return Object.entries(meses)
    .sort()
    .map(([mes, total]) => ({ mes, total: Number(total.toFixed(2)) }));
}

// ---------- recorrentes ----------

// Datas em que um lançamento fixo acontece dentro de um intervalo. Não gera
// linha no banco: é projeção na hora de mostrar.
export function ocorrenciasRecorrente(recorrente, deISO, ateISO) {
  const datas = [];
  const inicio = recorrente.inicio || deISO;
  const fim = recorrente.fim && recorrente.fim < ateISO ? recorrente.fim : ateISO;

  if (recorrente.frequencia === "semanal") {
    let data = inicio > deISO ? inicio : deISO;
    const passo = 7;
    const diferenca = Math.round((Date.parse(`${data}T12:00:00Z`) - Date.parse(`${inicio}T12:00:00Z`)) / 86400000);
    const ajuste = ((passo - (diferenca % passo)) % passo);
    let atual = new Date(Date.parse(`${data}T12:00:00Z`) + ajuste * 86400000);

    while (atual.toISOString().slice(0, 10) <= fim) {
      datas.push(atual.toISOString().slice(0, 10));
      atual = new Date(atual.getTime() + passo * 86400000);
    }
    return datas;
  }

  // Mensal anda de mês em mês; anual anda de 12 em 12 a partir do mês de início,
  // para cair sempre no mesmo mês do ano.
  const passoMeses = recorrente.frequencia === "anual" ? 12 : 1;
  let mes = mesDe(inicio);
  while (mes < mesDe(deISO)) mes = somarMeses(mes, passoMeses);

  while (mes <= mesDe(fim)) {
    const data = dataNoMes(mes, recorrente.dia_do_mes);
    if (data >= deISO && data <= fim && data >= inicio) datas.push(data);
    mes = somarMeses(mes, passoMeses);
  }

  return datas;
}

// ---------- projeção e orçamento ----------

// Saldo previsto para o fim do mês: o que já entrou e saiu, mais o que ainda
// vai acontecer de fixo, menos o ritmo médio de gastos variáveis.
export function projecaoDoMes({ saldoAtual, recorrentesPrevistos = 0, mediaDiariaVariavel = 0, diasRestantes = 0 }) {
  const variavelPrevisto = mediaDiariaVariavel * diasRestantes;
  return {
    variavel_previsto: Number(variavelPrevisto.toFixed(2)),
    recorrentes_previstos: Number(recorrentesPrevistos.toFixed(2)),
    saldo_previsto: Number((saldoAtual + recorrentesPrevistos - variavelPrevisto).toFixed(2)),
  };
}

// Consumo de um envelope de orçamento, com os avisos de 80% e 100%.
export function consumoOrcamento(planejado, gasto) {
  const teto = Number(planejado) || 0;
  const usado = Number(gasto) || 0;
  const proporcao = teto > 0 ? usado / teto : 0;

  return {
    planejado: teto,
    gasto: usado,
    resta: Number((teto - usado).toFixed(2)),
    proporcao,
    situacao: proporcao >= 1 ? "estourou" : proporcao >= 0.8 ? "atencao" : "ok",
  };
}

// Regra 50/30/20 sobre a receita do mês: essenciais, resto, poupança.
export function regra502030(receitas, essenciais, naoEssenciais, investido) {
  const base = Number(receitas) || 0;
  const alvo = (percentual) => Number(((base * percentual) / 100).toFixed(2));

  return [
    { id: "essenciais", nome: "Essenciais", alvo: alvo(50), real: Number(essenciais.toFixed(2)) },
    { id: "resto", nome: "Estilo de vida", alvo: alvo(30), real: Number(naoEssenciais.toFixed(2)) },
    { id: "poupanca", nome: "Poupar e investir", alvo: alvo(20), real: Number(investido.toFixed(2)) },
  ];
}

// ---------- dívidas ----------

// Simula a quitação mês a mês. 'bola_de_neve' ataca o menor saldo primeiro
// (motivação); 'avalanche' ataca o maior juros primeiro (matemática).
export function planoQuitacao(dividas, extraMensal = 0, estrategia = "avalanche", limiteMeses = 600) {
  let restantes = dividas.map((d) => ({
    nome: d.nome,
    saldo: Number(d.saldo_atual),
    juros: Number(d.juros_mes) / 100,
    minimo: Number(d.parcela_min) || 0,
  }));

  if (restantes.length === 0) return { meses: 0, total_juros: 0, ordem: [], parcela_total: 0 };

  const ordem = [...restantes]
    .sort((a, b) => (estrategia === "bola_de_neve" ? a.saldo - b.saldo : b.juros - a.juros))
    .map((d) => d.nome);

  let meses = 0;
  let jurosPagos = 0;
  const quitadas = [];
  const orcamento = restantes.reduce((soma, d) => soma + d.minimo, 0) + Number(extraMensal);

  while (restantes.length > 0 && meses < limiteMeses) {
    meses++;

    // 1. juros do mês
    for (const divida of restantes) {
      const juros = divida.saldo * divida.juros;
      divida.saldo += juros;
      jurosPagos += juros;
    }

    // 2. mínimos
    let sobra = orcamento;
    for (const divida of restantes) {
      const pago = Math.min(divida.minimo, divida.saldo, sobra);
      divida.saldo -= pago;
      sobra -= pago;
    }

    // 3. o que sobrou vai toda para a dívida da vez
    for (const nome of ordem) {
      if (sobra <= 0) break;
      const divida = restantes.find((d) => d.nome === nome);
      if (!divida) continue;
      const pago = Math.min(sobra, divida.saldo);
      divida.saldo -= pago;
      sobra -= pago;
    }

    for (const divida of restantes.filter((d) => d.saldo <= 0.01)) quitadas.push({ nome: divida.nome, mes: meses });
    restantes = restantes.filter((d) => d.saldo > 0.01);

    // Sem orçamento suficiente para cobrir nem os juros, a dívida não fecha.
    if (orcamento <= 0) break;
  }

  return {
    meses,
    total_juros: Number(jurosPagos.toFixed(2)),
    parcela_total: Number(orcamento.toFixed(2)),
    ordem,
    quitadas,
    nunca_quita: restantes.length > 0,
  };
}

// ---------- alertas de vazamento ----------

// Gasto fora do padrão: acima da média mais dois desvios (e acima de um piso,
// para não acusar café de R$ 8 como anomalia).
export function foraDoPadrao(valores, valor, piso = 50) {
  if (valores.length < 5) return false;

  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const desvio = Math.sqrt(valores.reduce((soma, v) => soma + (v - media) ** 2, 0) / valores.length);

  return valor > piso && valor > media + 2 * desvio;
}
