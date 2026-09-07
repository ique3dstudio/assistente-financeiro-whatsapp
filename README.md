# Vida OS

Painel pessoal que junta vários assuntos da minha vida num app só: água, hábitos, dieta, treino, tarefas, vícios,
finanças e o que mais vier. Duas portas de entrada para os mesmos dados:

- **PWA** — site que instala na tela inicial do celular e abre como app (dashboard do dia, botões, gráficos).
- **WhatsApp** — mensagem solta tipo "bebi 500ml" ou "gastei 50 no mercado" cai no módulo certo (em construção).

Banco de dados no **Supabase**, hospedagem no **Render**.

## Arquitetura: núcleo + módulos

Cada assunto é um módulo isolado. Adicionar "sono" ou "leitura" no futuro é criar uma pasta, não remexer no app inteiro.

```
src/
  server.js               monta o servidor e registra os módulos
  core/
    auth.js               login por senha única (cookie assinado)
    supabase.js           cliente único do banco
    config.js             configurações que mudam pelo app (metas, etc.)
    datas.js              o "hoje" no seu fuso, não no fuso do servidor
    modulos.js            lista dos módulos + montagem do dashboard
    ai.js                 interpreta mensagens de texto
    whatsapp.js           envia mensagens pelo WhatsApp
    webhook.js            recebe as mensagens do WhatsApp
  modules/
    agua/                 índice · service · routes · schema.sql   ← molde dos outros
    financas/             índice · service · routes · schema.sql
public/                   o PWA (index.html, app.js, styles.css, manifest, service worker)
db/00-core.sql            tabelas do núcleo
scripts/                  testes manuais de cada peça
```

**Contrato de um módulo** (`src/modules/<id>/index.js`):

```js
export default {
  id: "agua",              // vira a rota /api/agua
  nome: "Água",
  emoji: "💧",
  rotas,                   // router do Express
  async resumoDoDia(usuario) { ... },  // o que aparece no card do dashboard
};
```

Depois basta acrescentar o import em `src/core/modulos.js`. O resto do app se adapta sozinho.

## Setup

### 1. Banco de dados (Supabase)

No painel do Supabase, em **SQL Editor**, rode nesta ordem:

1. `db/00-core.sql` — tabela de configurações
2. `src/modules/agua/schema.sql` — tabela de água
3. `src/modules/financas/schema.sql` — tabela de transações (cria do zero ou atualiza a antiga)

As tabelas ficam com RLS ligado e sem políticas: ninguém acessa direto do navegador, só o servidor.

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Preencha:

- `APP_SENHA` — a senha que você vai digitar para entrar no app
- `APP_SECRET` — texto aleatório para assinar o cookie:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` — em **Project Settings → API**

As chaves da IA e do WhatsApp só são necessárias para a entrada por mensagem.

### 3. Rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`, digite a senha e o dashboard aparece.
`http://localhost:3000/saude` mostra o status e os módulos carregados.

## Testes manuais

```bash
node scripts/test-agua.js 500                        # grava 500ml e mostra o panorama
node scripts/test-financas.js                        # grava um lançamento e resume o mês
node scripts/test-ai.js "gastei 50 no mercado"       # interpretação de mensagem
node scripts/test-whatsapp.js 5511999999999 "oi"     # envio de mensagem real
```

## Deploy no Render

1. **New → Web Service** → conectar este repositório.
2. Build Command `npm install` · Start Command `npm start`.
3. Em **Environment**, colar as mesmas variáveis do `.env` (com `NODE_ENV=production`).
4. Health Check Path: `/saude`.
5. Abrir a URL gerada (`https://<nome>.onrender.com`) no celular e usar **Compartilhar → Adicionar à Tela de Início**.

No plano gratuito o serviço dorme depois de ~15 minutos sem acesso e a primeira abertura demora ~30s. Um ping
periódico (UptimeRobot) ou o plano de US$ 7/mês resolvem. Todo `git push` na branch dispara um deploy novo.

## Roteiro

1. ~~Núcleo do Vida OS: login, dashboard, PWA e o módulo Água como molde~~ (feito)
2. Deploy no Render + instalar na tela inicial do celular
3. Módulos de hábito, reaproveitando o molde da Água: dieta, treino, vícios (dias sem), sono
4. Módulo Tarefas (prazo, prioridade, concluído)
5. Finanças completo no app: lançamento manual, extrato e resumo do mês na tela
6. Roteador de IA no WhatsApp: uma mensagem qualquer cai no módulo certo
7. Resumo diário automático pelo WhatsApp
8. Módulos novos, conforme forem sendo definidos
