import { Router } from "express";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Entrada rápida por IA da Loja 3D: transforma um texto curto, foto de recibo ou áudio em um
// lançamento financeiro pré-preenchido (o operador sempre confere e confirma antes de salvar —
// isso nunca grava nada sozinho). Cada rota exige o token de sessão do Supabase do usuário
// logado, porque chama uma API paga e não pode ficar aberta pra qualquer um na internet.
//
// Provedor: NVIDIA Build (mesmo provedor gratuito já usado pelo assistente do WhatsApp em
// src/services/ai.js — reaproveita a mesma chave NVIDIA_API_KEY, sem custo). Texto usa o
// modelo de chat padrão; foto usa um modelo com visão. Pede o resultado em JSON no próprio
// texto da resposta (em vez de function-calling) porque nem todo modelo hospedado na NVIDIA
// tem suporte confiável a tool-calling — isso funciona com qualquer modelo de chat.

const router = Router();

let nvidiaClient;
function getNvidiaClient() {
  if (!nvidiaClient) {
    nvidiaClient = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: "https://integrate.api.nvidia.com/v1" });
  }
  return nvidiaClient;
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

const SYSTEM_PROMPT =
  "Você ajuda a lançar movimentações financeiras de uma oficina de impressão 3D no Brasil, a partir de uma " +
  "descrição em português (texto, foto de recibo/nota ou transcrição de áudio). Responda APENAS com um objeto " +
  "JSON, sem nenhum texto antes ou depois, sem markdown, no formato exato:\n" +
  '{"valor": <número positivo em reais>, "tipo": "entrada" ou "saida", "categoria_sugerida": ' +
  '"<uma destas: Filamento/Resina, Energia elétrica, Manutenção de máquina, Embalagem, Taxa de marketplace, ' +
  'Marketing/Divulgação, Assinaturas/Software, Pró-labore / retirada, Venda de pedidos, Outras despesas, Outras receitas>", ' +
  '"descricao": "<descrição curta>"}\n' +
  '"entrada" = dinheiro recebido, "saida" = dinheiro gasto. Sempre tente encontrar um valor, mesmo que a ' +
  "informação esteja incompleta — o valor é o campo mais importante.";

// O modelo às vezes cerca o JSON com ```json ... ``` ou frases soltas, mesmo pedindo pra não fazer isso —
// extrai só o primeiro bloco { ... } da resposta antes de tentar o JSON.parse.
function extrairJson(texto) {
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (typeof obj.valor !== "number" || !obj.valor || !["entrada", "saida"].includes(obj.tipo)) return null;
    return obj;
  } catch {
    return null;
  }
}

async function interpretarTexto(texto) {
  const client = getNvidiaClient();
  const model = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: texto },
    ],
    temperature: 0.2,
  });

  return extrairJson(response.choices[0].message.content || "");
}

async function interpretarFoto(imagemBase64, mimeType) {
  const client = getNvidiaClient();
  const model = process.env.NVIDIA_VISION_MODEL || "meta/llama-3.2-11b-vision-instruct";

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Extraia o lançamento financeiro dessa foto (recibo, nota fiscal ou comprovante)." },
          { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imagemBase64}` } },
        ],
      },
    ],
    temperature: 0.2,
  });

  return extrairJson(response.choices[0].message.content || "");
}

router.post("/interpretar-texto", async (req, res) => {
  try {
    const texto = typeof req.body?.texto === "string" ? req.body.texto.trim() : "";
    if (!texto) return res.status(400).json({ error: "Informe uma descrição." });

    const resultado = await interpretarTexto(texto);
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

    const resultado = await interpretarFoto(imagemBase64, mimeType);
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

    // Transcrição continua via Whisper (OpenAI de verdade, opcional e paga à parte) — não
    // achei uma forma de verificar com segurança o contrato exato do endpoint de áudio da
    // NVIDIA sem acesso à documentação deles neste ambiente, então não arrisquei implementar
    // às cegas. Depois de transcrito, o texto passa pelo mesmo interpretarTexto() (NVIDIA/grátis).
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const buffer = Buffer.from(audioBase64, "base64");
    const extensao = (mimeType || "audio/webm").split("/")[1]?.split(";")[0] || "webm";
    const arquivo = await OpenAI.toFile(buffer, `audio.${extensao}`);

    const transcricao = await openai.audio.transcriptions.create({
      file: arquivo,
      model: "whisper-1",
      language: "pt",
    });

    const resultado = await interpretarTexto(transcricao.text);
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
