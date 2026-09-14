// Interpreta mensagens de WhatsApp (digitadas ou transcritas de um áudio) como
// lançamentos financeiros, usando um modelo Llama hospedado de graça na Groq,
// com tool use: se a mensagem não descrever um gasto ou um recebimento, a IA
// não chama a ferramenta e a função devolve null — quem chama decide o que
// fazer com isso.
//
// Mesmo provedor da transcrição (src/core/transcricao.js), modelo diferente:
// aqui é um Llama de texto, lá é o Whisper.
import OpenAI from "openai";

const MODEL = process.env.GROQ_MODEL_TEXTO || "llama-3.3-70b-versatile";

const PROMPT_SISTEMA = `Você é um assistente financeiro que interpreta mensagens de WhatsApp em português do Brasil,
digitadas ou transcritas de um áudio (podem ter erros de transcrição). Se a mensagem descrever um lançamento
financeiro — um gasto ou um recebimento de dinheiro —, chame a ferramenta registrar_transacao com os dados
extraídos. Se a mensagem NÃO for um lançamento financeiro (saudação, pergunta, pedido de resumo, comentário sem
valor em dinheiro), não chame nenhuma ferramenta.`;

function ferramenta(nomesCategorias) {
  return {
    type: "function",
    function: {
      name: "registrar_transacao",
      description: "Registra um lançamento financeiro (receita ou despesa) extraído da mensagem do usuário.",
      parameters: {
        type: "object",
        properties: {
          valor: { type: "number", description: "Valor em reais, sempre positivo" },
          tipo: { type: "string", enum: ["receita", "despesa"] },
          categoria: {
            type: "string",
            description: nomesCategorias.length
              ? `A categoria existente que melhor combina: ${nomesCategorias.join(", ")}. Se nenhuma combinar bem, sugira um nome curto novo.`
              : "Nome curto da categoria (ex: mercado, transporte, salário)",
          },
          descricao: { type: "string", description: "Descrição curta, opcional" },
        },
        required: ["valor", "tipo", "categoria"],
      },
    },
  };
}

let cliente;
function getCliente() {
  if (!cliente) {
    cliente = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  }
  return cliente;
}

// `categoriasDisponiveis`: lista de categorias do usuário (`[{nome, tipo}, ...]`,
// como devolve o service de finanças) — usada só para guiar a escolha da IA,
// nunca trava o resultado: uma categoria fora da lista ainda é aceita, o
// lançamento só fica sem `categoria_id` (ver `salvarTransacao`).
export async function interpretarMensagem(texto, categoriasDisponiveis = []) {
  const nomes = [...new Set(categoriasDisponiveis.map((c) => c.nome))];

  const resposta = await getCliente().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: PROMPT_SISTEMA },
      { role: "user", content: texto },
    ],
    tools: [ferramenta(nomes)],
  });

  const chamada = resposta.choices[0].message.tool_calls?.[0];
  if (!chamada) return null;

  const { valor, tipo, categoria, descricao } = JSON.parse(chamada.function.arguments);
  if (!Number.isFinite(Number(valor)) || Number(valor) <= 0) return null;
  if (!["receita", "despesa"].includes(tipo)) return null;

  return { valor: Number(valor), tipo, categoria, descricao: descricao || "" };
}
