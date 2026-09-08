// Quanto cada bebida realmente hidrata. Café e álcool entram descontando,
// como pede a especificação: 500 ml de cerveja não são 500 ml de água.
export const BEBIDAS = {
  agua: { nome: "Água", emoji: "💧", fator: 1 },
  cha: { nome: "Chá", emoji: "🍵", fator: 1 },
  suco: { nome: "Suco", emoji: "🧃", fator: 0.9 },
  refrigerante: { nome: "Refrigerante", emoji: "🥤", fator: 0.8 },
  cafe: { nome: "Café", emoji: "☕", fator: 0.6 },
  alcool: { nome: "Álcool", emoji: "🍺", fator: -0.5 },
};

export function fatorDaBebida(bebida) {
  return BEBIDAS[bebida]?.fator ?? 1;
}

// Meta diária: 35 ml por quilo, arredondado para 100 ml. Sem peso cadastrado,
// cai no padrão de 2,5 L. Dia de treino ganha meio litro a mais.
export function metaPorPeso(pesoKg, { diaDeTreino = false } = {}) {
  const base = pesoKg ? Math.round((pesoKg * 35) / 100) * 100 : 2500;
  return base + (diaDeTreino ? 500 : 0);
}

// Quanto você já deveria ter bebido até esta hora, espalhando a meta entre
// 7h e 22h. Serve para o app avisar só quando você está de fato atrasado.
export function esperadoAte(hora, meta, { inicio = 7, fim = 22 } = {}) {
  if (hora <= inicio) return 0;
  if (hora >= fim) return meta;
  return Math.round((meta * (hora - inicio)) / (fim - inicio));
}
