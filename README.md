# Assistente Financeiro via WhatsApp

Assistente pessoal que recebe mensagens no WhatsApp (ex: "gastei 50 no mercado"), usa IA para entender o que foi dito,
salva no banco de dados e responde confirmando o lançamento.

## Status atual

Projeto em construção, por etapas. A interpretação das mensagens (Etapa 2) já está implementada, usando a **NVIDIA
Build** (modelo `meta/llama-3.1-70b-instruct`) como provedor de teste gratuito, enquanto o projeto está em fase de
validação. (Antes tentamos o Google Gemini, que bateu num bloqueio de cota; a versão com a API da Anthropic/Claude, que
é o destino final, já foi implementada uma vez e está preservada no histórico do Git para quando fizer sentido migrar.)

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois abra `http://localhost:3000/` no navegador — deve aparecer `{"status":"ok",...}`.

## Como testar a interpretação de mensagens

Com o `NVIDIA_API_KEY` preenchido no `.env`:

```bash
node scripts/test-ai.js "gastei 50 reais no mercado"
node scripts/test-ai.js "recebi 2000 de salário"
```

## Como testar a gravação no banco de dados

Com `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` preenchidos no `.env` e a tabela `transacoes` já criada (veja instruções de
setup):

```bash
node scripts/test-supabase.js
```

Deve imprimir a linha recém-criada. Você também pode conferir em Table Editor, no painel do Supabase.

## Estrutura do projeto

- `src/server.js` — ponto de partida do servidor.
- `src/routes/webhook.js` — vai receber as mensagens do WhatsApp (Etapa 4).
- `src/services/ai.js` — interpreta as mensagens e extrai valor/tipo/categoria, via NVIDIA Build (provedor de teste).
- `src/services/supabase.js` — salva os lançamentos na tabela `transacoes` do Supabase.
- `src/services/whatsapp.js` — vai enviar as respostas de volta pelo WhatsApp (Etapa 4).
- `scripts/test-ai.js` — script manual para testar a interpretação sem precisar do WhatsApp/banco de dados.
- `scripts/test-supabase.js` — script manual para testar a gravação de uma transação no banco.
- `.env.example` — modelo das variáveis de ambiente (chaves de acesso). Copie para `.env` e preencha; o `.env` nunca é
  enviado ao GitHub.

## Roteiro das próximas etapas

1. ~~Estruturar o projeto~~ (feito)
2. ~~Interpretar mensagens com IA~~ (feito, usando a NVIDIA Build como provedor de teste gratuito)
3. ~~Criar conta no Supabase e a tabela de lançamentos~~ (código pronto, aguardando setup da conta)
4. Criar o app no Meta for Developers e configurar o número de teste do WhatsApp
5. Ligar tudo: receber mensagem → interpretar → salvar → responder
6. Comando "resumo do mês"
7. Deploy no Render
