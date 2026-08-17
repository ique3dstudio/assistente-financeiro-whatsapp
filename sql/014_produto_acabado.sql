-- Bloco 11: estoque de produto acabado (peças prontas — pronta-entrega/marketplace).
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/013_estoque_baixa_job.sql.
-- É seguro rodar mais de uma vez (idempotente).
--
-- Isso é DIFERENTE do estoque de insumos (matéria-prima que entra: filamento, resina...).
-- Aqui é o produto ACABADO — a peça já pronta esperando pra ser vendida. As duas coisas
-- ficam propositalmente separadas na tela (aba Estoque tem os dois modos, bem divididos)
-- pra não confundir "quanto filamento tenho" com "quantas peças prontas tenho".

alter table produtos add column if not exists quantidade_estoque numeric not null default 0;
alter table produtos add column if not exists estoque_minimo numeric not null default 0;

-- Ledger — nunca sobrescreve saldo, cada linha é um evento.
create table if not exists movimentos_produto (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete restrict,
  tipo text not null check (tipo in ('producao', 'venda', 'ajuste', 'perda')),
  quantidade numeric not null,
  motivo text,
  pedido_id uuid references pedidos(id) on delete set null,
  data_movimento date not null default current_date,
  created_at timestamptz not null default now()
);

alter table movimentos_produto enable row level security;
drop policy if exists "movimentos_produto_all" on movimentos_produto;
create policy "movimentos_produto_all" on movimentos_produto for all to authenticated using (true) with check (true);

create index if not exists idx_movimentos_produto_produto on movimentos_produto(produto_id);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'movimentos_produto') then
    alter publication supabase_realtime add table movimentos_produto;
  end if;
end $$;
