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

## Documentação
- `ESPEC.md`: especificação funcional completa do Life OS (v1.0).
- `ROADMAP.md`: a especificação quebrada em etapas testáveis, com banco, código, aceite e passos manuais.
