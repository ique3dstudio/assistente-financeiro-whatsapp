// Provedor atual: NVIDIA Build (gratuito, usado para testes).
// O destino final é migrar para a Anthropic/Claude — ver histórico do Git para a versão de referência.
import OpenAI from "openai";

const MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";

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

const TOOLS = [
  {
    type: "function",
    function: {
      name: "registrar_transacao",
      description:
        "Registra um lançamento financeiro (receita ou despesa) extraído da mensagem do usuário.",
      parameters: {
        type: "object",
        properties: {
          valor: { type: "number", description: "Valor em reais" },
          tipo: { type: "string", enum: ["receita", "despesa"] },
          categoria: { type: "string", enum: CATEGORIAS },
          descricao: { type: "string", description: "Descrição curta, opcional" },
        },
        required: ["valor", "tipo", "categoria"],
      },
    },
  },
];

const SYSTEM_PROMPT = `Você é um assistente financeiro que interpreta mensagens de WhatsApp em português do Brasil.
Se a mensagem descrever um lançamento financeiro (um gasto ou um recebimento de dinheiro), chame a função
registrar_transacao com os dados extraídos. Se a mensagem NÃO for um lançamento financeiro (ex: saudação, pergunta,
comando como "resumo do mês"), não chame nenhuma função.`;

let client;
function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
  }
  return client;
}

export async function interpretarMensagem(texto) {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: texto },
    ],
    tools: TOOLS,
  });

  const toolCall = response.choices[0].message.tool_calls?.[0];

  if (!toolCall) {
    return null;
  }

  const { valor, tipo, categoria, descricao } = JSON.parse(toolCall.function.arguments);
  return { valor: Number(valor), tipo, categoria, descricao: descricao || "" };
}
