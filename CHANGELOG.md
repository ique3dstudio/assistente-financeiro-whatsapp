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

## E1.10 — Rotina guiada e foco
- "▶ iniciar rotina" em cada período: o app conduz hábito por hábito, com cronômetro (contagem regressiva
  quando o hábito tem duração), marcação automática e passagem para o próximo — a ideia é você não decidir nada.
- Card "Foco agora" na tela Hoje com bloco de Pomodoro (15/25/45/60 min) e bip no fim.
- Tabela `foco_sessoes` guarda o tempo real gasto em rotina e em foco.

## E0.5 — Offline-first
- Registro nunca falha: sem rede, o lançamento vai para uma fila no próprio aparelho (IndexedDB, que sobrevive
  a fechar o app) e sobe sozinho quando a conexão volta — ao ficar online, ao reabrir o app ou ao voltar para
  a aba.
- Barra no alto avisa "sem conexão" e quantos registros estão esperando.
- Leitura offline: a última resposta de cada tela fica guardada no aparelho, então o app abre com dados mesmo
  sem sinal.
- **Nada duplica no reenvio**: cada registro leva um `origem_id` gerado no celular e o servidor guarda o que já
  processou (`sync_idempotencia`), devolvendo a mesma resposta se o mesmo registro chegar duas vezes — o padrão
  de chave de idempotência usado em API de pagamento, aplicado a copos de água e séries de treino.

## Fase 2 — Treino e progressão de carga (E2.1 a E2.6 e E2.8)
- **Biblioteca com 73 exercícios** em 17 grupos musculares, cada um com músculo primário e secundários,
  equipamento, nível, como fazer e o erro mais comum. Você pode criar os seus.
- **Mapa corporal por região**: frente e costas, cada músculo mostrando quantos exercícios o recrutam.
- **Rotinas** (A/B, ABC, push-pull-legs, full body, upper/lower ou livre) com dia da semana; por exercício
  você define séries, faixa de repetições, RIR alvo, descanso, incremento e a regra de progressão.
- **Tela de execução**: cada exercício mostra **o que você fez da última vez** e **a sugestão de hoje**,
  registro de série com teclado numérico, "repetir última série", PR detectado na hora e **cronômetro de
  descanso que continua rodando mesmo se você trocar de tela**.
- **Motor de progressão** com as quatro regras da especificação: linear, dupla progressão, por RIR e por
  percentual do 1RM (estimado por Epley). Cada sugestão vem com o motivo em uma linha.
- **Detecção de estagnação**: 3 sessões sem melhorar nem carga nem volume → propõe deload calculado, troca de
  variação e checagem de sono/comida. Subir uma repetição conta como progresso, não como estagnação.
- **Gráficos**: volume por semana, frequência de 28 dias, curva do 1RM estimado por exercício e **mapa de calor
  muscular** com alvo semanal de séries, apontando os grupos em déficit.
- **Medidas corporais** (peso, gordura, braço, peito, cintura, quadril, coxa, panturrilha) com a última medida
  como referência no campo. Fotos de progresso ficam esperando o bucket do Storage.
- O treino do dia entra no checklist da tela Hoje, e o módulo publica métricas (1RM por exercício, volume,
  número de treinos) que as metas podem acompanhar sozinhas.
- 16 testes cobrem só o motor de progressão — é o cálculo que decide o peso que você levanta.

## Fase 3 — Dinheiro (E3.1 a E3.7)
- **Contas** (corrente, poupança, carteira, investimento) com saldo calculado a partir do movimento, e
  **28 categorias iniciais** com ícone, cor, marca de essencial e teto — todas editáveis.
- **Lançamento completo**: valor, tipo, categoria, descrição, forma de pagamento, conta, cartão, tags,
  observação e data. O lançamento rápido do botão + agora usa as suas categorias de verdade e lembra a última.
- **Cartão de crédito com lógica de fatura de verdade**: compra feita depois do fechamento cai na fatura
  seguinte; a fatura é identificada pelo mês do vencimento, como as pessoas falam. Fatura atual, próxima,
  limite usado e comprometimento das próximas.
- **Parcelamento** que não perde centavo: a diferença do arredondamento vai na primeira parcela, e cada
  parcela nasce já na fatura certa (10x começando na fatura de novembro, por exemplo).
- **Pagamento de fatura é transferência, não gasto novo** — senão a compra do cartão seria contada duas vezes.
- **Recorrentes** (salário, aluguel, assinatura) projetados nos meses seguintes sem virar linha no banco.
- **Projeção do fim do mês**: saldo atual + fixos que ainda vão cair − o seu ritmo de gasto variável.
- **Orçamento por envelope** com aviso em 80% e 100%, e a **regra 50/30/20** calculada sobre a receita real.
- **Relatórios**: mês a mês, por categoria, por forma de pagamento, por dia da semana e maiores gastos.
- **Metas financeiras** com aporte, e **dívidas** com os dois planos de quitação comparados
  (avalanche × bola de neve), incluindo o aviso honesto de quando a dívida **não fecha** com o pagamento atual.
- **Alertas de vazamento**: categoria acima da própria média, assinatura cadastrada que não aparece nos
  lançamentos, e gasto fora do padrão (média + 2 desvios, com piso para não acusar um café).
- 25 testes só para a matemática do dinheiro: regra de fatura nas duas configurações de cartão, virada de ano,
  parcelamento de valor difícil (R$ 0,10 em 3x), recorrente do dia 31 em fevereiro, projeção, envelopes,
  50/30/20, os dois planos de quitação e a detecção de anomalia.
- Correção que a foto das telas revelou: faltava **separador de milhar** no dinheiro ("R$ 5000,00" em vez de
  "R$ 5.000,00"), e o espaço inseparável do formato brasileiro é justamente o que impede "R$" de quebrar
  para outra linha.

## Passo de design (visual, interação e movimento)
Pausa no funcional para o app parecer app. Referências de layout: Oura e Whoop (dados em anéis, números
grandes), Apple Fitness e Health (sistema de cartões, título grande que colapsa ao rolar), Things 3
(tipografia calma), Copilot Money (chips e cartões de finanças), Linear (movimento contido).

- **Sistema de tokens** em `public/styles.css`: superfícies, tinta, raio, sombra, tempos e curvas de
  animação — claro e escuro escritos explicitamente (não é inversão automática).
- **Paleta de dados validada, não escolhida por gosto**: 7 matizes (um por módulo) passaram nos testes de
  daltonismo e contraste nos dois modos, na ordem em que aparecem na tela. Duas ordens "bonitas" foram
  reprovadas pelo validador antes desta: laranja ao lado de amarelo e violeta ao lado de azul são
  indistinguíveis para parte das pessoas. Cor nunca vem sozinha: todo anel, barra e status tem número ou
  rótulo escrito ao lado.
- **Ícones desenhados** (`public/icones.js`) na navegação e nos botões; emoji ficou só para o que é sua
  escolha (ícone de hábito, humor).
- **Barra de abas** com indicador que desliza e cor por aba; cada aba tinge seus botões principais e o
  botão +, então o app inteiro fica coerente com o módulo em que você está.
- **Anéis** com brilho suave, animação de entrada de zero até o valor, e cor do próprio módulo.
- **Movimento**: entrada das seções em cascata, painel que sobe com fundo desfocado, botão + que sai do
  caminho ao rolar para baixo, cronômetro de descanso que sobrevive à troca de tela, vibração curta ao
  registrar. Tudo desligado se o sistema pedir menos animação.
- **Esqueleto de carregamento** no lugar de tela branca, e **estados vazios ilustrados** com uma única ação.
- **Tipografia**: escala definida, números tabulares nas colunas de dados, título grande que vira barra
  compacta ao rolar.
- **Gráficos** refeitos com as especificações do guia: topo arredondado, respiro entre barras, rótulo
  direto só no maior valor, ponto final da curva com anel da cor do fundo, e toque numa barra mostra o
  valor exato (o "hover" que não existe no celular).
- Ferramenta nova: `node scripts/telas-foto.js` sobe o app com dados de mentira e **fotografa as 9 telas
  nos dois temas** num Chromium de verdade. Foi assim que apareceram três defeitos reais: a barra fixa do
  cabeçalho empurrava a página 18 px para o lado (desalinhando a barra de abas), o botão + cobria o cartão
  da agenda, e o texto "1 exercícios".

## Qualidade
- Front dividido em módulos (`public/ui.js` + `public/telas/*.js`), carregados como ES modules.
- `npm test` roda 72 testes: as regras de cálculo (hábitos, água, metas, agenda), **as 20 telas renderizadas
  num DOM real** (jsdom, com respostas de mentira no lugar do servidor) e a **validação do SQL num Postgres
  real** (PGlite) — que confere que ele aplica limpo, que aplica duas vezes sem quebrar e que as tabelas
  aceitam exatamente os inserts do app, barrando os inválidos.
- O teste de telas já pegou dois defeitos antes do deploy: recipiente de água sem nome na tela e cronômetro
  da rotina guiada que continuava rodando depois de trocar de tela.
- `npm run sql` regenera `db/RODAR-TUDO.sql` a partir dos schemas dos módulos.
- Perfil guarda os módulos DESLIGADOS (não os ligados), então módulo novo já nasce ativo.

## Documentação
- `ESPEC.md`: especificação funcional completa do Life OS (v1.0).
- `ROADMAP.md`: a especificação quebrada em etapas testáveis, com banco, código, aceite e passos manuais.
