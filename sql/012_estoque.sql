-- Bloco 9: núcleo do módulo de Estoque (insumos, rolos rastreáveis, ledger de movimentação).
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/011_mei_provisao.sql.
-- É seguro rodar mais de uma vez (idempotente).
--
-- Aditivo: não mexe na tabela "materiais" que a calculadora/produção já usa. É um modelo novo,
-- em paralelo — a baixa automática do job só passa a usar isso numa etapa futura, avisada
-- separadamente antes de trocar o que já está em produção.
--
-- Arquitetura: o ROLO é a unidade central (não "PLA preto" genérico com saldo agregado).
-- "insumos" é o catálogo (o que é); "rolos" são as instâncias físicas rastreáveis de um insumo
-- (principalmente filamento — cada rolo comprado vira uma linha, com peso próprio); e
-- "movimentos_estoque" é o ledger — todo entra/sai é uma linha nova, nunca um saldo sobrescrito.

-- ============ INSUMOS (catálogo: filamento, resina, consumível de pós-processo, embalagem, peça de reposição) ============
create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  nome text not null,
  categoria text not null check (categoria in ('filamento', 'resina', 'consumivel_pos_processo', 'embalagem', 'peca_reposicao')),
  unidade_medida text not null check (unidade_medida in ('g', 'ml', 'l', 'unidade')),
  -- Atributos específicos de filamento — ficam nulos para as outras categorias.
  marca text,
  linha text,
  material text,
  cor text,
  diametro_mm numeric,
  densidade numeric,
  peso_rolo_vazio_g numeric,
  estoque_minimo numeric not null default 0,
  custo_medio_ponderado numeric not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table insumos enable row level security;
drop policy if exists "insumos_all" on insumos;
create policy "insumos_all" on insumos for all to authenticated using (true) with check (true);

-- ============ ROLOS (instância física rastreável de um insumo — peso próprio, não saldo agregado) ============
create table if not exists rolos (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references insumos(id) on delete restrict,
  id_curto text unique not null,
  peso_inicial_g numeric not null,
  peso_atual_g numeric not null,
  custo_total numeric not null default 0,
  local_armazenagem text,
  status text not null default 'ativo' check (status in ('ativo', 'quase_vazio', 'vazio', 'descartado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_rolos_updated_at on rolos;
create trigger trg_rolos_updated_at
before update on rolos
for each row execute function set_updated_at();

alter table rolos enable row level security;
drop policy if exists "rolos_all" on rolos;
create policy "rolos_all" on rolos for all to authenticated using (true) with check (true);

create index if not exists idx_rolos_insumo on rolos(insumo_id);

-- ============ MOVIMENTOS_ESTOQUE (ledger — nunca sobrescreve saldo, cada linha é um evento) ============
create table if not exists movimentos_estoque (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references insumos(id) on delete restrict,
  rolo_id uuid references rolos(id) on delete set null,
  tipo text not null check (tipo in ('entrada_compra', 'saida_job', 'saida_manual', 'ajuste')),
  quantidade numeric not null,
  custo_unitario numeric,
  motivo text,
  pedido_id uuid references pedidos(id) on delete set null,
  data_movimento date not null default current_date,
  created_at timestamptz not null default now()
);

alter table movimentos_estoque enable row level security;
drop policy if exists "movimentos_estoque_all" on movimentos_estoque;
create policy "movimentos_estoque_all" on movimentos_estoque for all to authenticated using (true) with check (true);

create index if not exists idx_movimentos_estoque_insumo on movimentos_estoque(insumo_id);
create index if not exists idx_movimentos_estoque_rolo on movimentos_estoque(rolo_id);

-- ============ Realtime ============
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'insumos') then
    alter publication supabase_realtime add table insumos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'rolos') then
    alter publication supabase_realtime add table rolos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'movimentos_estoque') then
    alter publication supabase_realtime add table movimentos_estoque;
  end if;
end $$;
