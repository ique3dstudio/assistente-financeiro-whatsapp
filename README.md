# Assistente Financeiro via WhatsApp

Assistente pessoal que recebe mensagens no WhatsApp (ex: "gastei 50 no mercado"), usa a Claude API para entender o que foi
dito, salva no banco de dados e responde confirmando o lançamento.

## Status atual

Projeto ainda em construção, por etapas. Nesta etapa (1), só existe a estrutura básica e um servidor que liga — nenhuma
integração externa foi feita ainda.

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois abra `http://localhost:3000/` no navegador — deve aparecer `{"status":"ok",...}`.

## Estrutura do projeto

- `src/server.js` — ponto de partida do servidor.
- `src/routes/webhook.js` — vai receber as mensagens do WhatsApp (Etapa 4).
- `src/services/anthropic.js` — vai interpretar as mensagens com a Claude API (Etapa 2).
- `src/services/supabase.js` — vai salvar/consultar os lançamentos no banco (Etapa 3).
- `src/services/whatsapp.js` — vai enviar as respostas de volta pelo WhatsApp (Etapa 4).
- `.env.example` — modelo das variáveis de ambiente (chaves de acesso). Copie para `.env` e preencha; o `.env` nunca é
  enviado ao GitHub.

## Roteiro das próximas etapas

1. ~~Estruturar o projeto~~ (feito)
2. Criar conta na Anthropic e gerar a chave de API (Claude)
3. Criar conta no Supabase e a tabela de lançamentos
4. Criar o app no Meta for Developers e configurar o número de teste do WhatsApp
5. Ligar tudo: receber mensagem → interpretar → salvar → responder
6. Comando "resumo do mês"
7. Deploy no Render
