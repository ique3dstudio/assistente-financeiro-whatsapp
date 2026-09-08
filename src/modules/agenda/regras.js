// Recorrência e conflitos de agenda — funções puras (scripts/test-agenda.js).
import { somarDias } from "../../core/datas.js";
import { diaSemana } from "../habitos/regras.js";

export const TIPOS = [
  { id: "reuniao", nome: "Reunião", emoji: "👥", cor: "#818cf8" },
  { id: "consulta", nome: "Consulta", emoji: "🩺", cor: "#f472b6" },
  { id: "treino", nome: "Treino", emoji: "🏋️", cor: "#4ade80" },
  { id: "pessoal", nome: "Pessoal", emoji: "📌", cor: "#3ba9f4" },
  { id: "viagem", nome: "Viagem", emoji: "✈️", cor: "#fbbf24" },
  { id: "financeiro", nome: "Vencimento", emoji: "💳", cor: "#f87171" },
];

export const PRIORIDADES = [
  { id: 1, nome: "Alta", emoji: "🔴" },
  { id: 2, nome: "Média", emoji: "🟡" },
  { id: 3, nome: "Baixa", emoji: "⚪" },
];

// Em quais datas de um intervalo este evento acontece.
export function ocorrencias(evento, deISO, ateISO) {
  const regra = evento.recorrencia || { tipo: "nenhuma" };
  const base = evento.data;
  const limite = regra.ate && regra.ate < ateISO ? regra.ate : ateISO;

  if (regra.tipo === "nenhuma") {
    return base >= deISO && base <= limite ? [base] : [];
  }

  const datas = [];
  let data = deISO > base ? deISO : base;

  // Intervalos de agenda são curtos (dia, semana, mês), então varrer dia a dia
  // é simples e rápido o bastante — e evita erro de cálculo de calendário.
  while (data <= limite) {
    if (aconteceEm(evento, data)) datas.push(data);
    data = somarDias(data, 1);
  }
  return datas;
}

export function aconteceEm(evento, dataISO) {
  const regra = evento.recorrencia || { tipo: "nenhuma" };
  if (dataISO < evento.data) return false;
  if (regra.ate && dataISO > regra.ate) return false;

  switch (regra.tipo) {
    case "diaria":
      return true;
    case "semanal":
      return (regra.dias?.length ? regra.dias : [diaSemana(evento.data)]).includes(diaSemana(dataISO));
    case "mensal":
      return Number(dataISO.slice(8, 10)) === Number(regra.dia || evento.data.slice(8, 10));
    case "cada_n_dias": {
      const n = Math.max(1, Number(regra.n) || 1);
      const dias = Math.round((Date.parse(`${dataISO}T12:00:00Z`) - Date.parse(`${evento.data}T12:00:00Z`)) / 86400000);
      return dias % n === 0;
    }
    default:
      return dataISO === evento.data;
  }
}

export function minutosDoDia(hora) {
  if (!hora) return null;
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function somarMinutos(hora, minutos) {
  const total = (minutosDoDia(hora) ?? 0) + minutos;
  const h = Math.floor(total / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Compromissos que se sobrepõem no mesmo dia — o app avisa em vez de deixar
// você descobrir na hora.
export function conflitos(eventosDoDia) {
  const comHora = eventosDoDia
    .filter((e) => e.hora && !e.dia_inteiro)
    .map((e) => ({ ...e, inicio: minutosDoDia(e.hora), fim: minutosDoDia(e.hora) + (e.duracao_min || 60) }))
    .sort((a, b) => a.inicio - b.inicio);

  const pares = [];
  for (let i = 1; i < comHora.length; i++) {
    if (comHora[i].inicio < comHora[i - 1].fim) {
      pares.push([comHora[i - 1].titulo, comHora[i].titulo]);
    }
  }
  return pares;
}

// "em 2h30" / "agora" / "há 15 min" — a contagem regressiva da tela Hoje.
export function faltaTexto(minutos) {
  if (minutos === null) return "";
  if (minutos < -60) return `há ${Math.floor(-minutos / 60)}h`;
  if (minutos < 0) return `há ${-minutos} min`;
  if (minutos < 5) return "agora";
  if (minutos < 60) return `em ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas < 24) return resto ? `em ${horas}h${String(resto).padStart(2, "0")}` : `em ${horas}h`;
  return `em ${Math.round(horas / 24)} dias`;
}
