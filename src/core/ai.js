// Núcleo de interpretação por IA com tool use, rodando na Groq (modelo Llama,
// grátis). Duas camadas:
//   - `interpretar`: genérica, recebe um prompt e uma lista de ferramentas
//     (uma por módulo) e devolve qual foi chamada — usada pela barra de
//     comando (src/core/roteador.js), que decide o módulo certo por mensagem.
//   - `interpretarMensagem`: a original, uma ferramenta só (lançamento
//     financeiro) — usada pelo WhatsApp (src/core/webhook.js), que só entende
//     Finanças por enquanto.
import OpenAI from "openai";

const MODEL = process.env.GROQ_MODEL_TEXTO || "llama-3.3-70b-versatile";

let cliente;
function getCliente() {
  if (!cliente) {
    cliente = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  }
  return cliente;
}

// `tools`: lista de ferramentas no formato da OpenAI function calling. Devolve
// `{ ferramenta, dados }` da que foi chamada, ou null se a IA não chamou
// nenhuma (mensagem não reconhecida em nenhuma das ferramentas oferecidas).
export async function interpretar(texto, { systemPrompt, tools }) {
  const resposta = await getCliente().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: texto },
    ],
    tools,
  });

  const chamada = resposta.choices[0].message.tool_calls?.[0];
  if (!chamada) return null;

  return { ferramenta: chamada.function.name, dados: JSON.parse(chamada.function.arguments) };
}

const PROMPT_FINANCAS = `Você é um assistente financeiro que interpreta mensagens de WhatsApp em português do Brasil,
digitadas ou transcritas de um áudio (podem ter erros de transcrição). Se a mensagem descrever um lançamento
financeiro — um gasto ou um recebimento de dinheiro —, chame a ferramenta registrar_transacao com os dados
extraídos. Se a mensagem NÃO for um lançamento financeiro (saudação, pergunta, pedido de resumo, comentário sem
valor em dinheiro), não chame nenhuma ferramenta.`;

function ferramentaFinancas(nomesCategorias) {
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

// `categoriasDisponiveis`: lista de categorias do usuário (`[{nome, tipo}, ...]`,
// como devolve o service de finanças) — usada só para guiar a escolha da IA,
// nunca trava o resultado: uma categoria fora da lista ainda é aceita, o
// lançamento só fica sem `categoria_id` (ver `salvarTransacao`).
export async function interpretarMensagem(texto, categoriasDisponiveis = []) {
  const nomes = [...new Set(categoriasDisponiveis.map((c) => c.nome))];

  const resultado = await interpretar(texto, {
    systemPrompt: PROMPT_FINANCAS,
    tools: [ferramentaFinancas(nomes)],
  });
  if (!resultado) return null;

  const { valor, tipo, categoria, descricao } = resultado.dados;
  if (!Number.isFinite(Number(valor)) || Number(valor) <= 0) return null;
  if (!["receita", "despesa"].includes(tipo)) return null;

  return { valor: Number(valor), tipo, categoria, descricao: descricao || "" };
}
