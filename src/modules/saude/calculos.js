// Contas do módulo Saúde — funções puras (scripts/test-saude.js).
//
// Nota: as faixas de referência abaixo são informação publicada, usada só para
// dizer se um valor está dentro ou fora da faixa. O app não diagnostica nada e
// a tela deixa isso escrito.

export const TIPOS_SINAL = [
  { id: "pressao", nome: "Pressão", unidade: "mmHg", dois_valores: true },
  { id: "fc_repouso", nome: "Frequência de repouso", unidade: "bpm" },
  { id: "peso", nome: "Peso", unidade: "kg" },
  { id: "glicemia", nome: "Glicemia", unidade: "mg/dL" },
  { id: "saturacao", nome: "Saturação", unidade: "%" },
  { id: "temperatura", nome: "Temperatura", unidade: "°C" },
];

// Marcadores comuns de exame de sangue, com a faixa de referência mais usada
// pelos laboratórios. Serve para preencher rápido — o valor do SEU laudo
// sempre manda, e é editável.
export const MARCADORES = [
  { id: "hemoglobina", nome: "Hemoglobina", unidade: "g/dL", ref_min: 13, ref_max: 17 },
  { id: "glicemia_jejum", nome: "Glicemia de jejum", unidade: "mg/dL", ref_min: 70, ref_max: 99 },
  { id: "hba1c", nome: "Hemoglobina glicada", unidade: "%", ref_min: 4, ref_max: 5.6 },
  { id: "colesterol_total", nome: "Colesterol total", unidade: "mg/dL", ref_min: 0, ref_max: 190 },
  { id: "hdl", nome: "HDL", unidade: "mg/dL", ref_min: 40, ref_max: 100 },
  { id: "ldl", nome: "LDL", unidade: "mg/dL", ref_min: 0, ref_max: 130 },
  { id: "triglicerides", nome: "Triglicérides", unidade: "mg/dL", ref_min: 0, ref_max: 150 },
  { id: "vitamina_d", nome: "Vitamina D", unidade: "ng/mL", ref_min: 30, ref_max: 60 },
  { id: "vitamina_b12", nome: "Vitamina B12", unidade: "pg/mL", ref_min: 200, ref_max: 900 },
  { id: "tsh", nome: "TSH", unidade: "µUI/mL", ref_min: 0.4, ref_max: 4 },
  { id: "ferritina", nome: "Ferritina", unidade: "ng/mL", ref_min: 30, ref_max: 400 },
  { id: "creatinina", nome: "Creatinina", unidade: "mg/dL", ref_min: 0.7, ref_max: 1.3 },
  { id: "testosterona", nome: "Testosterona total", unidade: "ng/dL", ref_min: 300, ref_max: 1000 },
];

export function classificarMarcador(valor, refMin, refMax) {
  const numero = Number(valor);
  if (refMin !== null && refMin !== undefined && numero < Number(refMin)) return "abaixo";
  if (refMax !== null && refMax !== undefined && numero > Number(refMax)) return "acima";
  return "normal";
}

// Doses de hoje: respeita frequência e dias da semana escolhidos.
export function dosesDoDia(medicamento, dataISO, diaDaSemana) {
  if (medicamento.frequencia === "se_necessario") return [];
  if (medicamento.inicio && dataISO < medicamento.inicio) return [];
  if (medicamento.fim && dataISO > medicamento.fim) return [];
  if (medicamento.frequencia === "dias_semana" && !(medicamento.dias_semana || []).includes(diaDaSemana)) return [];

  return (medicamento.horarios || []).map((horario) => String(horario).slice(0, 5)).sort();
}

// Quantos dias o estoque ainda cobre, e se está na hora de recomprar.
export function estoque(medicamento) {
  const dosesPorDia = (medicamento.horarios || []).length || 1;
  const atual = medicamento.estoque_atual === null || medicamento.estoque_atual === undefined ? null : Number(medicamento.estoque_atual);
  if (atual === null) return { dias: null, recomprar: false };

  const dias = Math.floor(atual / dosesPorDia);
  return { dias, recomprar: dias <= Number(medicamento.estoque_alerta ?? 7) };
}

// Rotina de saúde: quando vence a próxima e se já passou.
export function proximaRecorrencia(recorrencia, hojeISO) {
  if (!recorrencia.ultima_em) return { proxima: hojeISO, vencida: true, dias: 0 };

  const [ano, mes, dia] = recorrencia.ultima_em.split("-").map(Number);
  const total = ano * 12 + (mes - 1) + Number(recorrencia.cada_meses);
  const mesAlvo = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  const ultimoDia = new Date(Date.UTC(Number(mesAlvo.slice(0, 4)), Number(mesAlvo.slice(5, 7)), 0)).getUTCDate();
  const proxima = `${mesAlvo}-${String(Math.min(dia, ultimoDia)).padStart(2, "0")}`;

  const dias = Math.round((Date.parse(`${proxima}T12:00:00Z`) - Date.parse(`${hojeISO}T12:00:00Z`)) / 86400000);
  return { proxima, vencida: dias <= 0, dias };
}

// Sono que atravessa a meia-noite: 23:30 → 07:15 dá 7h45, não menos oito horas.
export function duracaoSono(dormiuEm, acordouEm) {
  if (!dormiuEm || !acordouEm) return null;

  const minutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
  const inicio = minutos(dormiuEm);
  const fim = minutos(acordouEm);

  return fim >= inicio ? fim - inicio : 1440 - inicio + fim;
}

export function formatarDuracao(minutos) {
  if (minutos === null || minutos === undefined) return "—";
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}`;
}

// Faixas de pressão publicadas (referência, não diagnóstico).
export function classificarPressao(sistolica, diastolica) {
  const s = Number(sistolica);
  const d = Number(diastolica);

  if (s < 120 && d < 80) return { id: "otima", nome: "Ótima" };
  if (s < 130 && d < 85) return { id: "normal", nome: "Normal" };
  if (s < 140 && d < 90) return { id: "limitrofe", nome: "Limítrofe" };
  if (s < 160 && d < 100) return { id: "elevada_1", nome: "Elevada (estágio 1)" };
  if (s < 180 && d < 110) return { id: "elevada_2", nome: "Elevada (estágio 2)" };
  return { id: "elevada_3", nome: "Muito elevada" };
}
