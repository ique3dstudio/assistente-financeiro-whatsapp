-- Bloco 8: Teto MEI + provisionamento fiscal.
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/010_pix.sql.
-- É seguro rodar mais de uma vez (idempotente).

-- teto_mei_anual: limite de faturamento bruto anual do MEI (R$ 81.000,00 é o valor vigente
-- em 2026 — deixado configurável porque a lei já mudou esse valor antes e pode mudar de novo).
-- percentual_provisao_fiscal: % da receita que a loja quer reservar por conta própria (DAS,
-- eventual desenquadramento, etc.) — só um indicador, não gera lançamento automático.
alter table configuracoes add column if not exists teto_mei_anual numeric not null default 81000;
alter table configuracoes add column if not exists percentual_provisao_fiscal numeric not null default 6;
