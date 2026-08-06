// Provedor atual: Anthropic (Claude).
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

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

const TOOL = {
  name: "registrar_transacao",
  description:
    "Registra um lançamento financeiro (receita ou despesa) extraído da mensagem do usuário.",
  input_schema: {
    type: "object",
    properties: {
      valor: { type: "number", description: "Valor em reais" },
      tipo: { type: "string", enum: ["receita", "despesa"] },
      categoria: { type: "string", enum: CATEGORIAS },
      descricao: { type: "string", description: "Descrição curta, opcional" },
    },
    required: ["valor", "tipo", "categoria"],
  },
};

const SYSTEM_PROMPT = `Você é um assistente financeiro que interpreta mensagens de WhatsApp em português do Brasil.
Se a mensagem descrever um lançamento financeiro (um gasto ou um recebimento de dinheiro), use a ferramenta
registrar_transacao com os dados extraídos. Se a mensagem NÃO for um lançamento financeiro (ex: saudação, pergunta,
comando como "resumo do mês"), não use nenhuma ferramenta.`;

let client;
function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function interpretarMensagem(texto) {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: texto }],
    tools: [TOOL],
  });

  const toolUse = response.content.find(
    (bloco) => bloco.type === "tool_use" && bloco.name === "registrar_transacao"
  );

  if (!toolUse) {
    return null;
  }

  const { valor, tipo, categoria, descricao } = toolUse.input;
  return { valor, tipo, categoria, descricao: descricao || "" };
}
