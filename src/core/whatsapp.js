const API_VERSION = "v21.0";

export async function enviarMensagem(para, texto) {
  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: para,
      type: "text",
      text: { body: texto },
    }),
  });

  const dados = await response.json();

  if (!response.ok) {
    throw new Error(`Falha ao enviar mensagem pelo WhatsApp: ${JSON.stringify(dados)}`);
  }

  return dados;
}
