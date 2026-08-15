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

## Como testar o envio de mensagens pelo WhatsApp

Com `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` preenchidos no `.env`, e seu número já verificado como
destinatário de teste no Meta for Developers:

```bash
node scripts/test-whatsapp.js 5511999999999 "Oi! Teste do assistente financeiro."
```

Troque `5511999999999` pelo seu número, no formato DDI+DDD+número, sem espaços, `+` ou traços. Você deve receber a
mensagem no WhatsApp.

## Loja 3D — gestão de pedidos e produção

App web (funciona como PWA, dá pra "adicionar à tela inicial" no celular) para a loja de impressão 3D. Uma pessoa
lança os pedidos com todos os dados da impressão, a outra acompanha e vai movendo cada pedido pelas etapas de
produção — as duas veem tudo em tempo real, sem planilha.

Fica em `/loja3d`, dentro do mesmo servidor Express, e usa o **mesmo projeto Supabase** já configurado neste
repositório (só cria tabelas novas — nada dos dados financeiros é misturado com os pedidos).

### Setup (uma vez só)

1. **Criar as tabelas.** No SQL Editor do Supabase, rode **nesta ordem**:
   - `sql/pedidos_3d.sql` (schema original)
   - `sql/002_bloco1.sql` (clientes, pedidos com múltiplos itens, anexos, prioridade — já migra os dados que
     estiverem em `pedidos_3d` automaticamente, e já cria o bucket de armazenamento pros anexos)
   - `sql/003_bloco2.sql` (configurações da loja, materiais, catálogo de produtos e campos de custo — já cria a
     linha de configurações com valores padrão, revise em "⚙ Configurações" dentro do app)
2. **Pegar a chave pública.** Em Project Settings > API, copie a chave **anon public** e preencha
   `SUPABASE_ANON_KEY` no seu `.env` (além do `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` que já devem estar
   preenchidos).
3. **Criar as duas contas.** Em Authentication > Users, clique em "Add user" e crie um login (e-mail + senha) para
   você e outro para sua irmã. Não existe tela de cadastro no app — só vocês duas conseguem entrar.
4. **Rodar e acessar.** Com `npm run dev`, abra `http://localhost:3000/loja3d` e entre com um dos logins criados.
   Depois do deploy (ex: Render), é o mesmo caminho: `https://SEU-DOMINIO/loja3d`.

### Como funciona

- **Cliente.** Ao digitar o nome no campo "Cliente" do pedido, o app sugere clientes já cadastrados (autocompletar);
  se o nome for novo, cria o cliente na hora. Isso dá um mini-histórico: dá pra ver depois tudo que aquele cliente
  já pediu.
- **Pedido x item.** Um pedido pertence a um cliente e tem prazo, prioridade, origem (WhatsApp, Instagram…),
  pagamento e observações gerais. Dentro dele, um ou mais **itens** — cada peça, com descrição, cor, material,
  quantidade, tempo estimado e valor. Cada item é uma "ordem de produção" independente: um pedido de 3 peças pode
  ter uma pronta, uma em produção e uma na fila, tudo ao mesmo tempo.
- **Etapas (colunas do quadro):** Pedido recebido → Na fila de produção → Em produção → Pronto → Entregue — por
  item. Os botões ◀ ▶ no card movem o item de etapa sem abrir o formulário; clicar no card abre o pedido completo
  (com todos os itens daquele cliente).
- **Prioridade.** Pedido marcado como "Urgente" ganha uma faixa amarela no card e sobe pro topo da coluna.
- **Atrasado** não é uma etapa manual — é calculado automaticamente pelo prazo do pedido: todo item com prazo
  vencido que ainda não está "Pronto" ou "Entregue" ganha destaque vermelho, e o filtro "⏰ Atrasados" no topo
  mostra só esses.
- **Anexos.** Fotos de referência, arquivo STL/3MF ou print da conversa do WhatsApp podem ser anexados a cada
  pedido (guardados no Supabase Storage, de forma privada).
- **Painel.** Aba com 6 números do momento: pedidos abertos, itens atrasados, faturamento do mês, lucro do mês
  (só considera itens com custo calculado), horas de produção na fila e clientes ativos.
- **Financeiro.** Aba com as contas a receber: todo pedido não pago ainda, com total, sinal recebido, saldo
  devedor e prazo — e o total geral a receber no topo.
- **Calculadora de custo e preço.** Dentro de cada item do pedido: informe peso (g), tempo de impressão, mão de
  obra e o material (escolhido de um catálogo cadastrado em "⚙ Configurações"), clique em "💰 Calcular preço
  sugerido" e o app preenche o valor cobrado com base no custo de material + energia + depreciação da impressora +
  mão de obra + uma margem de risco/falha e de lucro — tudo configurável em "⚙ Configurações". O lucro estimado
  daquele item aparece na hora.
- **Catálogo de produtos.** Depois de montar um item do jeito certo, dá pra "💾 Salvar como produto" — da próxima
  vez, é só escolher em "Carregar produto salvo" que todos os campos (incluindo o preço) vêm prontos.
- **Orçamento em PDF e WhatsApp.** No pedido já com itens, os botões "📄 Orçamento PDF" e "📲 Enviar WhatsApp"
  geram o resumo (itens, total, sinal, saldo, prazo) pra baixar ou mandar direto pro número do cliente.
- **Exportar CSV.** Botão no topo baixa todos os itens (com dados do cliente e do pedido) numa planilha, pra abrir
  no Excel/Google Sheets quando quiser.
- **Tempo real.** Se uma mexe em algo, a tela da outra atualiza sozinha (via Supabase Realtime), sem precisar
  atualizar a página.

### Estrutura

- `public/loja3d/` — front-end (HTML/CSS/JS puro, sem build) e o manifest/service worker do PWA.
- `sql/pedidos_3d.sql` — schema original (tabela única, mantida como histórico/backup).
- `sql/002_bloco1.sql` — clientes, pedidos, itens_pedido, anexos, políticas de RLS, realtime, bucket de
  armazenamento e migração automática dos dados do schema original.
- `sql/003_bloco2.sql` — configurações (dados da loja e premissas de custo), materiais, produtos e os campos de
  custo em itens_pedido.
- Rota `/loja3d/config.js`, em `src/server.js` — entrega a URL e a chave pública do Supabase para o front-end, lidas
  do `.env` do servidor (assim a chave não fica hardcoded no código versionado).

## Estrutura do projeto

- `src/server.js` — ponto de partida do servidor.
- `src/routes/webhook.js` — verifica o webhook do Meta (GET); vai receber as mensagens de verdade na Etapa 5 (POST).
- `src/services/ai.js` — interpreta as mensagens e extrai valor/tipo/categoria, via NVIDIA Build (provedor de teste).
- `src/services/supabase.js` — salva os lançamentos na tabela `transacoes` do Supabase.
- `src/services/whatsapp.js` — envia mensagens de volta pelo WhatsApp via Meta Cloud API.
- `scripts/test-ai.js` — script manual para testar a interpretação sem precisar do WhatsApp/banco de dados.
- `scripts/test-supabase.js` — script manual para testar a gravação de uma transação no banco.
- `scripts/test-whatsapp.js` — script manual para testar o envio de uma mensagem real pelo WhatsApp.
- `.env.example` — modelo das variáveis de ambiente (chaves de acesso). Copie para `.env` e preencha; o `.env` nunca é
  enviado ao GitHub.

## Roteiro das próximas etapas

1. ~~Estruturar o projeto~~ (feito)
2. ~~Interpretar mensagens com IA~~ (feito, usando a NVIDIA Build como provedor de teste gratuito)
3. ~~Criar conta no Supabase e a tabela de lançamentos~~ (código pronto, aguardando setup da conta)
4. ~~Criar o app no Meta for Developers e configurar o número de teste do WhatsApp~~ (código pronto, aguardando setup da conta)
5. Ligar tudo: receber mensagem → interpretar → salvar → responder
6. Comando "resumo do mês"
7. Deploy no Render
