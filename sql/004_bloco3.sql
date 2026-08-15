-- Bloco 3: estoque de filamento, máquinas, falhas/refugo, pós-processamento e
-- link público de acompanhamento do pedido.
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/003_bloco2.sql.
-- É seguro rodar mais de uma vez (idempotente).

-- ============ Estoque por material ============
alter table materiais add column if not exists saldo_gramas numeric not null default 0;
alter table materiais add column if not exists estoque_minimo_gramas numeric not null default 200;

-- ============ Itens: baixa de estoque, falha/refugo e novo status de pós-processamento ============
alter table itens_pedido add column if not exists estoque_baixado boolean not null default false;
alter table itens_pedido add column if not exists falhou boolean not null default false;

alter table itens_pedido drop constraint if exists itens_pedido_status_check;
alter table itens_pedido add constraint itens_pedido_status_check
  check (status in ('recebido', 'fila', 'produzindo', 'pos_processamento', 'pronto', 'entregue'));

-- ============ MÁQUINAS ============
create table if not exists maquinas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  modelo text,
  valor numeric,
  data_compra date,
  status text not null default 'ativa' check (status in ('ativa', 'manutencao', 'inativa')),
  created_at timestamptz not null default now()
);

alter table maquinas enable row level security;
drop policy if exists "maquinas_all" on maquinas;
create policy "maquinas_all" on maquinas for all to authenticated using (true) with check (true);

-- ============ FALHAS (registro de refugo, com custo perdido) ============
create table if not exists falhas (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references itens_pedido(id) on delete cascade,
  motivo text not null,
  custo_perdido numeric,
  created_at timestamptz not null default now()
);

alter table falhas enable row level security;
drop policy if exists "falhas_all" on falhas;
create policy "falhas_all" on falhas for all to authenticated using (true) with check (true);

-- ============ Link público de acompanhamento ============
alter table pedidos add column if not exists token_publico uuid not null default gen_random_uuid();

do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_pedidos_token_publico') then
    create unique index idx_pedidos_token_publico on pedidos(token_publico);
  end if;
end $$;

-- Função pública (roda com privilégios do dono, ignora RLS de propósito) que devolve só o
-- necessário pra tela de acompanhamento do cliente — nunca valor, pagamento, contato ou
-- observações. Só funciona se o visitante souber o token (link único, imprevisível).
create or replace function acompanhar_pedido(p_token uuid)
returns table (
  cliente_nome text,
  prioridade text,
  prazo_entrega date,
  itens jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.nome,
    p.prioridade,
    p.prazo_entrega,
    coalesce(
      jsonb_agg(
        jsonb_build_object('descricao', i.descricao, 'quantidade', i.quantidade, 'status', i.status)
        order by i.created_at
      ) filter (where i.id is not null and i.falhou = false),
      '[]'::jsonb
    ) as itens
  from pedidos p
  join clientes c on c.id = p.cliente_id
  left join itens_pedido i on i.pedido_id = p.id
  where p.token_publico = p_token
  group by c.nome, p.prioridade, p.prazo_entrega;
$$;

grant execute on function acompanhar_pedido(uuid) to anon;

-- ============ Realtime ============
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'maquinas') then
    alter publication supabase_realtime add table maquinas;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'falhas') then
    alter publication supabase_realtime add table falhas;
  end if;
end $$;
