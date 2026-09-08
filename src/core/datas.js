// Tudo no app gira em torno do "dia de hoje" no seu fuso, não no fuso do servidor
// (o Render roda em UTC, o que faria o dia virar às 21h de Brasília).
const FUSO = process.env.APP_TIMEZONE || "America/Sao_Paulo";

export function hoje() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date()); // AAAA-MM-DD
}

export function somarDias(dataISO, dias) {
  const data = new Date(`${dataISO}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

// Lista de datas do mais antigo para o mais recente, terminando em `fim`.
export function ultimosDias(quantidade, fim = hoje()) {
  return Array.from({ length: quantidade }, (_, i) => somarDias(fim, i - (quantidade - 1)));
}

// Hora local (0-23) no fuso configurado — usada pela saudação e pelo bloco de
// fechamento do dia, que só aparece à noite.
export function horaAgora() {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", hour12: false }).format(new Date()));
}

export function saudacao(hora = horaAgora()) {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
