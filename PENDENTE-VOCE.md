# Lista do Gustavo — tudo que depende de você

Este arquivo acumula **tudo que eu não consigo fazer sozinho**: SQL para rodar, chaves para gerar,
permissões para autorizar. Eu mantenho a lista atualizada a cada etapa; você resolve tudo de uma vez,
com calma, quando estiver na frente do computador.

Nada aqui bloqueia a construção — o código das próximas etapas continua sendo escrito e testado.
O que depende de você fica esperando aqui, marcado.

---

> **Atenção: a Fase 4 (Saúde e Vícios) acrescentou 18 tabelas.** O SQL agora tem **48 tabelas** — pegue a
> versão nova do `db/RODAR-TUDO.sql`. Continua sendo um arquivo só e continua podendo rodar quantas vezes quiser,
> mesmo que você já tenha rodado uma versão anterior: o que já existe é preservado e só o que falta é criado.

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

## 4. Chaves e cadastros externos (quando cada fase chegar)

| O quê | Onde | Para quê | Etapa |
|---|---|---|---|
| Chaves de push (VAPID) | Eu gero e te mando; você cola no Render | Notificação com o app fechado | E1.11 |
| Bucket privado no Supabase Storage | Painel do Supabase → Storage | Fotos de progresso do treino e PDF dos exames | E2.8 e E4.3 |
| Chave de IA (Anthropic) | console.anthropic.com | Barra de comando em linguagem natural, resumos, **gerador de programa de treino** | E6.1 e E2.7 |
| App no Meta for Developers | developers.facebook.com | Registrar por WhatsApp | E6.3 |
| Cron job no Render | Painel do Render | Briefing da manhã e fechamento da noite | E6.4 |

## 5. Decisões que só você toma

- **Plano do Render**: no gratuito o app dorme após ~15 min e a primeira abertura demora ~30 s. Isso incomoda
  pouco no uso pelo celular, mas atrasa o WhatsApp. US$ 7/mês resolve — decidir quando a Fase 6 chegar.
- **Open Finance** (importar do banco automaticamente): exige agregador pago (~R$ 50/mês). Só depois de o
  lançamento manual estar redondo.
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

