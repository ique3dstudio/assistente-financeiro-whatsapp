# Lista do Gustavo — tudo que depende de você

Este arquivo acumula **tudo que eu não consigo fazer sozinho**: SQL para rodar, chaves para gerar,
permissões para autorizar. Eu mantenho a lista atualizada a cada etapa; você resolve tudo de uma vez,
com calma, quando estiver na frente do computador.

Nada aqui bloqueia a construção — o código das próximas etapas continua sendo escrito e testado.
O que depende de você fica esperando aqui, marcado.

---

> **Atenção: o SQL agora tem 59 tabelas** (mais uma, `whatsapp_mensagens`, e duas colunas novas na tabela de
> lançamentos). Pegue a versão nova do `db/RODAR-TUDO.sql`. Continua sendo um arquivo só e continua podendo
> rodar quantas vezes quiser, mesmo que você já tenha rodado uma versão anterior: o que já existe é preservado
> e só o que falta é criado. Nada muda nos seus lançamentos antigos.
>
> **Novidade grande desta etapa: o lançamento automático pelo WhatsApp está pronto no código** — manda um
> texto ou um áudio tipo "gastei 40 no mercado" e ele vira um gasto lançado sozinho, na categoria certa. Só que,
> diferente de tudo que veio antes, isso depende de **3 cadastros externos** (não só do SQL) para ligar de
> verdade. Veja a seção 4 abaixo — é o próximo passo mais importante da sua lista.

## 1. Rodar o SQL (resolve quase tudo)

**Arquivo:** `db/RODAR-TUDO.sql` — cole inteiro no **SQL Editor** do Supabase e clique em **Run**.

- É um arquivo só, com o núcleo e todos os módulos, na ordem certa.
- Pode rodar **quantas vezes quiser**: tudo é "create if not exists". Nada é apagado nem duplicado.
- Sempre pegue a versão mais recente do arquivo — ele cresce a cada etapa que eu entrego.
- Esperado: **"Success. No rows returned"**.
- Validado por `npm test`, que aplica esse mesmo SQL num Postgres real antes de chegar até você.

Sem isso, o app abre e loga, mas todos os cards mostram erro de tabela inexistente.

## 2. Conferir uma variável no Render

**Settings → Environment → `SUPABASE_URL`** deve ser exatamente:

```
https://mitrtxqeqpsjvczjyuny.supabase.co
```

Sem barra no fim, sem espaço, sem `/rest/v1`. (O código já normaliza isso, mas o valor certo na origem
evita confusão futura.)

## 3. Coisas do celular — 2 minutos, com o app aberto

| O quê | Por quê | Etapa |
|---|---|---|
| Autorizar **notificações** no iPhone | Lembretes de água, remédio, hábito e compromisso | E1.11 |
| Cadastrar **Face ID** na primeira abertura | Bloqueio do app e dos módulos sensíveis (Saúde, Vícios, Finanças) | E0.6 |
| **Adicionar à Tela de Início** pelo Safari | Sem isso o iPhone não entrega notificação nenhuma, nem roda como app | — |
| Autorizar **microfone e câmera** | Ditado, foto de cupom, código de barras | E6.2 |

No módulo Saúde e no de Controle, o que vale cadastrar quando abrir: seus **medicamentos** (com horário e
quantas unidades você tem em casa), suas **rotinas** de saúde (dentista, check-up), os valores do **último
exame** que você tiver em mãos, e — se for usar o módulo de Controle — pelo menos **um contato de apoio** e
os seus **porquês**, escritos com a cabeça fria. São eles que aparecem na tela de urgência.

Depois de rodar o SQL, vale cadastrar em 5 minutos, pelo app: suas **contas** (com o saldo atual), seus
**cartões** (dia de fechamento e de vencimento — é o que faz a fatura ficar correta), seus **recorrentes**
(salário, aluguel, assinaturas) e o **teto** das 3 ou 4 categorias em que você mais estoura. Sem isso o
módulo Dinheiro funciona, mas não tem como projetar nem avisar de nada.

No módulo Dieta, defina um **alvo de calorias** (Dieta → Alvo e ajuste → Definir alvo manualmente) assim que
abrir — sem ele o app só soma o que você comeu, sem comparar com nada. O **ajuste adaptativo** só aparece
depois de ~21 dias registrando comida e pesando-se (o peso é lido do módulo Corpo → Medidas). Uma limitação
honesta: **ler código de barras pela câmera não funciona no Safari do iPhone** (a Apple não implementou essa
API); nesse caso o app já cai sozinho para você digitar o número, que continua buscando os dados certos.

## 4. Chaves e cadastros externos (quando cada fase chegar)

| O quê | Onde | Para quê | Etapa |
|---|---|---|---|
| Chaves de push (VAPID) | Eu gero e te mando; você cola no Render | Notificação com o app fechado | E1.11 |
| Bucket privado no Supabase Storage | Painel do Supabase → Storage | Fotos de progresso do treino e PDF dos exames | E2.8 e E4.3 |
| **Chave da Groq (uma só, 100% grátis)** | console.groq.com | Entender a mensagem do WhatsApp, extrair o lançamento E transcrever nota de voz | **E6.3 (agora)** |
| **App no Meta for Developers** | developers.facebook.com | Receber e responder mensagens do WhatsApp | **E6.3 (agora)** |
| Cron job no Render | Painel do Render | Briefing da manhã e fechamento da noite | E6.4 |

### Como ativar o lançamento por WhatsApp — passo a passo

O código já está pronto e testado; a IA roda inteira na Groq (sem custo, sem cartão) — falta só isto, tudo
feito uma vez só:

1. **Chave da Groq**: entre em console.groq.com → crie uma conta grátis (sem cartão) → API Keys → Create API
   Key → cole no Render como `GROQ_API_KEY`. Essa mesma chave serve tanto para entender a mensagem quanto para
   transcrever áudio — não precisa de mais nenhuma chave de IA.
2. **App no Meta for Developers**: em developers.facebook.com, crie um app do tipo "Business", adicione o
   produto **WhatsApp**. Lá você já ganha um número de teste. Copie para o Render:
   - `WHATSAPP_ACCESS_TOKEN` (o token temporário de teste, ou um permanente se você já gerar um)
   - `WHATSAPP_PHONE_NUMBER_ID` (aparece na mesma tela)
   - `WHATSAPP_VERIFY_TOKEN`: você inventa qualquer texto (ex: `vidaos2026`) e cola **os dois lugares**: no
     Render e no painel do Meta, na hora de configurar o webhook
3. **Configurar o webhook no Meta**: na mesma tela do produto WhatsApp, em "Configuration", cole a URL:
   `https://<seu-app>.onrender.com/webhook` e o Verify Token do passo anterior. Clique em "Verify and save".
   Depois, em "Webhook fields", inscreva-se em `messages`.
4. **`WHATSAPP_MEU_NUMERO`**: o número de teste do Meta só fala com números que você cadastrar como
   "destinatário de teste" na mesma tela. Adicione o SEU WhatsApp lá (o Meta manda um código por WhatsApp pra
   confirmar). Depois, cole esse mesmo número no Render como `WHATSAPP_MEU_NUMERO`, com DDI e DDD, sem "+" e
   sem espaço (ex: `5511999999999`) — é a única trava de segurança dessa rota pública: sem isso configurado
   certinho, o app ignora toda mensagem recebida, por precaução.
5. Manda um "oi, gastei 20 no café" pelo WhatsApp pro número de teste e o app deve responder confirmando o
   lançamento — confere no app se ele realmente apareceu em Finanças.

Enquanto isso não estiver tudo configurado, nada quebra: o resto do app funciona normalmente, o webhook só
fica recebendo e ignorando mensagens (ou nem isso, se o Meta ainda não tiver sido apontado pra ele).

**Sobre usar um modelo grátis em vez de pago**: a Groq roda modelos Llama de código aberto — funciona muito
bem para mensagens diretas ("gastei 40 no mercado", "recebi 200 de freela"), mas pode errar mais que um modelo
pago em frases ambíguas ou incomuns. Se um dia você notar muita categoria errada ou lançamento que deveria ter
sido detectado e não foi, me avisa — trocar para um provedor pago é questão de mudar uma variável de ambiente,
não precisa reescrever nada.

## 5. Decisões que só você toma

- **Plano do Render**: no gratuito o app dorme após ~15 min e a primeira abertura demora ~30 s. Isso incomoda
  pouco no uso pelo celular, mas atrasa o WhatsApp. US$ 7/mês resolve — decidir quando a Fase 6 chegar.
- **Open Finance** (importar do banco automaticamente, ex: Nubank): você já decidiu adiar isso — não existe
  API gratuita oficial de banco nenhum no Brasil, só via agregador licenciado (Pluggy, Belvo, Quanto...) e a
  camada gratuita deles costuma virar paga (~R$ 20–50/mês) em uso contínuo. O código já está preparado pra
  quando você decidir: a coluna `transacoes.origem` já aceita o valor `'banco'` e a lógica que evita duplicar
  lançamento repetido (usada hoje entre WhatsApp e lançamento manual) já funciona igual pra um extrato importado
  — não vai precisar reescrever nada, só plugar o agregador quando topar o custo.
- **Domínio próprio** (~R$ 40/ano) em vez de `minha-vida-vlda.onrender.com`: opcional, a qualquer momento.

---

## Funções que ficam esperando por isso

Estas partes já estão **escritas** ou serão escritas, mas só funcionam de verdade depois dos itens acima:

- Tudo que grava dado → item 1 (SQL).
- Lembretes e briefing → itens 3 e 4 (notificação + chaves + cron).
- Fotos de progresso e exames → item 4 (bucket).
- Barra de comando por IA, ditado e WhatsApp → item 4 (chave de IA e app do Meta).
- Bloqueio biométrico → item 3.
- Programas de treino periodizados gerados por IA (E2.7) → item 4 (chave de IA).
- Fotos de progresso do treino → item 4 (bucket). O resto do módulo de treino já funciona só com o SQL.
- Foto do prato salva de verdade (hoje aceita um link) → item 4 (bucket). O resto do módulo Dieta já
  funciona só com o SQL.
- Leitura de código de barras pela câmera → só funciona onde o navegador suporta (não é o caso do Safari
  no iPhone); digitar o número sempre funciona, com ou sem essa API.
- Lançamento financeiro por WhatsApp (texto e áudio) → item 4 (as 3 chaves + apontar o webhook no Meta). O
  resto do app não depende disso pra nada.

