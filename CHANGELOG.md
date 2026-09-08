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

## Documentação
- `ESPEC.md`: especificação funcional completa do Life OS (v1.0).
- `ROADMAP.md`: a especificação quebrada em etapas testáveis, com banco, código, aceite e passos manuais.
