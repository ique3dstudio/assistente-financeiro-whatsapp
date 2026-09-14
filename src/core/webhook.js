import { Router } from "express";

import { getSupabase } from "./supabase.js";
import { hoje } from "./datas.js";
import { interpretarMensagem } from "./ai.js";
import { transcrever } from "./transcricao.js";
import { baixarMidia, enviarMensagem } from "./whatsapp.js";
import { buscarDuplicataRecente, categorias, salvarTransacao } from "../modules/financas/service.js";

const router = Router();
const USUARIO = process.env.APP_USER_ID || "eu";

// O Meta chama essa rota (GET) uma vez, ao configurar o webhook, só para confirmar
// que o dono do servidor é quem diz ser — comparando o WHATSAPP_VERIFY_TOKEN.
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// Esta rota é pública (o Meta não manda cookie de login) — a única trava é o
// número do remetente ter que bater com o seu (WHATSAPP_MEU_NUMERO). É um app
// de uma pessoa só; qualquer outro número é ignorado, não processado.
function deVoce(numeroRecebido) {
  const so = (numero) => String(numero || "").replace(/\D/g, "");
  const meu = so(process.env.WHATSAPP_MEU_NUMERO);
  return meu.length > 0 && so(numeroRecebido) === meu;
}

async function extrairTexto(mensagem) {
  if (mensagem.type === "text") return (mensagem.text?.body || "").trim();
  if (mensagem.type === "audio") {
    const { buffer } = await baixarMidia(mensagem.audio.id);
    return await transcrever(buffer, "audio.ogg");
  }
  return "";
}

const formatarReais = (valor) => Number(valor).toFixed(2).replace(".", ",");

// O Meta espera uma resposta 200 rápida — se demorar demais, ele reenvia o
// mesmo evento. Por isso a rota confirma o recebimento IMEDIATAMENTE e só
// depois processa a mensagem; a resposta pro usuário vira uma mensagem nova,
// mandada pela API de envio (não dá pra responder direto no corpo do webhook).
router.post("/", async (req, res) => {
  res.sendStatus(200);

  try {
    const valor = req.body?.entry?.[0]?.changes?.[0]?.value;
    const mensagem = valor?.messages?.[0];
    if (!mensagem) return; // recibo de entrega, status, etc — não é mensagem nova

    if (!deVoce(mensagem.from)) {
      console.warn(`[whatsapp] mensagem de número não reconhecido (${mensagem.from}) ignorada`);
      return;
    }

    // Idempotência: se o Meta reenviar o mesmo id, a segunda tentativa de
    // inserir falha (chave primária) e a mensagem não é processada de novo.
    const { error: erroIdempotencia } = await getSupabase()
      .from("whatsapp_mensagens")
      .insert({ id: mensagem.id, user_id: USUARIO, telefone: mensagem.from, tipo: mensagem.type });
    if (erroIdempotencia) return;

    const texto = await extrairTexto(mensagem);
    if (!texto) {
      await enviarMensagem(mensagem.from, 'Não consegui entender essa mensagem. Manda um texto ou áudio tipo "gastei 40 no mercado".');
      return;
    }

    const listaCategorias = await categorias(USUARIO).catch(() => []);
    const interpretado = await interpretarMensagem(texto, listaCategorias);

    await getSupabase().from("whatsapp_mensagens").update({ texto, interpretado }).eq("id", mensagem.id);

    if (!interpretado) {
      await enviarMensagem(
        mensagem.from,
        `Recebi: "${texto}"\n\nNão parece um lançamento financeiro, então não registrei nada. Se for um gasto ou recebimento, manda algo tipo "gastei 35 no uber".`
      );
      return;
    }

    const duplicata = await buscarDuplicataRecente(USUARIO, interpretado);
    if (duplicata) {
      await enviarMensagem(
        mensagem.from,
        `Esse ${interpretado.tipo === "receita" ? "recebimento" : "gasto"} de R$ ${formatarReais(interpretado.valor)} já estava lançado — não duplicei.`
      );
      return;
    }

    const lancado = await salvarTransacao(USUARIO, {
      ...interpretado,
      telefone: mensagem.from,
      data: hoje(),
      origem: "whatsapp",
      origem_ref: mensagem.id,
    });

    await getSupabase().from("whatsapp_mensagens").update({ transacao_id: lancado.id }).eq("id", mensagem.id);

    const emoji = interpretado.tipo === "receita" ? "💰" : "💸";
    const rotulo = interpretado.tipo === "receita" ? "Recebimento" : "Gasto";
    await enviarMensagem(
      mensagem.from,
      `${emoji} ${rotulo} de R$ ${formatarReais(lancado.valor)} em ${interpretado.categoria}` +
        `${interpretado.descricao ? ` (${interpretado.descricao})` : ""} registrado.`
    );
  } catch (erro) {
    console.error("[whatsapp] erro ao processar mensagem:", erro);
  }
});

export default router;
