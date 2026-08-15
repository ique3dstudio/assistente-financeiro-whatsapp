-- Bloco 1: fundação (clientes, pedido x item de produção, anexos, prioridade).
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/pedidos_3d.sql.
-- É seguro rodar mais de uma vez (idempotente) e não apaga a tabela antiga pedidos_3d.

-- ============ CLIENTES ============
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato text,
  observacoes text,
  created_at timestamptz not null default now()
);

alter table clientes enable row level security;
drop policy if exists "clientes_all" on clientes;
create policy "clientes_all" on clientes for all to authenticated using (true) with check (true);

-- ============ PEDIDOS (o pedido do cliente, pode ter vários itens) ============
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  prioridade text not null default 'normal' check (prioridade in ('baixa', 'normal', 'urgente')),
  prazo_entrega date,
  origem text,
  pagamento text not null default 'pendente' check (pagamento in ('pendente', 'parcial', 'pago')),
  valor_sinal numeric,
  observacoes text,
  criado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_pedidos_updated_at on pedidos;
create trigger trg_pedidos_updated_at
before update on pedidos
for each row execute function set_updated_at();

alter table pedidos enable row level security;
drop policy if exists "pedidos_all" on pedidos;
create policy "pedidos_all" on pedidos for all to authenticated using (true) with check (true);

-- ============ ITENS DO PEDIDO (= ordens de produção, o que aparece no quadro) ============
create table if not exists itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  descricao text not null,
  modelo_link text,
  cor text,
  material text,
  quantidade integer not null default 1,
  tempo_estimado_horas numeric,
  valor numeric,
  status text not null default 'recebido' check (status in ('recebido', 'fila', 'produzindo', 'pronto', 'entregue')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_itens_pedido_updated_at on itens_pedido;
create trigger trg_itens_pedido_updated_at
before update on itens_pedido
for each row execute function set_updated_at();

alter table itens_pedido enable row level security;
drop policy if exists "itens_pedido_all" on itens_pedido;
create policy "itens_pedido_all" on itens_pedido for all to authenticated using (true) with check (true);

-- ============ ANEXOS (fotos, STL, prints de conversa) ============
create table if not exists anexos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  nome_arquivo text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table anexos enable row level security;
drop policy if exists "anexos_all" on anexos;
create policy "anexos_all" on anexos for all to authenticated using (true) with check (true);

-- ============ Realtime ============
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'clientes') then
    alter publication supabase_realtime add table clientes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'pedidos') then
    alter publication supabase_realtime add table pedidos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'itens_pedido') then
    alter publication supabase_realtime add table itens_pedido;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'anexos') then
    alter publication supabase_realtime add table anexos;
  end if;
end $$;

-- ============ Bucket de armazenamento pros anexos ============
insert into storage.buckets (id, name, public)
values ('loja3d-anexos', 'loja3d-anexos', false)
on conflict (id) do nothing;

drop policy if exists "loja3d_anexos_select" on storage.objects;
create policy "loja3d_anexos_select" on storage.objects
  for select to authenticated using (bucket_id = 'loja3d-anexos');

drop policy if exists "loja3d_anexos_insert" on storage.objects;
create policy "loja3d_anexos_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'loja3d-anexos');

drop policy if exists "loja3d_anexos_delete" on storage.objects;
create policy "loja3d_anexos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'loja3d-anexos');

-- ============ Migração dos dados que já existem em pedidos_3d ============
-- Só roda se "pedidos" ainda estiver vazia (evita duplicar se você rodar o script de novo).
do $$
begin
  if not exists (select 1 from pedidos) and exists (select 1 from pedidos_3d) then

    insert into clientes (nome, contato)
    select distinct on (cliente_nome) cliente_nome, cliente_contato
    from pedidos_3d
    order by cliente_nome, created_at;

    insert into pedidos (id, cliente_id, prazo_entrega, pagamento, observacoes, criado_por, prioridade, origem, created_at, updated_at)
    select p.id, c.id, p.prazo_entrega, p.pagamento, p.observacoes, p.criado_por, 'normal', 'legado', p.created_at, p.updated_at
    from pedidos_3d p
    join clientes c on c.nome = p.cliente_nome;

    insert into itens_pedido (id, pedido_id, descricao, modelo_link, cor, material, quantidade, tempo_estimado_horas, valor, status, created_at, updated_at)
    select gen_random_uuid(), p.id, p.descricao, p.modelo_link, p.cor, p.material, p.quantidade, p.tempo_estimado_horas, p.valor, p.status, p.created_at, p.updated_at
    from pedidos_3d p;

  end if;
end $$;

-- A tabela pedidos_3d antiga NÃO é apagada por segurança. Depois de confirmar que está tudo
-- migrado certinho no app, você pode apagá-la rodando: drop table pedidos_3d;
