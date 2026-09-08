# Life OS — Roadmap de construção

Quebra da `ESPEC.md` em etapas executáveis. Uma etapa = **um deploy que você consegue testar no celular
no mesmo dia**. Nenhuma etapa começa antes da anterior estar aprovada por você.

Cada etapa tem sempre os mesmos cinco campos:

| Campo | O que é |
|---|---|
| **Entrega** | O que passa a existir no app, em linguagem de uso |
| **Banco** | Tabelas criadas ou alteradas no Supabase |
| **Código** | Pastas e arquivos afetados |
| **Aceite** | O teste que você faz no celular para dizer "ok, funcionou" |
| **Você faz** | O passo manual que só você pode fazer (rodar SQL, criar conta, colar chave) |

---

## Decisão de stack: PWA em vez de Expo

A `ESPEC.md` sugere React Native + Expo. Estamos seguindo com **PWA** (site instalável) pelo Node/Express que já
está no ar. O motivo é prático: você não programa e usa iPhone + PC. No PWA, cada correção é um `git push` e em 2
minutos está no seu celular. Com Expo/iOS seria necessário conta de desenvolvedor Apple (US$ 99/ano), build na
nuvem, TestFlight e reinstalação a cada ajuste — semanas de atrito antes da primeira tela útil.

**O que o PWA entrega igual:** todas as telas, todos os módulos, offline, notificações push (iOS 16.4+, desde que
o app esteja instalado na tela inicial), câmera para foto e código de barras, áudio para ditado, gráficos.

**O que muda de forma:**

| Item da espec | Como fica no PWA |
|---|---|
| Widget de tela inicial | Não existe em iOS. Substituto: atalho na tela inicial + notificação com ação rápida |
| Apple Health / Google Fit | Sem integração direta. Substituto: registro manual de peso/sono/passos, ou importação de arquivo exportado do Saúde |
| Bloqueio biométrico | Face ID via WebAuthn (funciona) + PIN próprio como reserva |
| Banco local SQLite | IndexedDB no navegador, com fila de sincronização — mesmo efeito offline-first |
| Notificação com som de descanso no treino | Funciona com o app aberto; em segundo plano depende do push |

**Quando reconsiderar:** se um dia widget nativo e Apple Health virarem essenciais, o Supabase e toda a lógica de
banco continuam valendo — só a camada de tela seria reescrita em Expo. Nada do que construirmos é jogado fora.

---

## Estado atual

| Etapa | Situação |
|---|---|
| E0.1 Núcleo (servidor, login por senha, PWA instalável, deploy no Render) | ✅ feito |
| E0.2 Conexão com o Supabase | 🔄 falta rodar o SQL (`db/RODAR-TUDO.sql`) |
| E0.3 Casca do app: 5 abas + tema | ✅ feito |
| E0.4 Perfil e preferências | ✅ feito |
| E1.1 Hábitos e rituais | ✅ feito |
| E1.2 Checklist do dia e streaks | ✅ feito |
| E1.3 Tela Hoje | ✅ feito (falta o card "foco agora", que vem com E1.10) |
| E1.4 Botão + universal | ✅ feito |
| E1.5 Água v2 | ✅ feito |
| E1.6 Metas nos 3 horizontes | ✅ feito |
| E1.7 Vínculo automático das metas | ✅ feito |
| E1.8 Agenda e tarefas | ✅ feito |
| E1.9 Fechamento do dia | ✅ feito |
| E0.5 Offline-first | ✅ feito |
| E1.10 Rotina guiada e foco | ✅ feito |
| E0.6 Bloqueio biométrico · E1.11 Notificações | ⬜ a fazer (E1.11 precisa de chaves que você gera) |
| E1.12 Roda da vida, revisão guiada e vision board (desdobrado de M2) | ⬜ a fazer |

**Como rodar o SQL:** `db/RODAR-TUDO.sql` junta o núcleo e todos os módulos na ordem certa. Pode rodar de
novo quantas vezes quiser — nada é apagado nem duplicado. O arquivo é gerado por `npm run sql` e validado
por `npm test`, que aplica o SQL num Postgres real antes de você colar no Supabase.

---

# FASE 0 — Fundação

Sem isso, tudo o que vier depois vira retrabalho.

### E0.2 — Conexão do banco confirmada
- **Entrega:** as três tabelas iniciais respondendo; `/api/diagnostico` verde.
- **Banco:** `configuracoes`, `agua_registros`, `transacoes`.
- **Código:** `src/core/supabase.js`, `src/core/diagnostico.js`.
- **Aceite:** card da Água abre a tela, registra 500 ml e o valor sobrevive a um recarregamento.
- **Você faz:** rodar o SQL no Supabase e conferir a `SUPABASE_URL` no Render.

### E0.3 — Casca do app: 5 abas + tema
- **Entrega:** barra inferior fixa com Hoje / Metas / Corpo / Dinheiro / Eu; cabeçalho com saudação e data;
  navegação por histórico (o botão "voltar" do celular funciona); tema escuro e claro seguindo o sistema.
- **Banco:** —
- **Código:** `public/` (roteador de telas, componentes de layout), `src/core/modulos.js` (módulo passa a declarar
  em que aba aparece).
- **Aceite:** trocar de aba, fechar o app e reabrir caindo na mesma aba; nenhuma tela com rolagem horizontal.
- **Você faz:** nada.

### E0.4 — Perfil e preferências
- **Entrega:** tela "Eu → Ajustes" com nome, peso, altura, nascimento, fuso, quais módulos ficam ativos.
- **Banco:** `perfil`.
- **Código:** `src/core/perfil.js`, tela de ajustes.
- **Aceite:** desligar o módulo Dieta e a aba correspondente desaparecer; ligar de volta e voltar.
- **Você faz:** rodar o SQL da etapa.

### E0.5 — Offline-first
- **Entrega:** todo registro (água, hábito, gasto, série) é salvo primeiro no aparelho e enviado ao servidor
  depois; indicador de "3 registros aguardando envio"; nada se perde no elevador ou na academia sem sinal.
- **Banco:** coluna `origem_id` nas tabelas de registro, para não duplicar no reenvio.
- **Código:** `public/sync.js` (fila em IndexedDB), `src/core/sync.js` (recebimento em lote e deduplicação).
- **Aceite:** ativar modo avião, registrar 3 copos de água e um hábito, desativar o modo avião e ver tudo subir
  sozinho — sem duplicar.
- **Você faz:** o teste do modo avião.

### E0.6 — Bloqueio e privacidade
- **Entrega:** Face ID (ou digital) para abrir o app, e bloqueio adicional por módulo em Saúde, Vícios e Finanças;
  PIN de reserva; expiração de sessão configurável.
- **Banco:** `credenciais_webauthn`.
- **Código:** `src/core/auth.js` (WebAuthn), telas de bloqueio.
- **Aceite:** abrir o app e ser pedido o Face ID; entrar na aba Vícios e ser pedido de novo.
- **Você faz:** cadastrar o Face ID na primeira vez.

---

# FASE 1 — O dia a dia (MVP da espec)

Critério de sucesso da fase, tirado da espec: **você abrir o app todo dia por 3 semanas seguidas.**

### E1.1 — Hábitos e rituais
- **Entrega:** criar hábito (nome, ícone, cor, ritual, período, duração, frequência, meta quantitativa, tag);
  agrupar em rituais Manhã / Tarde / Noite; marcar 3 como não-negociáveis; ativar e arquivar.
- **Banco:** `habitos`, `habitos_rituais`.
- **Código:** `src/modules/habitos/`.
- **Aceite:** cadastrar 5 hábitos reais seus e vê-los agrupados por período.
- **Você faz:** rodar o SQL; cadastrar seus hábitos.

### E1.2 — Checklist do dia e streaks
- **Entrega:** checklist de hoje com checkbox grande, reordenação por arrastar, sequência por hábito e sequência
  geral, "dia de folga" (2 por mês sem quebrar a sequência), heatmap anual por hábito.
- **Banco:** `habitos_log`, `habitos_folgas`.
- **Código:** `src/modules/habitos/` (serviço de streak), tela Hoje.
- **Aceite:** marcar hábitos hoje, desmarcar um, ver a sequência subir; usar uma folga e a sequência não quebrar.
- **Você faz:** rodar o SQL.

### E1.3 — Tela Hoje completa
- **Entrega:** os blocos da espec na ordem: cabeçalho com sequência geral → plano do dia por período → anéis
  (Rotina %, Água, Treino, Dieta, Gasto do dia) → próximos 3 compromissos → card "foco agora" com timer.
  Itens de outros módulos entram no mesmo checklist (remédio, treino previsto, conta a pagar, consulta).
- **Banco:** —
- **Código:** `src/core/hoje.js` (agregador — cada módulo passa a fornecer `itensDoDia()`), tela Hoje.
- **Aceite:** um remédio cadastrado na Fase 4 aparecer no checklist sem nenhuma configuração extra.
- **Você faz:** nada.

### E1.4 — Botão + universal
- **Entrega:** botão flutuante central abrindo os 8 registros rápidos (Gasto, Água, Refeição, Treino, Tarefa,
  Compromisso, Humor, Nota), cada um já preenchido com data/hora atual e a última categoria usada.
- **Banco:** `ultimos_usos` (para o "provável").
- **Código:** `public/` (menu radial), formulários curtos por tipo.
- **Aceite:** lançar um gasto em 2 toques e 1 digitação.
- **Você faz:** rodar o SQL.

### E1.5 — Água v2
- **Entrega:** meta calculada pelo peso e ajustada em dia de treino e calor; recipientes personalizados;
  visual de garrafa enchendo; histórico semanal e mensal; bebidas com fator de hidratação (café e álcool
  descontam); lembretes só quando você está atrasado no ritmo do dia, respeitando o horário de sono.
- **Banco:** `agua_registros` (+ `tipo_bebida`, `fator`), `agua_recipientes`.
- **Código:** `src/modules/agua/`.
- **Aceite:** registrar um café e ver o total de hidratação subir menos que 100%; receber um lembrete atrasado.
- **Você faz:** rodar o SQL; autorizar notificações no celular.

### E1.6 — Metas nos 3 horizontes
- **Entrega:** meta com horizonte (curto/médio/longo), área da vida, métrica, valor atual e alvo, prazo, motivo
  com foto; marcos; hierarquia (meta longa contendo metas médias); barra de progresso; alerta de meta órfã
  (14 dias sem hábito ou tarefa vinculada).
- **Banco:** `metas`, `metas_marcos`, `metas_vinculos`.
- **Código:** `src/modules/metas/`.
- **Aceite:** criar "Supino 80 kg x 5" (curto) dentro de "Ficar forte" (longo) e ver o progresso.
- **Você faz:** rodar o SQL; cadastrar 3 metas suas.

### E1.7 — Vínculo automático das metas
- **Entrega:** meta de hábito lê o streak; meta financeira lê o saldo real; meta de carga lê o log de treino.
  Você nunca atualiza um número duas vezes.
- **Banco:** —
- **Código:** `src/core/vinculos.js` (cada módulo publica métricas que uma meta pode consumir).
- **Aceite:** registrar um gasto e ver a meta "Reserva de emergência" mudar sozinha.
- **Você faz:** nada.

### E1.8 — Agenda e tarefas
- **Entrega:** eventos com tipo, local, lembretes múltiplos e recorrência flexível; visões dia/semana/mês/lista;
  tarefas com prazo, prioridade e vínculo a meta ou evento; aviso de conflito de horário; blocos de tempo.
- **Banco:** `agenda_eventos`, `tarefas`.
- **Código:** `src/modules/agenda/`, `src/modules/tarefas/`.
- **Aceite:** criar "Consulta dentista quinta 15h" e ver na tela Hoje com contagem regressiva.
- **Você faz:** rodar o SQL.

### E1.9 — Fechamento do dia
- **Entrega:** depois das 20h, a tela Hoje mostra o fechamento: humor, nota rápida, o que travou, pledge dos
  vícios, resumo do que foi feito.
- **Banco:** `humor_log`, `diario`.
- **Código:** `src/modules/diario/`, tela Hoje.
- **Aceite:** às 21h aparecer o bloco; preencher e ver no histórico no dia seguinte.
- **Você faz:** rodar o SQL.

### E1.10 — Rotina guiada e foco
- **Entrega:** "Iniciar rotina da manhã" conduz item por item com cronômetro e transição automática;
  timer Pomodoro no card de foco; som ambiente opcional.
- **Banco:** `foco_sessoes`.
- **Código:** `src/modules/habitos/` (modo guiado), `public/` (timer).
- **Aceite:** rodar sua rotina da manhã inteira só tocando "próximo".
- **Você faz:** rodar o SQL.

### E1.11 — Notificações e horário de silêncio
- **Entrega:** push instalado no celular; lembretes de hábito, água, remédio e compromisso; central de
  notificações com horário de silêncio.
- **Banco:** `notificacoes_config`, `push_inscricoes`.
- **Código:** `src/core/notificacoes.js`, `public/sw.js`, tarefa agendada no servidor.
- **Aceite:** receber o lembrete de água no horário certo e nenhum durante o sono.
- **Você faz:** autorizar notificações; rodar o SQL.

---

# FASE 2 — Corpo: treino e progressão

O módulo mais complexo e o de retorno mais visível.

### E2.1 — Biblioteca de exercícios
- **Entrega:** ~150 exercícios com músculo primário e secundário, equipamento, instruções, erros comuns e
  variações; filtros por equipamento, nível e tipo; exercícios criados por você.
- **Banco:** `exercicios` (+ carga inicial via SQL de seed).
- **Código:** `src/modules/treino/`.
- **Aceite:** buscar "supino" e achar as variações com o músculo certo.
- **Você faz:** rodar o SQL de seed.

### E2.2 — Mapa corporal interativo
- **Entrega:** silhueta frente/costas em SVG; toca no músculo → lista de exercícios que o recrutam.
- **Banco:** —
- **Código:** `src/modules/treino/` (mapa em SVG).
- **Aceite:** tocar em "dorsal" e receber remada, puxada e barra fixa.
- **Você faz:** nada.

### E2.3 — Rotinas e programação
- **Entrega:** montar rotinas (A/B, ABC, push-pull-legs, full body, upper-lower) com dia da semana, séries,
  reps e RIR alvo por exercício, ordem e regra de progressão; templates prontos.
- **Banco:** `treino_rotinas`, `treino_rotina_exercicios`.
- **Código:** `src/modules/treino/`.
- **Aceite:** montar seu ABC real e ver "hoje é Treino B — Costas" na tela Hoje.
- **Você faz:** rodar o SQL; montar sua rotina.

### E2.4 — Tela de execução do treino
- **Entrega:** lista do dia, cada exercício mostrando **o que você fez da última vez** e **a sugestão de hoje**;
  registro por série com teclado numérico grande; "repetir última série"; timer de descanso automático com som;
  notas por exercício; superséries, dropset e rest-pause.
- **Banco:** `treino_sessoes`, `treino_series`.
- **Código:** `src/modules/treino/`.
- **Aceite:** treinar de verdade na academia usando só o celular, sem travar e sem perder série no sinal ruim.
- **Você faz:** rodar o SQL; usar num treino real.

### E2.5 — Motor de progressão de carga
- **Entrega:** por exercício, escolher a regra: linear (+2,5 kg ao bater tudo), dupla progressão (8→12 e sobe
  peso), por RIR/RPE, ou por % de 1RM (estimado por Epley); a sugestão de hoje sai dessa regra;
  detecção de estagnação (3 sessões sem avanço → sugere deload, troca de variação ou ajuste de volume);
  PR marcado na hora, com animação.
- **Banco:** `treino_progressao` (config por exercício), `treino_prs`.
- **Código:** `src/modules/treino/progressao.js` (com testes automatizados — é regra de cálculo).
- **Aceite:** completar tudo no alvo e a sugestão da próxima sessão subir sozinha; falhar 3 vezes e o app propor deload.
- **Você faz:** rodar o SQL.

### E2.6 — Gráficos e mapa de calor muscular
- **Entrega:** carga máxima por exercício, volume semanal (kg×reps), volume por grupo muscular, frequência,
  tonelagem mensal, evolução do 1RM estimado; mapa de calor mostrando grupo muscular em déficit na semana.
- **Banco:** —
- **Código:** `src/modules/treino/` (gráficos em SVG, sem biblioteca externa).
- **Aceite:** ver a curva do seu supino de 90 dias e o mapa apontando o que está atrasado.
- **Você faz:** nada.

### E2.7 — Programas periodizados por fases
- **Entrega:** programa em fases (padrão de movimento → carga leve → progressão em barra) com semanas de deload;
  o app avança de fase quando os critérios são batidos; gerador de programa por IA a partir de dias disponíveis,
  equipamento, objetivo, lesões e histórico.
- **Banco:** `treino_programas`, `treino_programa_fases`.
- **Código:** `src/modules/treino/programas.js`, `src/core/ai.js`.
- **Aceite:** gerar um programa de 3 dias por semana com halteres e ele virar rotinas de verdade.
- **Você faz:** rodar o SQL.

### E2.8 — Medidas corporais e fotos
- **Entrega:** peso, % de gordura, braço, peito, cintura, quadril, coxa; fotos de progresso comparadas lado a
  lado por data; export CSV do histórico completo de treino e medidas.
- **Banco:** `medidas_corporais`; bucket privado no Supabase Storage.
- **Código:** `src/modules/treino/`, `src/core/arquivos.js`.
- **Aceite:** tirar foto pelo app, ver ao lado da de 30 dias atrás, baixar o CSV.
- **Você faz:** criar o bucket no Supabase (eu passo o passo a passo); rodar o SQL.

---

# FASE 3 — Dinheiro

O que existe hoje é só a tabela `transacoes` herdada. Esta fase constrói o módulo de verdade.

### E3.1 — Contas, categorias e lançamento completo
- **Entrega:** contas (corrente, poupança, carteira, investimento) com saldo consolidado; categorias e
  subcategorias com ícone, cor e teto mensal; lançamento manual completo (valor, data, categoria, conta, forma
  de pagamento, tags, anexo, observação); extrato com filtros e busca.
- **Banco:** `contas`, `categorias`, `transacoes` (reestruturada).
- **Código:** `src/modules/financas/`.
- **Aceite:** lançar 10 gastos reais do seu mês e o saldo por conta fechar com o do banco.
- **Você faz:** rodar o SQL; cadastrar suas contas e categorias.

### E3.2 — Cartões, faturas e parcelamentos
- **Entrega:** cartão com fechamento, vencimento e limite; fatura atual e futuras separadas do mês de caixa;
  compra em 10x gerando as 10 parcelas e mostrando o comprometimento dos próximos meses.
- **Banco:** `cartoes`, `transacoes.parcela_x_de_y`, `faturas`.
- **Código:** `src/modules/financas/faturas.js` (com testes — a regra de data é onde todo app erra).
- **Aceite:** lançar uma compra parcelada e ver as parcelas nas faturas corretas, respeitando o fechamento.
- **Você faz:** rodar o SQL; cadastrar seus cartões.

### E3.3 — Recorrentes e projeção
- **Entrega:** salário, aluguel, assinaturas e academia como recorrentes, projetados nos meses seguintes;
  projeção de saldo até o fim do mês com base nos recorrentes e na média de gastos.
- **Banco:** `recorrentes`.
- **Código:** `src/modules/financas/`.
- **Aceite:** ver "sobra prevista até dia 30" e conferir se bate no fim do mês.
- **Você faz:** rodar o SQL; cadastrar seus recorrentes.

### E3.4 — Orçamento por envelope
- **Entrega:** teto por categoria com barra de consumo, alerta em 80% e 100%, regra 50/30/20 opcional,
  teto diário de gasto refletido no anel da tela Hoje.
- **Banco:** `orcamentos`.
- **Código:** `src/modules/financas/`.
- **Aceite:** estourar 80% de "delivery" e receber o aviso.
- **Você faz:** rodar o SQL; definir seus tetos.

### E3.5 — Painel e relatórios
- **Entrega:** "entra / sai / sobra" na primeira dobra; relatórios por categoria, por forma de pagamento,
  mês a mês, ano a ano, maiores gastos, gasto por dia da semana; export CSV e PDF.
- **Banco:** —
- **Código:** `src/modules/financas/relatorios.js`.
- **Aceite:** comparar este mês com o passado e achar as 3 maiores diferenças.
- **Você faz:** nada.

### E3.6 — Metas financeiras e dívidas
- **Entrega:** meta com valor alvo, prazo, aporte mensal necessário e progresso (lendo o saldo real);
  dívidas com saldo, juros e plano de quitação (bola de neve ou avalanche) com data prevista de liberdade.
- **Banco:** `metas_financeiras`, `dividas`.
- **Código:** `src/modules/financas/`.
- **Aceite:** cadastrar uma dívida e ver as duas estratégias comparadas com datas.
- **Você faz:** rodar o SQL.

### E3.7 — Alertas de vazamento
- **Entrega:** assinatura esquecida, categoria acima da média histórica, gasto fora do padrão.
- **Banco:** —
- **Código:** `src/modules/financas/alertas.js`.
- **Aceite:** o app apontar uma assinatura que você não usa há 3 meses.
- **Você faz:** nada.

> **Fora desta fase (custo e cadastro):** Open Finance exige um agregador pago (Pluggy, Belvo) — entra só depois
> que o lançamento manual estiver redondo. OCR de cupom entra na Fase 6, junto com a IA de visão.

---

# FASE 4 — Saúde e Vícios

### E4.1 — Medicamentos e suplementos
- **Entrega:** nome, dose, horários, duração, estoque restante e alerta de recompra; os horários entram
  automaticamente no checklist de Hoje.
- **Banco:** `medicamentos`, `medicamentos_log`.
- **Código:** `src/modules/saude/`.
- **Aceite:** cadastrar vitamina D e ela aparecer amanhã no checklist, baixando o estoque ao marcar.
- **Você faz:** rodar o SQL.

### E4.2 — Consultas e modo consulta
- **Entrega:** consulta com especialidade, profissional, local, motivo, perguntas a fazer, resumo, prescrição e
  retorno sugerido (que agenda o próximo sozinho); recorrências de rotina (dentista a cada 6 meses, check-up
  anual); "modo consulta" gerando um PDF com histórico recente, medicações e últimos exames.
- **Banco:** `saude_consultas`, `saude_recorrencias`.
- **Código:** `src/modules/saude/`.
- **Aceite:** gerar o PDF e conseguir mostrar na tela do celular no consultório.
- **Você faz:** rodar o SQL.

### E4.3 — Exames e evolução por marcador
- **Entrega:** upload de PDF/foto do exame; extração dos valores principais (hemograma, glicemia, colesterol,
  vitamina D, TSH etc.); gráfico de evolução por marcador ao longo dos anos com faixa de referência.
- **Banco:** `saude_exames`, `saude_marcadores`; bucket privado no Storage.
- **Código:** `src/modules/saude/`, `src/core/ai.js` (leitura do PDF).
- **Aceite:** subir dois exames de anos diferentes e ver a curva da vitamina D com a faixa normal ao fundo.
- **Você faz:** criar o bucket; subir seus exames antigos.

### E4.4 — Sinais, sono e sintomas
- **Entrega:** pressão, frequência cardíaca de repouso, peso, glicemia; sono (dormiu, acordou, qualidade);
  sintomas e episódios com intensidade; vacinas com reforços; contatos de saúde e carteirinha protegidos.
- **Banco:** `sinais_log`, `sono_log`, `sintomas`, `vacinas`, `saude_contatos`.
- **Código:** `src/modules/saude/`.
- **Aceite:** registrar uma semana de sono e ver a média; registrar uma dor de cabeça em 2 toques.
- **Você faz:** rodar o SQL.

### E4.5 — Vícios: contador, pledge e marcos
- **Entrega:** vários hábitos simultâneos, cada um com contador ao vivo (dias, horas, minutos, segundos);
  "meus porquês" com fotos; compromisso diário de manhã e revisão à noite, com sequência própria;
  marcos (1, 3, 7, 14, 30, 90, 180, 365 dias) com celebração e reflexão registrada;
  linha do tempo de recuperação por tipo de hábito.
- **Banco:** `vicios`, `vicios_pledges`, `vicios_marcos`.
- **Código:** `src/modules/vicios/`.
- **Aceite:** contador batendo em tempo real ao abrir; pledge de manhã e revisão à noite no fechamento do dia.
- **Você faz:** rodar o SQL; cadastrar seus hábitos e datas de início.

### E4.6 — SOS, fissuras e gatilhos
- **Entrega:** botão SOS grande abrindo o fluxo de 3 passos (respiração guiada de 60s → seus porquês → ação
  alternativa da sua lista); registro de fissura (horário, local, gatilho, intensidade, emoção, cedeu ou não);
  mapa de gatilhos por horário, dia, lugar e emoção; rede de apoio com 1 a 3 contatos e botão de ligar;
  espaço fixo na tela para contato profissional ou grupo de apoio.
- **Banco:** `vicios_fissuras`, `vicios_apoio`.
- **Código:** `src/modules/vicios/`.
- **Aceite:** usar o SOS até o fim em menos de 3 minutos; depois de 10 registros, o mapa apontar seu pior horário.
- **Você faz:** rodar o SQL; cadastrar seus porquês, ações alternativas e contatos.

### E4.7 — Recaída sem apagar o histórico e economia
- **Entrega:** recaída registra o aprendizado, reinicia o contador atual e **preserva o recorde** ("você já
  conseguiu 47 dias — isso não sumiu"); calculadora de dinheiro e tempo economizados com projeção de 6 meses e
  1 ano, e botão para mandar o valor economizado direto para uma meta financeira.
- **Banco:** `vicios_recaidas`.
- **Código:** `src/modules/vicios/`, integração com `metas_financeiras`.
- **Aceite:** registrar uma recaída de teste e ver o recorde anterior continuar visível; mandar R$ 300
  economizados para a meta "viagem".
- **Você faz:** rodar o SQL.

---

# FASE 5 — Dieta e Diário

### E5.1 — Registro de refeição, do simples ao completo
- **Entrega:** modo simples ("comi bem hoje: sim / mais ou menos / não"); registro por texto livre, foto ou voz;
  refeições salvas e receitas próprias com cálculo por porção ("café da manhã padrão" em 1 toque);
  fotos como diário visual; timer de jejum.
- **Banco:** `alimentos`, `refeicoes_log`, `refeicoes_salvas`.
- **Código:** `src/modules/dieta/`.
- **Aceite:** registrar seu café da manhã padrão em 1 toque por 3 dias seguidos.
- **Você faz:** rodar o SQL.

### E5.2 — Banco de alimentos e código de barras
- **Entrega:** busca em banco de alimentos (Open Food Facts + tabela TACO brasileira); leitura de código de
  barras pela câmera; macros e micronutrientes por refeição (proteína, fibra, sódio em destaque).
- **Banco:** `alimentos` (carga inicial), `alimentos_favoritos`.
- **Código:** `src/modules/dieta/`, leitor de código de barras no navegador.
- **Aceite:** escanear um pote de whey e os macros vierem certos.
- **Você faz:** rodar o SQL de carga.

### E5.3 — Alvos e ajuste adaptativo
- **Entrega:** alvos de calorias e macros, diferentes em dia de treino e de descanso; ajuste semanal automático
  comparando consumo real com variação de peso (modelo MacroFactor), em vez de número fixo.
- **Banco:** `dieta_alvos`, `dieta_ajustes`.
- **Código:** `src/modules/dieta/adaptativo.js` (com testes).
- **Aceite:** após 3 semanas de dados, o app propor um ajuste com a justificativa.
- **Você faz:** rodar o SQL; registrar peso e comida por 3 semanas.

### E5.4 — Planejador semanal e lista de compras
- **Entrega:** plano de refeições da semana e lista de compras gerada a partir dele, agrupada por seção do mercado.
- **Banco:** `dieta_plano`, `lista_compras`.
- **Código:** `src/modules/dieta/`.
- **Aceite:** montar a semana e sair pro mercado usando a lista do celular.
- **Você faz:** rodar o SQL.

### E5.5 — Diário, humor e reflexão semanal
- **Entrega:** check-in de humor 1 a 5 com emoções nomeadas e fatores; diário livre com prompts; gratidão (3
  linhas); reflexão semanal guiada (vitórias, travas, aprendizado, foco da semana); linha do tempo da vida com
  fotos e "um ano atrás você..."; áudios de respiração e som ambiente.
- **Banco:** `humor_log` (ampliada), `diario`, `revisoes`.
- **Código:** `src/modules/diario/`.
- **Aceite:** fazer a revisão de domingo em 5 minutos e ela aparecer no histórico.
- **Você faz:** rodar o SQL.

### E5.6 — Como você se sentiu depois de comer
- **Entrega:** marcador de energia, inchaço e sono após a refeição, cruzado com humor e treino.
- **Banco:** `refeicoes_log.sensacoes`.
- **Código:** `src/modules/dieta/`.
- **Aceite:** ver quais refeições aparecem antes dos seus dias de baixa energia.
- **Você faz:** rodar o SQL.

---

# FASE 6 — Inteligência

Aqui está o diferencial da seção 9 da espec. Só funciona bem **depois** que os dados existem — por isso vem no fim.

### E6.1 — Barra de comando por IA
- **Entrega:** um campo no topo da tela Hoje que entende linguagem natural e roteia para o módulo certo:
  "gastei 45 no almoço", "supino 4x8 com 60", "consulta com dentista quinta 15h", "bebi 500ml";
  sempre mostra o que entendeu antes de gravar, com 1 toque para confirmar ou corrigir.
- **Banco:** `ia_comandos` (histórico, para melhorar o roteamento).
- **Código:** `src/core/ai.js` (uma ferramenta por módulo), `src/core/roteador.js`.
- **Aceite:** os 4 exemplos da espec funcionando na primeira tentativa.
- **Você faz:** decidir o provedor de IA (ver quadro de custos abaixo) e colar a chave no Render.

### E6.2 — Ditado e foto
- **Entrega:** falar em vez de digitar na barra de comando; foto de cupom virando lançamento por OCR;
  foto de refeição virando estimativa de macros.
- **Banco:** —
- **Código:** `src/core/ai.js` (áudio e visão), `public/` (gravador).
- **Aceite:** ditar "gastei 32 no uber" andando na rua e o lançamento entrar certo.
- **Você faz:** autorizar microfone e câmera.

### E6.3 — WhatsApp
- **Entrega:** o webhook que já está no projeto passa a receber de verdade: texto e áudio pelo WhatsApp caem
  nos módulos (gasto, água, treino, humor), com confirmação na conversa.
- **Banco:** `whatsapp_mensagens`.
- **Código:** `src/core/webhook.js`, `src/core/whatsapp.js`.
- **Aceite:** mandar "bebi 500ml" pelo WhatsApp e ver o anel de água subir no app.
- **Você faz:** finalizar o app no Meta for Developers e apontar o webhook para a URL do Render.

### E6.4 — Briefing da manhã e fechamento da noite
- **Entrega:** notificação (e opcionalmente mensagem no WhatsApp) de manhã com agenda, treino previsto,
  3 prioridades, saldo do mês, água e remédio; à noite, o que foi feito, o que ficou e uma frase de reforço.
- **Banco:** —
- **Código:** `src/core/rotinas-agendadas.js` (cron no Render).
- **Aceite:** receber os dois, nos horários certos, por 3 dias seguidos.
- **Você faz:** criar o cron job no Render (é grátis no plano atual, eu passo o passo).

### E6.5 — Revisão semanal e insights cruzados
- **Entrega:** relatório semanal único juntando rotina, treino, dieta, dinheiro, saúde e vícios, com 3
  observações e 1 sugestão; insights cruzados de verdade ("nas semanas em que você dormiu menos de 6h, o volume
  de treino caiu 22% e o gasto com delivery dobrou"); correlações humor × sono × treino × fissura × gasto.
- **Banco:** `insights`.
- **Código:** `src/core/insights.js` (cálculo das correlações em SQL/JS; a IA só escreve o texto).
- **Aceite:** o primeiro insight que te faça mudar algo na semana seguinte.
- **Você faz:** nada — mas precisa de pelo menos 4 semanas de dados.

### E6.6 — Chat com contexto
- **Entrega:** conversar com o app sobre seus próprios dados: "quanto gastei com delivery esse mês?",
  "meu supino subiu quanto em 90 dias?", "quantos dias sem cigarro?", "como foi minha semana?".
- **Banco:** `ia_conversas`.
- **Código:** `src/core/chat.js` (a IA consulta via funções, nunca recebe o banco inteiro).
- **Aceite:** as 4 perguntas acima respondidas com números que você confere na tela e batem.
- **Você faz:** nada.

### E6.7 — Gamificação
- **Entrega:** XP e nível por área (Corpo, Mente, Dinheiro, Disciplina); medalhas por marcos reais (100 treinos,
  30 dias de rotina completa, 6 meses sem vício, primeiro mês dentro do orçamento); sequência geral e por módulo;
  "fator de ontem" (comparação só com você mesmo); modo desafio de 30 dias; notificação de reforço, nunca de cobrança.
- **Banco:** `xp_log`, `conquistas`, `desafios`.
- **Código:** `src/modules/gamificacao/`.
- **Aceite:** ganhar a primeira medalha sem ter feito nada além de usar o app.
- **Você faz:** rodar o SQL.

---

# FASE 7 — Fechamento

### E7.1 — Seus dados na mão
- **Entrega:** export total em CSV e JSON, backup manual e restauração.
- **Aceite:** baixar tudo e abrir no Excel.

### E7.2 — Acabamento
- **Entrega:** tema claro/escuro com cor de destaque e tamanho de fonte; ícones do PWA em PNG (iOS usa na tela
  inicial); tela de abertura; revisão de acessibilidade e de toque em tela pequena.
- **Aceite:** o app parecer app, não site.

### E7.3 — Calendário externo
- **Entrega:** sincronização com Google Calendar (e leitura de arquivo .ics do Apple/Outlook).
- **Você faz:** autorizar a conta Google; criar as credenciais (eu passo o passo).

---

## Quadro de custos e cadastros externos

| Item | Etapa | Custo | Observação |
|---|---|---|---|
| Render (hospedagem) | já ativo | US$ 0 (dorme após 15 min) ou US$ 7/mês | O plano pago só vale a pena quando o WhatsApp entrar |
| Supabase | já ativo | US$ 0 até 500 MB | Sobra muito para dados pessoais; fotos e PDFs consomem mais |
| IA (Anthropic) | E6.1 | centavos por dia no seu volume | Alternativa gratuita para testes: NVIDIA Build, já no projeto |
| WhatsApp Cloud API | E6.3 | grátis nas conversas iniciadas por você | Precisa app no Meta for Developers |
| Open Finance (Pluggy/Belvo) | pós-Fase 3 | pago, a partir de ~R$ 50/mês | Só se o lançamento manual não bastar |
| Domínio próprio | opcional | ~R$ 40/ano | `vida.seudominio.com` em vez de `.onrender.com` |
| Vídeos de exercício | E2.1 | — | Licenciar é caro; usamos instruções escritas + link para vídeo público |

---

## Convenções do projeto

- **Uma etapa, um commit, um deploy.** O `CHANGELOG.md` registra o que entrou em cada uma.
- **Tabelas em português**, prefixadas pelo módulo (`treino_series`, `vicios_fissuras`), sempre com
  `user_id`, `criado_em` e RLS ligado.
- **Todo módulo segue o mesmo contrato** (`id`, `nome`, `emoji`, `aba`, `rotas`, `resumoDoDia`, `itensDoDia`),
  então entra na tela Hoje e no dashboard sem código extra.
- **Regra de cálculo tem teste automatizado**: progressão de carga, fatura de cartão, streak, ajuste de dieta.
  São as partes onde um erro silencioso estraga meses de dado.
- **Nada de segredo no repositório.** Chaves só no `.env` local e nas variáveis do Render.
- **O SQL de cada etapa fica em `src/modules/<módulo>/schema.sql`**, para você poder rodar de novo se precisar.
