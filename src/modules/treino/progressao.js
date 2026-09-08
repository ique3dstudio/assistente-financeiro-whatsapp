// Motor de progressão de carga (E2.5) — o coração do módulo de treino.
//
// Tudo aqui é função pura, testada em scripts/test-treino.js, porque é o
// cálculo que decide o peso que você vai levantar. Errar aqui em silêncio
// estraga meses de treino.

export const REGRAS = [
  { id: "dupla", nome: "Dupla progressão", detalhe: "sobe reps até o teto da faixa, depois sobe o peso" },
  { id: "linear", nome: "Linear", detalhe: "bateu todas as séries no alvo, sobe o peso" },
  { id: "rir", nome: "Por RIR", detalhe: "ajusta o peso para manter o esforço alvo" },
  { id: "percentual_1rm", nome: "% do 1RM", detalhe: "peso calculado sobre o seu 1RM estimado" },
  { id: "nenhuma", nome: "Sem progressão automática", detalhe: "você decide o peso" },
];

// Fórmula de Epley: 1RM ≈ peso × (1 + reps/30). É estimativa, não teste de
// força — serve para comparar você com você mesmo ao longo do tempo.
export function epley1RM(peso, reps) {
  if (!peso || !reps || reps < 1) return 0;
  if (reps === 1) return Number(peso);
  return Number((Number(peso) * (1 + reps / 30)).toFixed(1));
}

export function arredondarPara(valor, incremento = 2.5) {
  const passo = Number(incremento) || 2.5;
  return Math.round(Number(valor) / passo) * passo;
}

const normais = (series) => (series || []).filter((s) => (s.tipo || "normal") === "normal" && s.reps > 0);

export function volume(series) {
  return normais(series).reduce((total, s) => total + Number(s.peso) * s.reps, 0);
}

export function melhor1RM(series) {
  return normais(series).reduce((maior, s) => Math.max(maior, epley1RM(s.peso, s.reps)), 0);
}

export function pesoMaximo(series) {
  return normais(series).reduce((maior, s) => Math.max(maior, Number(s.peso)), 0);
}

function media(numeros) {
  const validos = numeros.filter((n) => n !== null && n !== undefined && !Number.isNaN(Number(n)));
  if (validos.length === 0) return null;
  return validos.reduce((soma, n) => soma + Number(n), 0) / validos.length;
}

// A sugestão de hoje, a partir da última sessão daquele exercício.
export function sugerir(config, ultimaSessao = null) {
  const {
    regra = "dupla",
    series_alvo = 3,
    reps_min = 8,
    reps_max = 12,
    rir_alvo = 2,
    incremento_kg = 2.5,
    percentual_1rm = null,
  } = config || {};

  const series = normais(ultimaSessao?.series);

  if (regra === "nenhuma") {
    return { peso: series.length ? pesoMaximo(series) : null, reps: reps_min, series: series_alvo, motivo: "você decide o peso" };
  }

  if (series.length === 0) {
    return {
      peso: null,
      reps: reps_min,
      series: series_alvo,
      motivo: `primeira vez: escolha um peso que dê para fazer ${reps_min} repetições com ${rir_alvo} de folga`,
    };
  }

  const pesoUsado = pesoMaximo(series);
  const menorReps = Math.min(...series.map((s) => s.reps));
  const completouSeries = series.length >= series_alvo;

  switch (regra) {
    case "linear": {
      const bateu = completouSeries && menorReps >= reps_max;
      return bateu
        ? { peso: pesoUsado + Number(incremento_kg), reps: reps_max, series: series_alvo, motivo: `bateu ${series_alvo}×${reps_max}: subiu ${incremento_kg} kg` }
        : { peso: pesoUsado, reps: reps_max, series: series_alvo, motivo: `repetir ${pesoUsado} kg até fechar ${series_alvo}×${reps_max}` };
    }

    case "dupla": {
      if (completouSeries && menorReps >= reps_max) {
        return {
          peso: pesoUsado + Number(incremento_kg),
          reps: reps_min,
          series: series_alvo,
          motivo: `fechou o teto da faixa (${reps_max}): subiu ${incremento_kg} kg e volta para ${reps_min} reps`,
        };
      }
      const alvo = Math.min(reps_max, menorReps + 1);
      return { peso: pesoUsado, reps: alvo, series: series_alvo, motivo: `mesmo peso, tentando ${alvo} repetições` };
    }

    case "rir": {
      const rirMedio = media(series.map((s) => s.rir));
      const repsMedia = Math.round(media(series.map((s) => s.reps)));

      if (rirMedio === null) {
        return { peso: pesoUsado, reps: repsMedia, series: series_alvo, motivo: "sem RIR registrado na última vez: mantendo o peso" };
      }
      if (rirMedio >= Number(rir_alvo) + 1) {
        return { peso: pesoUsado + Number(incremento_kg), reps: repsMedia, series: series_alvo, motivo: `sobrou folga (RIR ${rirMedio.toFixed(1)}): subiu ${incremento_kg} kg` };
      }
      if (rirMedio <= Number(rir_alvo) - 1) {
        return { peso: Math.max(0, pesoUsado - Number(incremento_kg)), reps: repsMedia, series: series_alvo, motivo: `pesado demais (RIR ${rirMedio.toFixed(1)}): desceu ${incremento_kg} kg` };
      }
      return { peso: pesoUsado, reps: repsMedia, series: series_alvo, motivo: `esforço no alvo (RIR ${rirMedio.toFixed(1)}): mantém` };
    }

    case "percentual_1rm": {
      const umRM = melhor1RM(series);
      const percentual = Number(percentual_1rm) || 75;
      return {
        peso: arredondarPara((umRM * percentual) / 100, incremento_kg),
        reps: reps_min,
        series: series_alvo,
        motivo: `${percentual}% do 1RM estimado (${umRM.toFixed(1)} kg)`,
      };
    }

    default:
      return { peso: pesoUsado, reps: reps_min, series: series_alvo, motivo: "mantendo o peso" };
  }
}

const SESSOES_PARA_ESTAGNAR = 3;

// Estagnação: três sessões sem melhorar o 1RM estimado nem o volume.
// Não basta "não subiu o peso" — subir uma repetição é progresso.
export function detectarEstagnacao(sessoes, config = {}) {
  const validas = (sessoes || []).filter((s) => normais(s.series).length > 0);
  if (validas.length < SESSOES_PARA_ESTAGNAR + 1) {
    return { estagnado: false, sessoes_sem_avanco: 0 };
  }

  const marcas = validas.map((s) => ({ um_rm: melhor1RM(s.series), volume: volume(s.series) }));
  const recentes = marcas.slice(-SESSOES_PARA_ESTAGNAR);
  const anteriores = marcas.slice(0, -SESSOES_PARA_ESTAGNAR);

  const melhorAntes = {
    um_rm: Math.max(...anteriores.map((m) => m.um_rm)),
    volume: Math.max(...anteriores.map((m) => m.volume)),
  };

  const avancou = recentes.some((m) => m.um_rm > melhorAntes.um_rm || m.volume > melhorAntes.volume);
  if (avancou) return { estagnado: false, sessoes_sem_avanco: 0 };

  const pesoAtual = pesoMaximo(validas[validas.length - 1].series);

  return {
    estagnado: true,
    sessoes_sem_avanco: SESSOES_PARA_ESTAGNAR,
    sugestoes: [
      `Deload: volte para ${arredondarPara(pesoAtual * 0.9, config.incremento_kg || 2.5)} kg por uma semana e suba de novo.`,
      "Trocar a variação do exercício por 4 a 6 semanas.",
      "Checar sono e comida antes de mexer no treino — estagnação raramente é só treino.",
    ],
  };
}

// Um PR pode ser peso máximo novo ou 1RM estimado novo (subir uma repetição com
// o mesmo peso também é recorde).
export function ehPR(serie, historicoSeries = []) {
  if (!serie?.peso || !serie?.reps) return false;

  const anteriores = normais(historicoSeries);
  if (anteriores.length === 0) return true;

  return epley1RM(serie.peso, serie.reps) > melhor1RM(anteriores) || Number(serie.peso) > pesoMaximo(anteriores);
}
