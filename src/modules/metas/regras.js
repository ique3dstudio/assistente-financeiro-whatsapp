// Cálculos das metas — funções puras, testadas em scripts/test-metas.js
export const HORIZONTES = [
  { id: "curto", nome: "Curto prazo", detalhe: "até 3 meses", revisao: "semanal" },
  { id: "medio", nome: "Médio prazo", detalhe: "3 a 12 meses", revisao: "mensal" },
  { id: "longo", nome: "Longo prazo", detalhe: "1 a 5 anos", revisao: "trimestral" },
];

export const AREAS = [
  { id: "saude", nome: "Saúde", emoji: "💪" },
  { id: "carreira", nome: "Carreira", emoji: "🚀" },
  { id: "financeiro", nome: "Financeiro", emoji: "💰" },
  { id: "relacionamentos", nome: "Relacionamentos", emoji: "❤️" },
  { id: "aprendizado", nome: "Aprendizado", emoji: "📚" },
  { id: "espiritual", nome: "Espiritual", emoji: "🕊️" },
];

const DIAS_PARA_ORFA = 14;

// Progresso entre o ponto de partida e o alvo. Funciona também para metas
// decrescentes (perder peso, reduzir dívida), em que o alvo é menor que o início.
export function progresso({ valor_inicial = 0, valor_atual = 0, valor_alvo = null }) {
  if (valor_alvo === null || valor_alvo === undefined) return null;

  const inicial = Number(valor_inicial) || 0;
  const atual = Number(valor_atual) || 0;
  const alvo = Number(valor_alvo);
  const caminho = alvo - inicial;

  if (caminho === 0) return atual >= alvo ? 1 : 0;
  return Math.min(1, Math.max(0, (atual - inicial) / caminho));
}

export function diasRestantes(prazo, hojeISO) {
  if (!prazo) return null;
  return Math.round((Date.parse(`${prazo}T12:00:00Z`) - Date.parse(`${hojeISO}T12:00:00Z`)) / 86400000);
}

// Quanto por dia (ou por semana) falta para chegar no prazo — o número que
// transforma "quero juntar 10 mil" em "R$ 84 por dia".
export function ritmoNecessario(meta, hojeISO) {
  const dias = diasRestantes(meta.prazo, hojeISO);
  if (!dias || dias <= 0 || meta.valor_alvo === null) return null;

  const falta = Number(meta.valor_alvo) - Number(meta.valor_atual || 0);
  if (falta <= 0) return null;

  return { falta, por_dia: falta / dias, por_semana: (falta / dias) * 7, dias };
}

// Meta órfã: nada empurrando ela e nenhum movimento há duas semanas.
export function estaOrfa(meta, hojeISO) {
  if (meta.concluida_em) return false;
  if ((meta.vinculos || 0) > 0) return false;
  if (meta.metrica_id) return false;

  const parada = Math.round(
    (Date.parse(`${hojeISO}T12:00:00Z`) - Date.parse(meta.atualizado_em || meta.criado_em)) / 86400000
  );
  return parada >= DIAS_PARA_ORFA;
}

export function situacao(meta, hojeISO) {
  if (meta.concluida_em) return { id: "concluida", texto: "concluída 🎉" };

  const dias = diasRestantes(meta.prazo, hojeISO);
  if (dias !== null && dias < 0) return { id: "atrasada", texto: `${Math.abs(dias)} dias em atraso` };
  if (estaOrfa(meta, hojeISO)) return { id: "orfa", texto: "sem hábito ligado — vira intenção, não meta" };
  if (dias !== null) return { id: "andando", texto: dias === 0 ? "vence hoje" : `${dias} dias restantes` };

  return { id: "andando", texto: "sem prazo definido" };
}
