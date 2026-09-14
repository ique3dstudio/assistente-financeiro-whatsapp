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

// Baixa uma nota de voz (ou outra mídia) recebida no webhook: primeiro pede a
// URL de download pelo id da mídia, depois baixa o arquivo — os dois passos
// exigem o mesmo token de acesso.
export async function baixarMidia(mediaId) {
  const infoRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  });
  const info = await infoRes.json();
  if (!infoRes.ok) throw new Error(`Falha ao obter mídia: ${JSON.stringify(info)}`);

  const arquivoRes = await fetch(info.url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  });
  if (!arquivoRes.ok) throw new Error(`Falha ao baixar mídia (status ${arquivoRes.status})`);

  return { buffer: Buffer.from(await arquivoRes.arrayBuffer()), mimeType: info.mime_type };
}
