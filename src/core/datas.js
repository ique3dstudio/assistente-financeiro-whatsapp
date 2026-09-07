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
