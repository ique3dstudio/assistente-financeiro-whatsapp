# Assistente Financeiro via WhatsApp

Assistente pessoal que recebe mensagens no WhatsApp (ex: "gastei 50 no mercado"), usa IA para entender o que foi dito,
salva no banco de dados e responde confirmando o lançamento.

## Status atual

Projeto em construção, por etapas. A interpretação das mensagens (Etapa 2) já está implementada, usando a **API da
Anthropic (Claude)**. (Chegamos a testar o Google Gemini gratuito antes, mas a conta bateu num bloqueio de cota que não
foi possível contornar, então seguimos direto com Claude.)

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois abra `http://localhost:3000/` no navegador — deve aparecer `{"status":"ok",...}`.

## Como testar a interpretação de mensagens

Com o `ANTHROPIC_API_KEY` preenchido no `.env`:

```bash
node scripts/test-ai.js "gastei 50 reais no mercado"
node scripts/test-ai.js "recebi 2000 de salário"
```

## Estrutura do projeto

- `src/server.js` — ponto de partida do servidor.
- `src/routes/webhook.js` — vai receber as mensagens do WhatsApp (Etapa 4).
- `src/services/ai.js` — interpreta as mensagens e extrai valor/tipo/categoria, via API da Anthropic (Claude).
- `src/services/supabase.js` — vai salvar/consultar os lançamentos no banco (Etapa 3).
- `src/services/whatsapp.js` — vai enviar as respostas de volta pelo WhatsApp (Etapa 4).
- `scripts/test-ai.js` — script manual para testar a interpretação sem precisar do WhatsApp/banco de dados.
- `.env.example` — modelo das variáveis de ambiente (chaves de acesso). Copie para `.env` e preencha; o `.env` nunca é
  enviado ao GitHub.

## Roteiro das próximas etapas

1. ~~Estruturar o projeto~~ (feito)
2. ~~Interpretar mensagens com IA~~ (feito, usando a API da Anthropic/Claude)
3. Criar conta no Supabase e a tabela de lançamentos
4. Criar o app no Meta for Developers e configurar o número de teste do WhatsApp
5. Ligar tudo: receber mensagem → interpretar → salvar → responder
6. Comando "resumo do mês"
7. Deploy no Render
