-- Bloco 10: liga o job de produção ao rolo físico, pra baixa automática ao concluir.
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/012_estoque.sql.
-- É seguro rodar mais de uma vez (idempotente).
--
-- rolo_id é opcional: itens sem rolo escolhido continuam funcionando exatamente como
-- antes (baixa só no "materiais" antigo, se material_id estiver preenchido). Quem quiser
-- já usar o rastreio por rolo escolhe o rolo no item do pedido; a baixa do rolo acontece
-- na mesma hora em que o item cruza pra pós-processamento (job concluído), junto com a
-- baixa antiga — sem exigir nenhuma tela nova nem digitação repetida.
alter table itens_pedido add column if not exists rolo_id uuid references rolos(id) on delete set null;

create index if not exists idx_itens_pedido_rolo on itens_pedido(rolo_id);
