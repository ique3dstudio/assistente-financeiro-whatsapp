// Contas do módulo Dieta — funções puras, testadas em scripts/test-dieta.js.
//
// Convenção do banco: kcal/proteína/carbo/gordura/fibra/sódio em `alimentos`
// são sempre "por 100 g" (o padrão de qualquer rótulo nutricional).
// `porcao_padrao_g` é só a quantidade sugerida no registro rápido — não é a
// base do cálculo.

export const REFEICOES = [
  { id: "cafe", nome: "Café da manhã", periodo: "manha" },
  { id: "almoco", nome: "Almoço", periodo: "tarde" },
  { id: "lanche", nome: "Lanche", periodo: "tarde" },
  { id: "jantar", nome: "Jantar", periodo: "noite" },
  { id: "ceia", nome: "Ceia", periodo: "noite" },
  { id: "outro", nome: "Outro", periodo: "qualquer" },
];

export const CHECKINS = [
  { id: "bem", nome: "Comi bem", emoji: "🙂" },
  { id: "mais_ou_menos", nome: "Mais ou menos", emoji: "😐" },
  { id: "mal", nome: "Comi mal", emoji: "🙁" },
];

const MACROS_ZERO = { kcal: 0, proteina_g: 0, carbo_g: 0, gordura_g: 0, fibra_g: 0, sodio_mg: 0 };

// A quantidade escala os macros a partir do valor por 100 g.
export function escalarMacros(alimento, quantidadeG) {
  const fator = Number(quantidadeG) / 100;
  const escalar = (v) => (v === null || v === undefined ? null : Number((Number(v) * fator).toFixed(2)));

  return {
    kcal: escalar(alimento.kcal) ?? 0,
    proteina_g: escalar(alimento.proteina_g) ?? 0,
    carbo_g: escalar(alimento.carbo_g) ?? 0,
    gordura_g: escalar(alimento.gordura_g) ?? 0,
    fibra_g: escalar(alimento.fibra_g),
    sodio_mg: escalar(alimento.sodio_mg),
  };
}

export function somarMacros(lista) {
  return lista.reduce(
    (total, item) => ({
      kcal: total.kcal + (Number(item.kcal) || 0),
      proteina_g: total.proteina_g + (Number(item.proteina_g) || 0),
      carbo_g: total.carbo_g + (Number(item.carbo_g) || 0),
      gordura_g: total.gordura_g + (Number(item.gordura_g) || 0),
      fibra_g: total.fibra_g + (Number(item.fibra_g) || 0),
      sodio_mg: total.sodio_mg + (Number(item.sodio_mg) || 0),
    }),
    { ...MACROS_ZERO }
  );
}

export function arredondarMacros(macros) {
  return Object.fromEntries(Object.entries(macros).map(([chave, valor]) => [chave, Math.round(valor * 10) / 10]));
}

// Alvo de hoje: kcal muda em dia de treino, macros seguem o mesmo alvo.
export function alvoDoDia(alvo, treinouHoje) {
  if (!alvo) return null;
  return {
    kcal: treinouHoje ? Number(alvo.kcal_treino) : Number(alvo.kcal_descanso),
    proteina_g: Number(alvo.proteina_g),
    carbo_g: Number(alvo.carbo_g),
    gordura_g: Number(alvo.gordura_g),
  };
}

export function progresso(consumido, alvo) {
  if (!alvo) return null;

  const campo = (chave) => {
    const meta = Number(alvo[chave]) || 0;
    const real = Number(consumido[chave]) || 0;
    return { consumido: real, alvo: meta, resta: Number((meta - real).toFixed(1)), proporcao: meta > 0 ? real / meta : 0 };
  };

  return { kcal: campo("kcal"), proteina_g: campo("proteina_g"), carbo_g: campo("carbo_g"), gordura_g: campo("gordura_g") };
}

// ---------- ajuste adaptativo (E5.3, no espírito do MacroFactor) ----------
//
// A ideia: em vez de calcular a manutenção uma vez com uma fórmula genérica,
// o app observa o que você REALMENTE comeu e o que o peso REALMENTE fez, e
// estima a manutenção real a partir disso. 1 kg de gordura corporal ~ 7700 kcal.

const KCAL_POR_KG = 7700;
const DIAS_MINIMOS = 14;
const LIMIAR_MUDANCA_KCAL = 75; // abaixo disso, não vale a pena mexer

function media(numeros) {
  return numeros.length ? numeros.reduce((a, b) => a + b, 0) / numeros.length : null;
}

function arredondarPara(valor, passo = 25) {
  return Math.round(valor / passo) * passo;
}

// pesos: [{data, kg}] · consumos: [{data, kcal}] — ambos ordenados por data.
export function sugerirAjuste({ pesos, consumos, alvoAtual, objetivo = "manter", taxaSemanalKg = 0.4 }) {
  if (pesos.length < 4 || consumos.length < DIAS_MINIMOS) {
    return {
      suficiente: false,
      motivo: `Ainda faltam dados: são necessários pelo menos ${DIAS_MINIMOS} dias de comida registrada e algumas pesagens.`,
      dias_consumo: consumos.length,
      pesagens: pesos.length,
    };
  }

  const primeiroDia = consumos[0].data;
  const ultimoDia = consumos[consumos.length - 1].data;
  const dias = Math.max(
    1,
    Math.round((Date.parse(`${ultimoDia}T12:00:00Z`) - Date.parse(`${primeiroDia}T12:00:00Z`)) / 86400000) + 1
  );

  const mediaConsumo = media(consumos.map((c) => c.kcal));

  // Tendência de peso suavizada: média das 3 primeiras pesagens contra a
  // média das 3 últimas — um dia de retenção de água isolado não distorce a conta.
  const inicioPeso = media(pesos.slice(0, 3).map((p) => p.kg));
  const fimPeso = media(pesos.slice(-3).map((p) => p.kg));
  const deltaKg = fimPeso - inicioPeso;

  const semanas = dias / 7;
  const superavitDiario = (deltaKg * KCAL_POR_KG) / dias;
  const manutencaoEstimada = mediaConsumo - superavitDiario;

  const metaSemanalKg = objetivo === "perder" ? -Math.abs(taxaSemanalKg) : objetivo === "ganhar" ? Math.abs(taxaSemanalKg) : 0;
  const ajusteDiario = (metaSemanalKg * KCAL_POR_KG) / 7;

  const novoAlvo = arredondarPara(manutencaoEstimada + ajusteDiario);
  const diferenca = novoAlvo - Number(alvoAtual);

  const direcaoPeso = deltaKg > 0.15 ? "subiu" : deltaKg < -0.15 ? "desceu" : "ficou estável";

  const justificativa =
    `Em ${dias} dias você comeu em média ${Math.round(mediaConsumo)} kcal e o peso ${direcaoPeso} ` +
    `${Math.abs(deltaKg).toFixed(1)} kg. Isso indica uma manutenção real por volta de ${Math.round(manutencaoEstimada)} kcal.` +
    (objetivo !== "manter"
      ? ` Para ${objetivo === "perder" ? "perder" : "ganhar"} ~${taxaSemanalKg} kg por semana, o alvo sugerido é ${novoAlvo} kcal.`
      : ` Para manter o peso, o alvo sugerido é ${novoAlvo} kcal.`);

  return {
    suficiente: true,
    dias,
    media_consumo: Math.round(mediaConsumo),
    variacao_peso_kg: Number(deltaKg.toFixed(2)),
    manutencao_estimada: Math.round(manutencaoEstimada),
    kcal_sugerido: novoAlvo,
    kcal_atual: Number(alvoAtual),
    diferenca,
    mudar: Math.abs(diferenca) >= LIMIAR_MUDANCA_KCAL,
    justificativa,
  };
}

// ---------- lista de compras ----------

const PALAVRAS_SECAO = [
  { secao: "Hortifrúti", palavras: ["banana", "maçã", "mamão", "melancia", "morango", "abacate", "laranja", "tomate", "alface", "cenoura", "abobrinha", "berinjela", "cebola", "alho", "brócolis", "couve", "batata", "fruta", "verdura", "legume"] },
  { secao: "Açougue e peixaria", palavras: ["frango", "carne", "tilápia", "salmão", "peixe", "bacon", "presunto", "peru", "hambúrguer", "atum"] },
  { secao: "Laticínios e frios", palavras: ["leite", "iogurte", "queijo", "requeijão", "manteiga", "ovo"] },
  { secao: "Padaria", palavras: ["pão", "granola", "aveia"] },
  { secao: "Bebidas", palavras: ["suco", "refrigerante", "água de coco", "café"] },
  { secao: "Mercearia", palavras: ["arroz", "feijão", "macarrão", "farinha", "açúcar", "mel", "azeite", "óleo", "lentilha", "grão de bico", "quinoa", "whey", "amendoim", "castanha", "chocolate", "azeitona"] },
];

export function secaoDoItem(nome) {
  const texto = String(nome || "").toLowerCase();
  for (const { secao, palavras } of PALAVRAS_SECAO) {
    if (palavras.some((palavra) => texto.includes(palavra))) return secao;
  }
  return "Outros";
}

// Junta o plano da semana numa lista de compras, somando quantidades do
// mesmo item e agrupando por seção do mercado.
export function planoParaLista(itensPlano) {
  const porItem = new Map();

  for (const item of itensPlano) {
    const nome = item.descricao || item.nome_alimento || "Item";
    const chave = nome.toLowerCase();
    const gramas = Number(item.quantidade_g) || 0;

    if (!porItem.has(chave)) porItem.set(chave, { item: nome, secao: secaoDoItem(nome), gramas: 0, vezes: 0 });
    const acumulado = porItem.get(chave);
    acumulado.gramas += gramas;
    acumulado.vezes += 1;
  }

  return [...porItem.values()]
    .map((entrada) => ({
      item: entrada.item,
      secao: entrada.secao,
      quantidade: entrada.gramas > 0 ? `${Math.round(entrada.gramas)} g` : `${entrada.vezes}x`,
    }))
    .sort((a, b) => a.secao.localeCompare(b.secao) || a.item.localeCompare(b.item));
}

// ---------- jejum ----------

// Minutos desde a última refeição registrada (para o timer de jejum).
export function minutosDesde(dataHoraISO, agora = new Date()) {
  const diferenca = agora.getTime() - new Date(dataHoraISO).getTime();
  return Math.max(0, Math.round(diferenca / 60000));
}

export function formatarJejum(minutos) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas}h${String(resto).padStart(2, "0")}`;
}
