# Changelog

Registro do que entrou em cada etapa do `ROADMAP.md`.

## E0.1 — Núcleo, PWA e módulo Água
- Servidor Express com registro de módulos plugáveis e dashboard tolerante a módulo indisponível.
- Login de dono único por senha, com cookie assinado.
- PWA instalável: dashboard do dia, tela da Água (anel, botões de copo, desfazer, meta, sequência,
  histórico de 14 dias), manifest e service worker.
- Módulo Finanças reaproveitado do assistente do WhatsApp, agora com `user_id`, `data`, extrato e resumo do mês.
- IA, WhatsApp e webhook movidos para o núcleo; um script de teste manual por peça.
- Deploy no Render a partir da branch de desenvolvimento.

## E0.2 — Conexão com o Supabase (em ajuste)
- `GET /api/diagnostico`: mostra quais variáveis estão preenchidas, qual projeto do Supabase está configurado
  e se cada tabela responde.
- Card do dashboard passa a mostrar o motivo real do erro em vez de "tabela ainda não criada".
- `SUPABASE_URL` normalizada (espaços, barra final e `/rest/v1` colado) e validada com mensagem clara —
  causa do erro "Invalid path specified in request URL".

## E0.3 e E0.4 — Casca do app e perfil
- Barra inferior com as 5 abas da especificação (Hoje, Metas, Corpo, Dinheiro, Eu) e roteamento por hash,
  então o botão "voltar" do celular funciona.
- Tema claro e escuro acompanhando o sistema.
- Tabela `perfil` (nome, peso, altura, nascimento) e escolha de quais módulos ficam ativos.
- Cada módulo passa a declarar em que aba aparece; um módulo novo entra na navegação sozinho.

## E1.1 e E1.2 — Hábitos, checklist e sequências
- Cadastro de hábito: nome, ícone, cor, período (manhã/tarde/noite/quando der), horário, meta quantitativa
  com unidade, marcação de não-negociável e 4 tipos de frequência (todo dia, dias da semana,
  X vezes por semana, a cada N dias).
- Checklist do dia agrupado por período, com marcação em 1 toque e registro de quantidade quando há meta.
- Sequência por hábito e sequência geral do app: o dia de hoje em aberto não quebra nada, e o "dia bom"
  considera os hábitos âncora (ou 80% dos hábitos, quando não há âncoras).
- Dia de folga: até 2 por mês, que pula o dia sem zerar a sequência.
- Histórico em heatmap de 6 meses por hábito.
- `regras.js` com 14 testes automatizados (`node scripts/test-habitos.js`) — é cálculo que, errado, estragaria
  meses de dado.

## E1.3 — Tela Hoje (montagem)
- `GET /api/hoje` monta a tela juntando todos os módulos: saudação, data, sequência geral, anéis de progresso
  e um checklist único. Módulo que falha aparece marcado, sem derrubar a tela.
- Cada módulo pode fornecer `itensDoDia()` — é assim que remédio, treino e conta a pagar vão entrar no mesmo
  checklist nas próximas fases, sem código novo aqui.

## E1.5 — Água v2
- Meta diária calculada pelo peso do perfil (35 ml/kg, arredondado em 100 ml), com opção de definir à mão.
- Recipientes próprios (os quatro padrão são criados na primeira abertura).
- Outras bebidas com fator de hidratação: café conta 60%, álcool desconta metade — a barra mostra hidratação
  real, não volume.
- Ritmo do dia: o app sabe quanto você já deveria ter bebido a esta hora e mostra o atraso.

## E1.6 e E1.7 — Metas nos 3 horizontes, com vínculo automático
- Meta com horizonte (curto/médio/longo), área da vida, métrica, valor inicial/atual/alvo, prazo, motivo e
  hierarquia (meta longa contendo metas médias).
- Marcos por meta, com marcar/desmarcar e reflexão.
- **Vínculo automático**: a meta pode ler uma métrica publicada por qualquer módulo (sequência de hábito,
  litros de água, sobra do mês) e se atualizar sozinha — nada de digitar o mesmo número duas vezes.
- Ritmo necessário: transforma "juntar 10 mil até dezembro" em "R$ 89 por dia".
- Alerta de meta órfã: sem hábito ligado e sem movimento há 14 dias.
- `metricas()` entrou no contrato dos módulos; água, hábitos, finanças e humor já publicam as suas.

## E1.8 — Agenda e tarefas
- Compromissos com tipo (reunião, consulta, treino, pessoal, viagem, vencimento), local, pauta, duração,
  lembretes e recorrência flexível (diária, dias da semana, mensal no dia X, a cada N dias, com data limite).
- Guardamos data e hora separadas, não timestamp: "quinta 15h" continua 15h mesmo com o servidor em UTC.
- Tarefas com prazo, prioridade, período e vínculo a meta ou compromisso; as de hoje e as atrasadas entram no
  checklist da tela Hoje junto com os hábitos.
- Próximos 3 compromissos com contagem regressiva na tela Hoje, e aviso de conflito de horário.

## E1.9 — Fechamento do dia
- Depois das 20h a tela Hoje mostra o fechamento: humor de 1 a 5 em um toque, emoções, o que mais pesou,
  gratidão e o que travou.
- Histórico de humor de 30 dias com média e gráfico na aba Eu.

## E1.4 — Botão + universal
- Botão flutuante com os 8 registros mais usados: água (1 toque), gasto, tarefa, compromisso, humor, nota,
  hábito e treino (em breve). O gasto já abre com a última categoria usada.

## Qualidade
- Front dividido em módulos (`public/ui.js` + `public/telas/*.js`), carregados como ES modules.
- `npm test` roda 34 testes de regra (hábitos, água, metas, agenda) **e valida o SQL num Postgres real**
  (PGlite): confere que aplica limpo, que aplica duas vezes sem quebrar e que as tabelas aceitam exatamente
  os inserts do app, barrando os inválidos.
- `npm run sql` regenera `db/RODAR-TUDO.sql` a partir dos schemas dos módulos.
- Perfil guarda os módulos DESLIGADOS (não os ligados), então módulo novo já nasce ativo.

## Documentação
- `ESPEC.md`: especificação funcional completa do Life OS (v1.0).
- `ROADMAP.md`: a especificação quebrada em etapas testáveis, com banco, código, aceite e passos manuais.
