// Transcrição de áudio (notas de voz do WhatsApp) via Groq — hospeda o Whisper
// open-source de graça dentro do uso normal de um app pessoal (limite generoso,
// sem cartão de crédito para começar). Chave grátis em console.groq.com.
//
// Usa o SDK da OpenAI porque a Groq expõe uma API compatível — mesmo padrão já
// usado no restante do projeto para provedores "OpenAI-compatible".
import OpenAI, { toFile } from "openai";

const MODEL = process.env.GROQ_MODEL || "whisper-large-v3-turbo";

let cliente;
function getCliente() {
  if (!cliente) {
    cliente = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  }
  return cliente;
}

export async function transcrever(bufferAudio, nomeArquivo = "audio.ogg") {
  const arquivo = await toFile(bufferAudio, nomeArquivo);

  const resposta = await getCliente().audio.transcriptions.create({
    model: MODEL,
    file: arquivo,
    language: "pt",
  });

  return resposta.text?.trim() || "";
}
