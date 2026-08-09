import { Router } from "express";

const router = Router();

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

// TODO (Etapa 5): recebimento das mensagens do WhatsApp (POST) — interpretar,
// salvar no Supabase e responder.

export default router;
