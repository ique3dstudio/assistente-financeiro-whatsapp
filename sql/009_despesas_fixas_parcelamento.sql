-- Bloco 6: despesas fixas recorrentes (projetadas 12 meses) e parcelamento automático do
-- saldo do pedido (venda em Nx).
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/008_categorias_responsavel.sql.
-- É seguro rodar mais de uma vez (idempotente).

-- ============ DESPESAS FIXAS (o "molde" — energia, internet, assinaturas...) ============
create table if not exists despesas_fixas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric not null check (valor > 0),
  categoria_id uuid references categorias_financeiras(id) on delete set null,
  conta_id uuid references contas_financeiras(id) on delete set null,
  -- dia do vencimento (capado em 28 pra nunca cair num dia que não existe em fevereiro)
  dia_vencimento integer not null default 5 check (dia_vencimento between 1 and 28),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_despesas_fixas_updated_at on despesas_fixas;
create trigger trg_despesas_fixas_updated_at
before update on despesas_fixas
for each row execute function set_updated_at();

alter table despesas_fixas enable row level security;
drop policy if exists "despesas_fixas_all" on despesas_fixas;
create policy "despesas_fixas_all" on despesas_fixas for all to authenticated using (true) with check (true);

-- ============ Movimentos: de onde vieram (despesa fixa) e qual parcela é ============
alter table movimentos add column if not exists despesa_fixa_id uuid references despesas_fixas(id) on delete set null;
alter table movimentos add column if not exists parcela_numero integer;
alter table movimentos add column if not exists parcela_total integer;

alter table movimentos drop constraint if exists movimentos_origem_check;
alter table movimentos add constraint movimentos_origem_check
  check (origem in ('manual', 'pedido_sinal', 'pedido_saldo', 'transferencia', 'ia_texto', 'ia_foto', 'ia_audio', 'despesa_fixa'));

-- O índice antigo só permitia 1 lançamento de "pedido_saldo" por pedido — com parcelamento
-- agora pode ter várias (uma por parcela), então troca pra (pedido_id, origem, parcela).
drop index if exists idx_movimentos_pedido_origem;
create unique index if not exists idx_movimentos_pedido_origem_parcela
  on movimentos(pedido_id, origem, coalesce(parcela_numero, 0))
  where pedido_id is not null and origem in ('pedido_sinal', 'pedido_saldo');

create index if not exists idx_movimentos_despesa_fixa on movimentos(despesa_fixa_id);

-- ============ Pedidos: em quantas vezes parcelar o saldo ============
alter table pedidos add column if not exists numero_parcelas integer not null default 1 check (numero_parcelas between 1 and 24);

-- ============ Realtime ============
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'despesas_fixas') then
    alter publication supabase_realtime add table despesas_fixas;
  end if;
end $$;
