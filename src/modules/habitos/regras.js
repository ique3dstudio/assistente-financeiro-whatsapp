// Regras de frequência e sequência dos hábitos.
// São funções puras (não falam com o banco) porque é aqui que um erro silencioso
// estragaria meses de dado — então dá para testar direto: node scripts/test-habitos.js
import { somarDias } from "../../core/datas.js";

export function diaSemana(dataISO) {
  return new Date(`${dataISO}T12:00:00Z`).getUTCDay(); // 0 = domingo
}

export function diferencaEmDias(dataISO, outraISO) {
  const um = Date.parse(`${dataISO}T12:00:00Z`);
  const outro = Date.parse(`${outraISO}T12:00:00Z`);
  return Math.round((um - outro) / 86400000);
}

// Domingo é o primeiro dia da semana, para casar com o calendário brasileiro.
export function inicioDaSemana(dataISO) {
  return somarDias(dataISO, -diaSemana(dataISO));
}

// O hábito é cobrado nesse dia?
// `contexto.feitosNaSemana` só importa para a frequência "X vezes por semana":
// ela deixa de aparecer no checklist quando a meta da semana já foi batida.
export function devido(habito, dataISO, contexto = {}) {
  const inicio = (habito.criado_em || dataISO).slice(0, 10);
  if (dataISO < inicio) return false;

  const frequencia = habito.frequencia || { tipo: "diaria" };

  switch (frequencia.tipo) {
    case "dias_semana":
      return (frequencia.dias || []).includes(diaSemana(dataISO));

    case "cada_n_dias": {
      const n = Math.max(1, Number(frequencia.n) || 1);
      return diferencaEmDias(dataISO, inicio) % n === 0;
    }

    case "vezes_semana": {
      const vezes = Math.max(1, Number(frequencia.vezes) || 1);
      if (contexto.feitoNoDia) return true;
      return (contexto.feitosNaSemana || 0) < vezes;
    }

    default:
      return true;
  }
}

export function descreverFrequencia(frequencia = { tipo: "diaria" }) {
  const nomes = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  switch (frequencia.tipo) {
    case "dias_semana":
      return (frequencia.dias || []).map((d) => nomes[d]).join(", ") || "nenhum dia";
    case "cada_n_dias":
      return `a cada ${frequencia.n} dias`;
    case "vezes_semana":
      return `${frequencia.vezes}x por semana`;
    default:
      return "todo dia";
  }
}

// Sequência de um hábito, contando de trás para frente.
// O dia de hoje ainda em aberto não quebra nada, e um dia de folga é pulado:
// não conta ponto, mas também não zera o esforço acumulado.
export function calcularStreak(habito, { concluidos, folgas, feitosPorSemana = {} }, hoje, janela = 400) {
  const frequencia = habito.frequencia || { tipo: "diaria" };

  // "X vezes por semana" é sequência de SEMANAS batidas, não de dias.
  if (frequencia.tipo === "vezes_semana") {
    const vezes = Math.max(1, Number(frequencia.vezes) || 1);
    let semanas = 0;
    for (let i = 0; i < 60; i++) {
      const semana = inicioDaSemana(somarDias(hoje, -i * 7));
      const bateu = (feitosPorSemana[semana] || 0) >= vezes;
      if (bateu) semanas++;
      else if (i === 0) continue; // semana em andamento
      else break;
    }
    return semanas;
  }

  let sequencia = 0;
  for (let i = 0; i < janela; i++) {
    const data = somarDias(hoje, -i);
    if (!devido(habito, data)) continue;

    if (concluidos.has(data)) sequencia++;
    else if (folgas.has(data)) continue;
    else if (i === 0) continue; // hoje ainda em aberto
    else break;
  }
  return sequencia;
}

// Um "dia bom" é o que sustenta a sequência geral do app.
// Se você marcou hábitos como não-negociáveis, valem só eles (foi o que a
// especificação pediu: fazer os âncoras já faz o dia contar).
// Sem âncoras definidas, o critério é 80% dos hábitos cobrados no dia.
export function diaBom(habitosDoDia) {
  if (habitosDoDia.length === 0) return false;

  const ancoras = habitosDoDia.filter((h) => h.nao_negociavel);
  if (ancoras.length > 0) return ancoras.every((h) => h.concluido);

  const feitos = habitosDoDia.filter((h) => h.concluido).length;
  return feitos / habitosDoDia.length >= 0.8;
}
