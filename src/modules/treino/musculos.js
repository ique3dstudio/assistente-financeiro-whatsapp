// Grupos musculares usados pelo mapa corporal e pelo mapa de calor.
export const MUSCULOS = [
  { id: "peito", nome: "Peito", regiao: "frente" },
  { id: "dorsal", nome: "Dorsal", regiao: "costas" },
  { id: "trapezio", nome: "Trapézio", regiao: "costas" },
  { id: "ombro_anterior", nome: "Ombro frontal", regiao: "frente" },
  { id: "ombro_lateral", nome: "Ombro lateral", regiao: "frente" },
  { id: "ombro_posterior", nome: "Ombro posterior", regiao: "costas" },
  { id: "biceps", nome: "Bíceps", regiao: "frente" },
  { id: "triceps", nome: "Tríceps", regiao: "costas" },
  { id: "antebraco", nome: "Antebraço", regiao: "frente" },
  { id: "abdomen", nome: "Abdômen", regiao: "frente" },
  { id: "lombar", nome: "Lombar", regiao: "costas" },
  { id: "quadriceps", nome: "Quadríceps", regiao: "frente" },
  { id: "isquiotibiais", nome: "Posterior de coxa", regiao: "costas" },
  { id: "gluteos", nome: "Glúteos", regiao: "costas" },
  { id: "panturrilha", nome: "Panturrilha", regiao: "costas" },
  { id: "adutores", nome: "Adutores", regiao: "frente" },
  { id: "abdutores", nome: "Abdutores", regiao: "costas" },
];

export const EQUIPAMENTOS = [
  { id: "barra", nome: "Barra" },
  { id: "halter", nome: "Halteres" },
  { id: "maquina", nome: "Máquina" },
  { id: "cabo", nome: "Polia" },
  { id: "peso_corporal", nome: "Peso do corpo" },
  { id: "kettlebell", nome: "Kettlebell" },
  { id: "elastico", nome: "Elástico" },
];

// Séries semanais por grupo muscular que servem de referência para o mapa de
// calor. Não é regra de ouro — é só um alvo para o app dizer "esse aqui está
// em déficit essa semana".
export const ALVO_SEMANAL_SERIES = {
  peito: 12, dorsal: 14, trapezio: 6, ombro_anterior: 6, ombro_lateral: 8,
  ombro_posterior: 8, biceps: 8, triceps: 8, antebraco: 4, abdomen: 8,
  lombar: 6, quadriceps: 12, isquiotibiais: 10, gluteos: 10, panturrilha: 8,
  adutores: 4, abdutores: 4,
};

export function nomeDoMusculo(id) {
  return MUSCULOS.find((m) => m.id === id)?.nome || id;
}
