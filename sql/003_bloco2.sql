-- Bloco 2: precificação, materiais, catálogo de produtos e custo/lucro por item.
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/002_bloco1.sql.
-- É seguro rodar mais de uma vez (idempotente).

-- ============ CONFIGURAÇÕES (uma linha só: dados da loja + premissas de custo) ============
create table if not exists configuracoes (
  id integer primary key default 1 check (id = 1),
  nome_loja text not null default 'Minha Loja 3D',
  valor_kwh numeric not null default 0.95,
  potencia_media_watts numeric not null default 150,
  valor_maquina numeric not null default 3000,
  vida_util_horas numeric not null default 8000,
  valor_hora_mao_obra numeric not null default 25,
  taxa_risco_percentual numeric not null default 10,
  margem_padrao_percentual numeric not null default 100,
  updated_at timestamptz not null default now()
);

insert into configuracoes (id) values (1) on conflict (id) do nothing;

drop trigger if exists trg_configuracoes_updated_at on configuracoes;
create trigger trg_configuracoes_updated_at
before update on configuracoes
for each row execute function set_updated_at();

alter table configuracoes enable row level security;
drop policy if exists "configuracoes_all" on configuracoes;
create policy "configuracoes_all" on configuracoes for all to authenticated using (true) with check (true);

-- ============ MATERIAIS (catálogo de filamentos/resinas, usado na calculadora de custo) ============
create table if not exists materiais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text,
  preco_rolo numeric not null,
  peso_rolo_gramas numeric not null default 1000,
  created_at timestamptz not null default now()
);

alter table materiais enable row level security;
drop policy if exists "materiais_all" on materiais;
create policy "materiais_all" on materiais for all to authenticated using (true) with check (true);

-- ============ PRODUTOS (catálogo de itens prontos, com preço já calculado) ============
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  cor text,
  material_id uuid references materiais(id) on delete set null,
  peso_gramas numeric,
  tempo_estimado_horas numeric,
  mao_obra_horas numeric,
  preco_venda numeric,
  created_at timestamptz not null default now()
);

alter table produtos enable row level security;
drop policy if exists "produtos_all" on produtos;
create policy "produtos_all" on produtos for all to authenticated using (true) with check (true);

-- ============ Campos novos em itens_pedido, pra calculadora de custo ============
alter table itens_pedido add column if not exists peso_gramas numeric;
alter table itens_pedido add column if not exists material_id uuid references materiais(id) on delete set null;
alter table itens_pedido add column if not exists mao_obra_horas numeric;
alter table itens_pedido add column if not exists custo_calculado numeric;

-- ============ Realtime ============
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'configuracoes') then
    alter publication supabase_realtime add table configuracoes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'materiais') then
    alter publication supabase_realtime add table materiais;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'produtos') then
    alter publication supabase_realtime add table produtos;
  end if;
end $$;
