import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Entrada rápida por IA da Loja 3D: transforma um texto curto, foto de recibo ou áudio em um
// lançamento financeiro pré-preenchido (o operador sempre confere e confirma antes de salvar —
// isso nunca grava nada sozinho). Cada rota exige o token de sessão do Supabase do usuário
// logado, porque chama uma API paga e não pode ficar aberta pra qualquer um na internet.

const router = Router();

let anthropicClient;
function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

let supabaseAuthClient;
function getSupabaseAuthClient() {
  if (!supabaseAuthClient) {
    supabaseAuthClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  }
  return supabaseAuthClient;
}

async function exigirAutenticacao(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Não autenticado." });

  const { data, error } = await getSupabaseAuthClient().auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: "Sessão inválida ou expirada." });

  next();
}

router.use(exigirAutenticacao);

const TOOL = {
  name: "registrar_lancamento",
  description:
    "Extrai os dados de um lançamento financeiro (entrada ou saída de dinheiro) de uma oficina de impressão 3D.",
  input_schema: {
    type: "object",
    properties: {
      valor: { type: "number", description: "Valor em reais, sempre um número positivo" },
      tipo: { type: "string", enum: ["entrada", "saida"], description: "entrada = dinheiro recebido, saida = dinheiro gasto" },
      categoria_sugerida: {
        type: "string",
        description:
          'Nome curto de categoria financeira, ex: "Filamento/Resina", "Energia elétrica", "Manutenção de máquina", ' +
          '"Embalagem", "Taxa de marketplace", "Marketing/Divulgação", "Assinaturas/Software", "Pró-labore / retirada", ' +
          '"Venda de pedidos", "Outras despesas", "Outras receitas". Use o mais parecido possível, mesmo que não seja exato.',
      },
      descricao: { type: "string", description: "Descrição curta (poucas palavras) do lançamento" },
    },
    required: ["valor", "tipo", "descricao"],
  },
};

const SYSTEM_PROMPT =
  "Você ajuda a lançar movimentações financeiras de uma oficina de impressão 3D no Brasil, a partir de uma " +
  "descrição em português (texto, foto de recibo/nota ou transcrição de áudio). Sempre chame a função " +
  "registrar_lancamento com sua melhor interpretação, mesmo que a informação esteja incompleta — o valor é o " +
  "campo mais importante, tente sempre encontrá-lo.";

async function interpretar(content) {
  const client = getAnthropicClient();
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const response = await client.messages.create({
    model,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "registrar_lancamento" },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find((bloco) => bloco.type === "tool_use");
  return toolUse ? toolUse.input : null;
}

router.post("/interpretar-texto", async (req, res) => {
  try {
    const texto = typeof req.body?.texto === "string" ? req.body.texto.trim() : "";
    if (!texto) return res.status(400).json({ error: "Informe uma descrição." });

    const resultado = await interpretar(texto);
    if (!resultado) return res.status(422).json({ error: "Não consegui identificar um lançamento nesse texto." });
    res.json(resultado);
  } catch (err) {
    console.error("Erro em /interpretar-texto:", err);
    res.status(500).json({ error: "Erro ao interpretar com IA." });
  }
});

router.post("/interpretar-foto", async (req, res) => {
  try {
    const { imagemBase64, mimeType } = req.body || {};
    if (!imagemBase64) return res.status(400).json({ error: "Envie a foto." });

    const resultado = await interpretar([
      { type: "image", source: { type: "base64", media_type: mimeType || "image/jpeg", data: imagemBase64 } },
      { type: "text", text: "Extraia o lançamento financeiro dessa foto (recibo, nota fiscal ou comprovante)." },
    ]);
    if (!resultado) return res.status(422).json({ error: "Não consegui identificar um lançamento nessa foto." });
    res.json(resultado);
  } catch (err) {
    console.error("Erro em /interpretar-foto:", err);
    res.status(500).json({ error: "Erro ao interpretar com IA." });
  }
});

router.post("/interpretar-audio", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(501).json({ error: "Transcrição de áudio não está configurada neste servidor (falta OPENAI_API_KEY)." });
    }
    const { audioBase64, mimeType } = req.body || {};
    if (!audioBase64) return res.status(400).json({ error: "Envie o áudio." });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const buffer = Buffer.from(audioBase64, "base64");
    const extensao = (mimeType || "audio/webm").split("/")[1]?.split(";")[0] || "webm";
    const arquivo = await OpenAI.toFile(buffer, `audio.${extensao}`);

    const transcricao = await openai.audio.transcriptions.create({
      file: arquivo,
      model: "whisper-1",
      language: "pt",
    });

    const resultado = await interpretar(transcricao.text);
    if (!resultado) {
      return res.status(422).json({ error: "Não consegui identificar um lançamento nesse áudio.", transcricao: transcricao.text });
    }
    res.json({ ...resultado, transcricao: transcricao.text });
  } catch (err) {
    console.error("Erro em /interpretar-audio:", err);
    res.status(500).json({ error: "Erro ao interpretar com IA." });
  }
});

export default router;
