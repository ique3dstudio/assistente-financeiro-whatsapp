# LIFE OS — Especificação do App Pessoal

Documento de estrutura funcional, layout e organização.
Versão 1.0 — base para desenvolvimento (inclusive via Claude Code).

---

## 1. Conceito

Um único app que responde a três perguntas por dia:

1. **O que eu preciso fazer hoje?** (rotina, agenda, treino, água, remédios)
2. **Como eu estou indo?** (metas, progressão de carga, dinheiro, dias limpos, saúde)
3. **O que eu preciso ajustar?** (insights cruzados, revisão semanal)

### Princípios de design

| Princípio | O que significa na prática |
|---|---|
| Registro em 3 segundos | Todo lançamento (gasto, copo de água, série, refeição) tem um caminho de 1 ou 2 toques ou por texto/voz |
| Uma tela de verdade | A tela "Hoje" resolve 80% do uso; o resto é consulta |
| Nada de tela vazia punitiva | Falhar um dia mostra retomada, não vergonha |
| Dados cruzados | Sono ruim aparece no treino; treino aparece no gasto com suplemento; humor aparece no gatilho de vício |
| Offline-first | Registro sempre funciona sem internet; sincroniza depois |
| Privado por padrão | Saúde, vícios e finanças ficam locais/criptografados, com bloqueio biométrico |

---

## 2. Arquitetura de navegação

**Barra inferior — 5 abas fixas:**

```
[ Hoje ]  [ Metas ]  [ Corpo ]  [ Dinheiro ]  [ Eu ]
```

| Aba | Contém |
|---|---|
| **Hoje** | Checklist de rotina, agenda do dia, água, lembretes, botão + universal |
| **Metas** | Curto/médio/longo prazo, marcos, hábitos vinculados, revisão |
| **Corpo** | Treino, dieta, saúde (consultas/exames), sono, medidas |
| **Dinheiro** | Lançamentos, orçamento, contas, cartões, metas financeiras, relatórios |
| **Eu** | Diário, humor, vícios/controle, conquistas, insights, ajustes |

**Botão + universal (flutuante, central):** abre um menu radial com os 8 registros mais usados — Gasto, Água, Refeição, Treino, Tarefa, Compromisso, Humor, Nota. Cada um deve abrir já preenchido com o provável (data/hora atual, última categoria usada).

**Barra de comando por IA (topo da tela Hoje):** campo único onde você escreve ou fala em linguagem natural:
- "gastei 45 no almoço" → lança despesa
- "supino 4x8 com 60" → registra série
- "consulta com dentista quinta 15h" → cria compromisso
- "bebi 500ml" → soma água

---

## 3. Tela HOJE (detalhada)

Ordem vertical dos blocos:

1. **Cabeçalho**: saudação, data, clima opcional, sequência geral ("18 dias seguidos").
2. **Barra de comando IA**.
3. **Meu plano de hoje** — checklist único e ordenado por período:
   - Manhã / Tarde / Noite (rituais)
   - Cada item: ícone colorido, nome, horário sugerido, checkbox grande
   - Itens vindos de outros módulos entram automaticamente aqui: "Treino B — Costas", "Tomar vitamina D", "Pagar cartão", "Consulta 15h"
4. **Anéis de progresso do dia**: Rotina %, Água, Treino, Dieta, Gasto do dia vs. teto diário.
5. **Agenda**: próximos 3 compromissos com contagem regressiva.
6. **Foco agora**: card do próximo item + timer (Pomodoro ou rotina guiada).
7. **Fechamento do dia** (aparece após as 20h): humor, nota rápida, revisão do dia, pledge dos vícios, o que travou.

---

## 4. MÓDULOS DETALHADOS

### M1 — Rotina e Hábitos

**Funções essenciais**
- Criar rituais nomeados (Manhã, Pós-trabalho, Noite) e empilhar hábitos dentro deles.
- Hábito com: nome, ícone, cor, período, duração estimada, frequência (diária, X vezes por semana, dias específicos, a cada N dias), meta quantitativa opcional (ex.: 30 min, 8 copos), tag, lembrete.
- **Modo rotina guiada**: toca "Iniciar rotina da manhã" e o app conduz item por item com cronômetro, som ambiente e transição automática — reduz decisão.
- **Checklist do dia** com reordenação por arrastar.
- **Streaks + "dia de folga"**: 1 a 2 faltas programadas por mês sem quebrar a sequência (evita o efeito "quebrou, abandonou").
- **Habit stacking**: vincular hábito novo a um já consolidado ("depois do café → 10 min de leitura").
- **Histórico**: heatmap anual por hábito, taxa de conclusão por dia da semana e por período do dia.
- **Widget de tela inicial**: marcar hábito sem abrir o app.
- **Modo trilha (journeys)**: programas de 21/30/60 dias com conteúdo diário curto (ex.: "Acordar cedo", "Foco profundo", "Sem açúcar").
- **Não-negociáveis**: 3 hábitos marcados como âncora — se só fizer esses, o dia conta como bom.

**Origem das ideias:** rituais manhã/tarde/noite, trilhas temáticas e coaching diário (Fabulous); planner com cores, ícones, tags e lembretes amigáveis + tracker de humor (Me+); gamificação leve (Habitica); estatísticas e Pomodoro (TickTick).

---

### M2 — Metas (curto, médio e longo prazo)

**Estrutura em 3 horizontes**

| Horizonte | Prazo | Exemplo | Revisão |
|---|---|---|---|
| Curto | até 3 meses | "Supino 80kg x 5" | Semanal |
| Médio | 3–12 meses | "Reserva de emergência completa" | Mensal |
| Longo | 1–5 anos | "Casa própria", "Especialização" | Trimestral |

**Funções**
- Meta com: título, horizonte, área da vida (Saúde, Carreira, Financeiro, Relacionamentos, Aprendizado, Espiritual), métrica alvo, valor atual, prazo, motivo ("por que isso importa" — texto + foto).
- **Decomposição automática**: a meta longa gera metas médias sugeridas, que geram marcos e hábitos semanais. Ex.: "Correr 10 km" → "5 km em 8 semanas" → hábito "correr 3x/semana".
- **Vínculo com módulos**: meta financeira lê o saldo real do módulo Dinheiro; meta de carga lê o log de treino; meta de hábito lê o streak. Nada de atualizar duas vezes.
- **Marcos (milestones)** com celebração e registro em foto.
- **Roda da vida**: nota de 0 a 10 por área, refeita a cada trimestre, com gráfico radar comparando períodos.
- **Revisão guiada**: semanal (5 perguntas), mensal (o que avançou/travou), trimestral (recalibrar metas).
- **Vision board**: mural de imagens das metas longas, aparece na abertura semanal.
- **Alerta de meta órfã**: meta sem nenhum hábito ou tarefa vinculada há 14 dias é sinalizada.

---

### M3 — Agenda e Compromissos

- Visões: dia, semana, mês, agenda (lista).
- Sincronização bidirecional com Google Calendar / Apple Calendar / Outlook.
- Tipos de evento com cor e comportamento próprios: Reunião, Consulta médica, Treino, Pessoal, Viagem, Financeiro (vencimento).
- Campos: título, local (com mapa e tempo de deslocamento), participantes, pauta, anexos, lembretes múltiplos (ex.: 1 dia antes + 30 min antes).
- **Notas de reunião**: bloco de pauta antes, decisões e próximos passos depois; toda tarefa criada aí vai para o checklist de Hoje.
- **Tempo de deslocamento automático** para eventos com endereço.
- **Blocos de tempo**: arrastar hábito/tarefa para o calendário e reservar horário (time blocking).
- **Conflitos**: aviso quando treino, compromisso e refeição colidem.
- Eventos recorrentes com regra flexível (a cada 15 dias, primeira segunda do mês etc.).

---

### M4 — Água e Hidratação

- Meta diária calculada por peso e ajustada em dias de treino e calor.
- Registro em 1 toque com recipientes personalizados (copo 250 ml, garrafa 500 ml, garrafão 2 L, café, chá).
- Visual de garrafa enchendo + anel no widget.
- Lembretes inteligentes: só notifica se você está atrasado em relação ao ritmo do dia, e respeita horário de sono.
- Histórico semanal/mensal e correlação com energia e treino.
- Contagem opcional de outras bebidas com fator de hidratação (café e álcool descontam).

---

### M5 — Treino e Progressão de Carga

**Biblioteca de exercícios**
- Mapa corporal interativo (frente/costas): toca no músculo → lista de exercícios que o recrutam.
- Ficha do exercício: vídeo/GIF em dois ângulos, passo a passo, músculo primário e secundário, equipamento, erros comuns, variações mais fáceis e mais difíceis.
- Filtros: equipamento disponível (casa, halteres, academia completa), nível, tipo (composto/isolado), tempo.
- Exercícios personalizados criados por você.

**Programação**
- Criação de rotinas (A/B, ABC, push/pull/legs, full body, upper/lower) com dia da semana.
- **Programas periodizados por fases** (modelo LIFTOFF): fase 1 aprendizado de padrão de movimento, fase 2 carga leve, fase 3 progressão em barra, com semanas de deload — o app avança de fase quando os critérios são batidos.
- Templates prontos + gerador por IA a partir de: dias disponíveis, equipamento, objetivo, lesões e histórico.
- Superséries, dropsets, rest-pause, RIR/RPE por série.

**Execução (tela de treino)**
- Lista de exercícios do dia; cada linha mostra **o que você fez da última vez** (peso × reps × RIR) e **a sugestão de hoje**.
- Registro por série com teclado numérico grande e botão "repetir última série".
- Timer de descanso automático por exercício, com notificação e som.
- Marcação de PR na hora, com animação.
- Notas por exercício ("banco 3 furos", "dor no ombro na 4ª série").

**Progressão de carga — o coração do módulo**
- Motor de progressão configurável por exercício:
  - **Linear**: +2,5 kg quando completar todas as séries e reps no alvo.
  - **Dupla progressão**: sobe reps dentro de uma faixa (8→12) e depois adiciona peso, voltando ao piso da faixa.
  - **Por RIR/RPE**: sugere carga para manter o esforço alvo.
  - **Por percentual de 1RM** (com 1RM estimado pela fórmula de Epley a partir dos logs).
- **Detecção de estagnação**: 3 sessões sem avanço → sugere deload, troca de variação ou ajuste de volume.
- Gráficos: carga máxima por exercício, volume total (kg×reps) por semana, volume por grupo muscular, frequência, tonelagem mensal, evolução do 1RM estimado.
- **Mapa de calor muscular**: quais grupos foram treinados na semana e quais estão em déficit.
- Medidas corporais (peso, braço, peito, cintura, coxa, % de gordura) com fotos de progresso lado a lado por data.
- Exportação CSV do histórico completo.

**Origem das ideias:** mapa corporal + biblioteca de exercícios com vídeo e log de séries (MuscleWiki); programa em fases com progressão explícita, aquecimento e orientação de recuperação (LIFTOFF: Couch to Barbell); lógica automática de aumento/redução de carga e templates de programas (Liftosaur/Liftalytics); PRs, timer de descanso e medidas corporais (trackers de progressive overload em geral).

---

### M6 — Dieta e Alimentação

- Registro de refeição por: busca no banco de alimentos, código de barras, foto, voz ou texto livre.
- Refeições salvas e receitas próprias (com cálculo por porção) — "café da manhã padrão" em 1 toque.
- Alvos de calorias e macros configuráveis, com opção de alvos diferentes em dia de treino e dia de descanso.
- Acompanhamento de micronutrientes (opcional, para quem quer profundidade) e de fibras, sódio, proteína por refeição.
- **Ajuste adaptativo semanal**: o app compara consumo médio real com variação de peso e sugere ajuste de alvo, em vez de usar um número fixo calculado uma única vez.
- Planejador semanal de refeições + **lista de compras** gerada a partir do plano.
- Fotos das refeições como diário visual (útil mesmo sem contar caloria).
- Jejum/janela alimentar: timer opcional.
- Marcadores de como você se sentiu depois de comer (energia, inchaço, sono) → cruzamento com humor e treino.
- Modo simples: para quem não quer contar nada, só checar "comi bem hoje: sim/mais ou menos/não".

**Origem das ideias:** banco de alimentos e código de barras (MyFitnessPal); precisão de micronutrientes (Cronometer); alvos que se recalibram sozinhos a partir do peso e do consumo real (MacroFactor); registro por foto/voz/WhatsApp (geração atual de apps com IA).

---

### M7 — Saúde

- **Consultas**: especialidade, profissional, local, data, motivo, perguntas a fazer, resumo do que foi dito, prescrição, retorno sugerido → agenda o próximo automaticamente.
- **Exames**: upload de PDF/foto, data, laboratório, tipo. Extração dos valores principais (hemograma, glicemia, colesterol, vitamina D, TSH etc.) para **gráfico de evolução por marcador ao longo dos anos**, com faixa de referência.
- **Lembretes de recorrência**: check-up anual, dentista a cada 6 meses, exames de rotina — o app avisa quando vence.
- **Medicamentos e suplementos**: nome, dose, horário, duração, estoque restante, alerta de recompra; o horário entra no checklist de Hoje.
- **Vacinas** com histórico e reforços.
- **Sinais e medidas**: pressão, frequência cardíaca de repouso, peso, glicemia — manuais ou via smartwatch/Apple Health/Google Fit.
- **Sono**: horário de dormir e acordar, duração, qualidade percebida, integração com wearable.
- **Sintomas e episódios**: registro rápido (dor de cabeça, gastrite, alergia) com intensidade — vira histórico útil pra levar ao médico.
- **Modo consulta**: gera um resumo em PDF com histórico recente, medicações em uso e últimos exames, pra levar impresso ou mostrar na tela.
- **Contatos de saúde** e plano/carteirinha guardados com bloqueio biométrico.

---

### M8 — Vícios e Controle de Impulsos

Módulo separado, protegido por biometria, com linguagem de apoio e não de punição.

- **Contador ao vivo**: dias, horas, minutos e segundos desde a data de início, por hábito (pode ter vários simultâneos: cigarro, álcool, açúcar, apostas, pornografia, redes sociais, unhas — ou personalizado).
- **Meus porquês**: lista de motivos com fotos, que aparece na tela de urgência.
- **Compromisso diário (pledge)**: de manhã você confirma o compromisso do dia; à noite faz a revisão. Gera uma sequência paralela ao contador.
- **Botão de urgência (SOS)**: aparece grande na tela do módulo. Ao tocar, abre um fluxo de 3 passos: respiração guiada (60s) → seus porquês → ação alternativa da sua lista pessoal (caminhar, banho, ligar pra alguém, treinar).
- **Registro de fissura**: horário, local, gatilho, intensidade, o que estava sentindo, cedeu ou não. Vira o dado mais valioso do módulo.
- **Mapa de gatilhos**: quais horários, dias, lugares e emoções mais disparam a vontade — cruzado com sono, humor, álcool e estresse.
- **Calculadora de economia**: dinheiro e tempo poupados até hoje, com projeção para 6 meses e 1 ano, e opção de mandar esse valor direto pra uma meta financeira ("virou a viagem").
- **Marcos**: 1 dia, 3, 7, 14, 30, 90, 180, 365 dias, com celebração e reflexão registrada.
- **Recaída sem apagar tudo**: registra a recaída, mantém o histórico anterior visível ("você já conseguiu 47 dias — isso não sumiu"), e pede o que a gente aprende dessa vez. Reinicia o contador atual, preserva o recorde.
- **Linha do tempo de recuperação**: o que costuma acontecer no corpo com o passar dos dias, por tipo de hábito.
- **Rede de apoio**: 1 a 3 contatos com botão de ligar/mandar mensagem direto, e opção de compartilhar o marco com eles.
- **Diário de sobriedade** com fotos e notas.

> Nota de projeto: esse módulo é ferramenta de acompanhamento, não de tratamento. Vale incluir na tela um espaço fixo para contato profissional ou grupo de apoio de sua escolha, sempre visível — e não depender só do app nos momentos difíceis.

**Origem das ideias:** contador em tempo real, compromisso diário + revisão noturna, cálculo de dinheiro e tempo economizados, análise de gatilhos, marcos e diário (I Am Sober); linha do tempo de abstinência e registro de fissura (apps de recuperação em geral).

---

### M9 — Finanças

**Registro**
- Lançamento por texto ou áudio em linguagem natural, com categorização automática por IA ("mercado 230 no débito" → despesa, Alimentação/Mercado, conta X).
- Foto de cupom/comprovante com leitura por OCR.
- Entrada manual completa: valor, data, categoria, subcategoria, conta, forma de pagamento, tags, anexo, observação.
- **Open Finance**: conexão com bancos e cartões para importação automática, com conciliação (o lançamento importado casa com o que você digitou, sem duplicar).
- Recorrentes: salário, aluguel, assinaturas, academia — com projeção automática nos meses seguintes.
- Parcelamentos: compra em 10x cria as 10 parcelas futuras e mostra o comprometimento dos próximos meses.

**Organização**
- Contas (corrente, poupança, carteira, investimentos) com saldo consolidado.
- **Cartões de crédito com lógica de fatura**: fechamento, vencimento, limite usado, fatura atual e futura separadas do mês de caixa.
- Categorias personalizáveis com ícone, cor e teto mensal.
- Orçamento por categoria (método de envelopes) + regra 50/30/20 opcional, com barra de consumo e alerta em 80% e 100%.
- Metas financeiras: reserva de emergência, viagem, equipamento — com valor alvo, prazo, aporte mensal necessário e progresso.
- Dívidas: saldo devedor, juros, plano de quitação (bola de neve ou avalanche) com data prevista de liberdade.
- Investimentos: aportes e patrimônio consolidado (mesmo que manual), evolução mensal.

**Inteligência**
- Painel "entra / sai / sobra" do mês, em destaque, na primeira dobra.
- Projeção de saldo até o fim do mês com base em recorrentes e média de gastos.
- Relatórios: por categoria, por forma de pagamento, comparativo mês a mês e ano a ano, maiores gastos, gastos por dia da semana.
- **Alertas de vazamento**: assinaturas esquecidas, categoria acima da média, gasto fora do padrão.
- Resumo semanal e mensal automático em linguagem simples, por notificação ou WhatsApp.
- Exportação CSV/Excel e PDF.
- Modo compartilhado (casal/família) com visão conjunta e lançamentos individuais.

**Origem das ideias:** lançamento conversacional por texto e áudio no WhatsApp, relatórios e recorte "quanto entra, quanto sai, quanto sobra", Open Finance e planos casal/família (Fink AI); orçamento por categoria, gráficos e metas mensais (Mobills); interface limpa e importação automática (Organizze); orçamento base-zero por envelope (YNAB); simplicidade de lançamento manual (Minhas Economias).

---

### M10 — Diário, Humor e Autoconhecimento

- Check-in de humor 1 a 5 com emoções nomeadas e fatores (sono, treino, trabalho, dinheiro, pessoas).
- Diário livre com prompts diários ("o que funcionou hoje?", "o que eu adiaria de novo?").
- Gratidão: 3 linhas por dia.
- Reflexão semanal guiada: vitórias, travas, aprendizado, foco da próxima semana.
- Correlações automáticas: humor × sono, humor × treino, humor × fissuras, humor × gastos por impulso.
- Linha do tempo da vida: marcos, fotos, conquistas, "um ano atrás você...".
- Áudio de meditação/respiração e sons ambiente para foco e sono.

---

### M11 — Assistente IA

- **Chat com contexto**: acessa seus dados e responde "quanto gastei com delivery esse mês?", "meu supino subiu quanto em 90 dias?", "quantos dias sem cigarro?", "como foi minha semana?".
- **Briefing da manhã** (notificação ou áudio): agenda do dia, treino previsto, 3 prioridades, saldo do mês, lembrete de água e remédio.
- **Fechamento da noite**: o que foi feito, o que ficou, humor, pledge, uma frase de reforço.
- **Revisão semanal automática**: relatório único que junta rotina, treino, dieta, dinheiro, saúde e vícios, com 3 observações e 1 sugestão de ajuste.
- **Interface por WhatsApp** (opcional, mas é o que mais sustenta o hábito): registrar gasto, água, treino e humor sem abrir o app.
- **Insights cruzados**, que é onde nenhum app do mercado entrega: "Nas semanas em que você dormiu menos de 6h, o volume de treino caiu 22% e o gasto com delivery dobrou."

---

### M12 — Gamificação e Motivação

- XP e nível por área da vida (Corpo, Mente, Dinheiro, Disciplina).
- Conquistas/medalhas por marcos reais (100 treinos, 30 dias de rotina completa, 6 meses sem vício, primeiro mês no orçamento).
- Sequência geral do app + sequências por módulo.
- "Fator de ontem": comparação com você mesmo, nunca com outras pessoas.
- Modo desafio: 30 dias com regra única e definida.
- Notificação de reforço em vez de cobrança: "você fez 4 de 5 treinos essa semana".

---

### M13 — Configurações, Privacidade e Dados

- Bloqueio biométrico global e por módulo (Saúde, Vícios, Finanças).
- Criptografia local dos módulos sensíveis; escolha entre nuvem ou só no aparelho.
- Backup e restauração manual + exportação total (CSV/JSON) — seus dados saem quando você quiser.
- Tema claro/escuro, cor de destaque, tamanho de fonte.
- Configuração de quais módulos ficam ativos (quem não quer dieta, desliga a aba).
- Central de notificações com horário de silêncio.
- Integrações: Apple Health / Google Fit / Health Connect, Google Calendar, wearable, Open Finance, WhatsApp.

---

## 5. Modelo de dados (tabelas principais)

```
user(id, nome, peso, altura, nascimento, preferencias)
habit(id, nome, ritual, periodo, frequencia, meta_qtd, cor, icone, ativo)
habit_log(id, habit_id, data, concluido, quantidade, nota)
goal(id, titulo, horizonte, area, metrica, valor_alvo, valor_atual, prazo, motivo, parent_id)
milestone(id, goal_id, titulo, data_alvo, concluido_em)
event(id, titulo, tipo, inicio, fim, local, participantes, recorrencia, notas)
task(id, titulo, prazo, prioridade, goal_id, event_id, concluida_em)
water_log(id, data_hora, volume_ml, tipo)
exercise(id, nome, musculo_primario, musculos_secundarios, equipamento, video_url, instrucoes)
routine(id, nome, tipo, dias_semana)
routine_exercise(id, routine_id, exercise_id, series_alvo, reps_alvo, rir_alvo, ordem, regra_progressao)
workout_session(id, routine_id, data, duracao, nota, sensacao)
set_log(id, session_id, exercise_id, serie, peso, reps, rir, is_pr)
body_measure(id, data, peso, gordura_pct, braco, peito, cintura, quadril, coxa, foto_url)
food(id, nome, kcal, prot, carb, gord, micros_json, codigo_barras)
meal_log(id, data_hora, refeicao, food_id, quantidade, foto_url)
health_appointment(id, especialidade, profissional, data, local, motivo, resumo, retorno_em)
health_exam(id, tipo, data, laboratorio, arquivo_url)
exam_marker(id, exam_id, marcador, valor, unidade, ref_min, ref_max)
medication(id, nome, dose, horarios, inicio, fim, estoque)
vital_log(id, data, tipo, valor)
sleep_log(id, data, dormiu_em, acordou_em, qualidade)
addiction(id, nome, data_inicio, custo_diario, tempo_diario, motivos_json)
addiction_pledge(id, addiction_id, data, cumprido, revisao)
craving_log(id, addiction_id, data_hora, gatilho, local, intensidade, emocao, cedeu)
relapse(id, addiction_id, data, aprendizado, recorde_anterior)
account(id, nome, tipo, saldo_inicial)
card(id, nome, limite, fechamento, vencimento, account_id)
category(id, nome, tipo, icone, cor, teto_mensal, parent_id)
transaction(id, data, valor, tipo, category_id, account_id, card_id, descricao, tags, anexo, recorrente_id, parcela_x_de_y)
budget(id, mes, category_id, valor_planejado)
financial_goal(id, titulo, valor_alvo, valor_atual, prazo)
mood_log(id, data, nota, emocoes, fatores, texto)
journal(id, data, tipo, conteudo, foto_url)
```

---

## 6. Roadmap de construção

Construir tudo de uma vez é o erro clássico. Ordem sugerida:

**Fase 1 — MVP (o esqueleto que já muda o dia)**
Tela Hoje + Rotina/Hábitos com checklist e streak + Água + Metas simples (3 horizontes) + Agenda básica.
*Critério de sucesso: você abrir o app todo dia por 3 semanas seguidas.*

**Fase 2 — Corpo**
Treino completo (biblioteca, log de séries, progressão de carga, PRs, gráficos) + medidas corporais. É o módulo mais complexo tecnicamente e o que dá mais retorno visível.

**Fase 3 — Dinheiro**
Lançamentos manuais + categorias + orçamento + cartões + relatórios. Open Finance só depois que o manual estiver redondo.

**Fase 4 — Saúde e Vícios**
Consultas, exames com gráfico de marcadores, medicamentos, contador e pledge, mapa de gatilhos.

**Fase 5 — Dieta e Diário**
Registro de refeição, macros, humor, reflexão semanal.

**Fase 6 — Inteligência**
Assistente IA, briefing, revisão semanal automática, insights cruzados, WhatsApp, gamificação.

---

## 7. Stack sugerida (para desenvolver com Claude Code)

| Camada | Opção recomendada | Por quê |
|---|---|---|
| App | **React Native + Expo** | Um código para Android e iOS, ótimo suporte de IA, fácil de testar no próprio celular |
| Banco local | **SQLite (expo-sqlite) ou WatermelonDB** | Offline-first de verdade |
| Sincronização/nuvem | **Supabase** (Postgres + auth + storage) | Plano gratuito generoso, SQL puro, cabe o modelo acima |
| Gráficos | Victory Native ou Recharts (web) | Progressão de carga, finanças, exames |
| IA | API da Anthropic | Interpretação de linguagem natural nos lançamentos e resumos |
| WhatsApp | WhatsApp Business API ou n8n + Evolution API | Registro conversacional |
| Alternativa sem código | Notion/Obsidian + automações, ou FlutterFlow | Para validar o fluxo antes de programar |

**Como conduzir com Claude Code, sem saber programar:**
1. Salve este documento na raiz do projeto como `ESPEC.md`.
2. Primeiro comando: "Leia ESPEC.md. Vamos construir só a Fase 1. Crie a estrutura do projeto Expo, o schema SQLite das tabelas de hábitos, água e metas, e a tela Hoje. Explique cada passo em linguagem simples e não avance para a Fase 2."
3. Trabalhe **um módulo por conversa**. Peça sempre: rodar, ver na tela, testar, corrigir — antes de acrescentar qualquer coisa.
4. Peça um `CHANGELOG.md` a cada módulo entregue, para não se perder.
5. Use Git desde o primeiro dia (Claude Code configura pra você) — é o que permite voltar quando algo quebrar.

---

## 8. Mapa: de onde veio cada função

| App de referência | O que foi absorvido |
|---|---|
| **Fink AI** | Lançamento financeiro por texto e áudio com IA, categorização automática, relatórios "entra/sai/sobra", Open Finance, resumo por WhatsApp, visão compartilhada |
| **Fabulous** | Rituais de manhã/tarde/noite, empilhamento de hábitos, trilhas temáticas de várias semanas, coaching diário em áudio, gratidão, respiração, tracker de humor |
| **I Am Sober** | Contador em tempo real, compromisso diário + revisão noturna, motivos com foto, cálculo de dinheiro e tempo economizados, marcos, análise de gatilhos, diário |
| **Me+** | Planner visual com ícones e cores, hábitos diários/semanais/mensais, lembretes, tracker de humor e progresso, widget de tela inicial |
| **MuscleWiki** | Mapa corporal interativo, biblioteca extensa de exercícios com vídeo, filtro por equipamento, log de treino, funcionamento offline |
| **LIFTOFF** | Programa em fases progressivas, ensino do movimento antes da carga, progressão explícita semana a semana, aquecimento e recuperação |
| **MacroFactor / Cronometer** | Alvos nutricionais que se recalibram sozinhos; profundidade de micronutrientes |
| **Mobills / Organizze / YNAB** | Orçamento por categoria e envelopes, faturas de cartão, metas financeiras, relatórios comparativos |
| **TickTick / Todoist / Notion** | Entrada por linguagem natural, Pomodoro, tags, visões múltiplas, estatísticas |
| **Habitica / Streaks** | Gamificação, XP por área, medalhas, sequências |

---

## 9. O diferencial

Todos os apps acima resolvem **uma** parte da vida e obrigam você a manter seis assinaturas e seis logins. Nenhum deles sabe que sua semana de treino caiu porque você dormiu mal, porque estava estressado com a fatura, porque teve uma recaída na quarta.

O valor real deste app não está em ter todas as funções — está em **cruzar os dados**. Essa é a única coisa que nenhum concorrente pode copiar, porque nenhum deles tem os seus dados inteiros.
