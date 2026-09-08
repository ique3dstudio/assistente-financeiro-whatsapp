// Contas do módulo Vícios — funções puras (scripts/test-vicios.js).
//
// A linha do tempo de recuperação abaixo é informação geral de saúde pública,
// usada como encorajamento. Não é diagnóstico, e a tela do módulo deixa isso
// escrito junto com um contato de apoio de verdade.

export const TIPOS = [
  { id: "cigarro", nome: "Cigarro", emoji: "🚭" },
  { id: "alcool", nome: "Álcool", emoji: "🍺" },
  { id: "acucar", nome: "Açúcar", emoji: "🍬" },
  { id: "apostas", nome: "Apostas", emoji: "🎲" },
  { id: "pornografia", nome: "Pornografia", emoji: "🚫" },
  { id: "redes_sociais", nome: "Redes sociais", emoji: "📱" },
  { id: "unhas", nome: "Roer unhas", emoji: "💅" },
  { id: "outro", nome: "Outro", emoji: "🎯" },
];

export const MARCOS = [1, 3, 7, 14, 30, 60, 90, 180, 365, 730];

// Contador ao vivo desde a data de início.
export function contador(dataInicio, agora = new Date()) {
  const inicio = new Date(dataInicio);
  const segundosTotais = Math.max(0, Math.floor((agora.getTime() - inicio.getTime()) / 1000));

  return {
    total_segundos: segundosTotais,
    dias: Math.floor(segundosTotais / 86400),
    horas: Math.floor((segundosTotais % 86400) / 3600),
    minutos: Math.floor((segundosTotais % 3600) / 60),
    segundos: segundosTotais % 60,
  };
}

export function proximoMarco(dias) {
  const alvo = MARCOS.find((marco) => marco > dias);
  if (!alvo) return null;
  return { dias: alvo, faltam: alvo - dias };
}

export function marcosAlcancados(dias) {
  return MARCOS.filter((marco) => marco <= dias);
}

// Dinheiro e tempo que você não gastou — com projeção, que é o número que
// convence numa terça-feira difícil.
export function economia(custoDiario, tempoDiarioMin, dias) {
  const porDia = Number(custoDiario) || 0;
  const minutosPorDia = Number(tempoDiarioMin) || 0;

  return {
    dinheiro: Number((porDia * dias).toFixed(2)),
    dinheiro_6m: Number((porDia * 182).toFixed(2)),
    dinheiro_12m: Number((porDia * 365).toFixed(2)),
    horas: Math.round((minutosPorDia * dias) / 60),
    dias_de_vida: Number(((minutosPorDia * dias) / 1440).toFixed(1)),
  };
}

// Onde a vontade te pega: horário, dia da semana, gatilho e emoção.
export function mapaGatilhos(fissuras) {
  if (fissuras.length === 0) return { total: 0, cedeu: 0, taxa_cedeu: 0, por_faixa: [], por_gatilho: [], por_emocao: [], por_dia_semana: [] };

  const FAIXAS = [
    { id: "manha", nome: "Manhã (6h–12h)", de: 6, ate: 12 },
    { id: "tarde", nome: "Tarde (12h–18h)", de: 12, ate: 18 },
    { id: "noite", nome: "Noite (18h–24h)", de: 18, ate: 24 },
    { id: "madrugada", nome: "Madrugada (0h–6h)", de: 0, ate: 6 },
  ];

  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  const contar = (chave) => {
    const mapa = {};
    for (const fissura of fissuras) {
      const valor = chave(fissura);
      if (!valor) continue;
      mapa[valor] ||= { nome: valor, total: 0, cedeu: 0 };
      mapa[valor].total++;
      if (fissura.cedeu) mapa[valor].cedeu++;
    }
    return Object.values(mapa).sort((a, b) => b.total - a.total);
  };

  const hora = (fissura) => Number(String(fissura.hora || "12:00").slice(0, 2));
  const cedeu = fissuras.filter((f) => f.cedeu).length;

  return {
    total: fissuras.length,
    cedeu,
    taxa_cedeu: Number((cedeu / fissuras.length).toFixed(2)),
    intensidade_media: Number((fissuras.reduce((t, f) => t + Number(f.intensidade || 0), 0) / fissuras.length).toFixed(1)),
    por_faixa: FAIXAS.map((faixa) => ({
      ...faixa,
      total: fissuras.filter((f) => hora(f) >= faixa.de && hora(f) < faixa.ate).length,
    })).sort((a, b) => b.total - a.total),
    por_gatilho: contar((f) => f.gatilho),
    por_emocao: contar((f) => f.emocao),
    por_dia_semana: DIAS.map((nome, indice) => ({
      nome,
      total: fissuras.filter((f) => new Date(`${f.data}T12:00:00Z`).getUTCDay() === indice).length,
    })).sort((a, b) => b.total - a.total),
  };
}

// O que costuma acontecer com o passar dos dias, por tipo. Encorajamento com
// base em informação de saúde pública — não é promessa médica.
const LINHAS = {
  cigarro: [
    { dias: 0, texto: "Nas primeiras 20 minutos, pulsação e pressão começam a normalizar." },
    { dias: 1, texto: "Em 24 horas, o monóxido de carbono já saiu do sangue." },
    { dias: 2, texto: "Em 48 horas, paladar e olfato começam a voltar." },
    { dias: 3, texto: "Em 72 horas, respirar fica mais fácil — os brônquios relaxam." },
    { dias: 14, texto: "Em 2 semanas, circulação e capacidade física melhoram." },
    { dias: 30, texto: "Em 1 mês, a tosse e o cansaço tendem a diminuir." },
    { dias: 90, texto: "Em 3 meses, a função pulmonar aumenta de forma perceptível." },
    { dias: 365, texto: "Em 1 ano, o risco cardiovascular cai de forma significativa." },
  ],
  alcool: [
    { dias: 1, texto: "Em 24 horas, o sono começa a ficar mais profundo." },
    { dias: 3, texto: "Em 3 dias, hidratação e disposição melhoram." },
    { dias: 7, texto: "Em 1 semana, muita gente relata mais clareza mental." },
    { dias: 30, texto: "Em 1 mês, fígado e pressão tendem a melhorar." },
    { dias: 90, texto: "Em 3 meses, sono, humor e pele mostram diferença." },
    { dias: 365, texto: "Em 1 ano, o risco de várias doenças cai bastante." },
  ],
  acucar: [
    { dias: 3, texto: "Em 3 dias, a vontade forte tende a diminuir." },
    { dias: 7, texto: "Em 1 semana, a energia fica mais estável durante o dia." },
    { dias: 30, texto: "Em 1 mês, paladar recalibrado: fruta volta a parecer doce." },
    { dias: 90, texto: "Em 3 meses, marcadores de inflamação e glicemia tendem a melhorar." },
  ],
  redes_sociais: [
    { dias: 1, texto: "No primeiro dia, o impulso de pegar o celular aparece muitas vezes — é esperado." },
    { dias: 7, texto: "Em 1 semana, a atenção começa a segurar mais tempo numa coisa só." },
    { dias: 30, texto: "Em 1 mês, sono e ansiedade tendem a melhorar." },
  ],
  outro: [
    { dias: 1, texto: "O primeiro dia é o mais difícil — e você já está nele." },
    { dias: 7, texto: "Uma semana muda a rotina em volta do hábito." },
    { dias: 30, texto: "Um mês é tempo suficiente para o gatilho perder força." },
    { dias: 90, texto: "Três meses é quando a identidade acompanha o comportamento." },
  ],
};

export function linhaRecuperacao(tipo, dias) {
  const linha = LINHAS[tipo] || LINHAS.outro;
  return linha.map((etapa) => ({ ...etapa, alcancado: dias >= etapa.dias }));
}

// Sequência de compromissos cumpridos, contando de trás para frente.
export function sequenciaPledge(pledges, hojeISO) {
  const porData = new Map(pledges.map((p) => [p.data, p]));
  let sequencia = 0;

  for (let i = 0; i < 400; i++) {
    const data = new Date(Date.parse(`${hojeISO}T12:00:00Z`) - i * 86400000).toISOString().slice(0, 10);
    const pledge = porData.get(data);

    if (pledge?.cumprido) sequencia++;
    else if (i === 0) continue; // o dia de hoje ainda está em aberto
    else break;
  }

  return sequencia;
}

// Recaída: o contador volta a zero, o recorde não.
export function aplicarRecaida(vicio, agora = new Date()) {
  const diasAtuais = contador(vicio.data_inicio, agora).dias;
  return {
    recorde_dias: Math.max(Number(vicio.recorde_dias) || 0, diasAtuais),
    dias_perdidos: diasAtuais,
    data_inicio: agora.toISOString(),
  };
}
