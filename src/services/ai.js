// Provedor atual: Google Gemini (grátis, usado enquanto o projeto está em teste).
// Pode ser trocado por Anthropic/Claude no futuro sem mudar a assinatura de interpretarMensagem().
import { GoogleGenAI, Type } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const CATEGORIAS = [
  "alimentacao",
  "transporte",
  "moradia",
  "saude",
  "educacao",
  "lazer",
  "compras",
  "servicos",
  "salario",
  "freelance",
  "investimentos",
  "outros",
];

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    eh_lancamento_financeiro: { type: Type.BOOLEAN },
    valor: { type: Type.NUMBER },
    tipo: { type: Type.STRING, enum: ["receita", "despesa"] },
    categoria: { type: Type.STRING, enum: CATEGORIAS },
    descricao: { type: Type.STRING },
  },
  required: ["eh_lancamento_financeiro"],
};

const SYSTEM_PROMPT = `Você é um assistente financeiro que interpreta mensagens de WhatsApp em português do Brasil.
Para cada mensagem, decida se ela descreve um lançamento financeiro (um gasto ou um recebimento de dinheiro).
Se for, preencha valor (número), tipo ("receita" ou "despesa") e a categoria mais adequada da lista permitida.
Se a mensagem não for um lançamento financeiro (ex: uma saudação, uma pergunta, um comando como "resumo do mês"),
defina eh_lancamento_financeiro como false e não preencha os outros campos.`;

let client;
function getClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

export async function interpretarMensagem(texto) {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: texto,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const dados = JSON.parse(response.text);

  if (!dados.eh_lancamento_financeiro) {
    return null;
  }

  return {
    valor: dados.valor,
    tipo: dados.tipo,
    categoria: dados.categoria,
    descricao: dados.descricao || "",
  };
}
