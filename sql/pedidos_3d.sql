-- Tabela de pedidos da loja de impressão 3D.
-- Rode este script no SQL Editor do Supabase (mesmo projeto usado pelo assistente financeiro).

create extension if not exists pgcrypto;

create table if not exists pedidos_3d (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  cliente_contato text,
  descricao text not null,
  modelo_link text,
  cor text,
  material text,
  quantidade integer not null default 1,
  tempo_estimado_horas numeric,
  prazo_entrega date,
  valor numeric,
  pagamento text not null default 'pendente' check (pagamento in ('pendente', 'parcial', 'pago')),
  status text not null default 'recebido' check (status in ('recebido', 'fila', 'produzindo', 'pronto', 'entregue')),
  observacoes text,
  criado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pedidos_3d_updated_at on pedidos_3d;
create trigger trg_pedidos_3d_updated_at
before update on pedidos_3d
for each row execute function set_updated_at();

-- RLS: só usuários autenticados (as duas contas que vocês criarem no Supabase Auth) acessam os pedidos.
-- Não há tela de cadastro no app — as contas são criadas manualmente por vocês no painel do Supabase
-- (Authentication > Users > Add user), então não existe risco de estranho se autenticar e ver os dados.
alter table pedidos_3d enable row level security;

drop policy if exists "pedidos_3d_select" on pedidos_3d;
create policy "pedidos_3d_select" on pedidos_3d
  for select to authenticated using (true);

drop policy if exists "pedidos_3d_insert" on pedidos_3d;
create policy "pedidos_3d_insert" on pedidos_3d
  for insert to authenticated with check (true);

drop policy if exists "pedidos_3d_update" on pedidos_3d;
create policy "pedidos_3d_update" on pedidos_3d
  for update to authenticated using (true) with check (true);

drop policy if exists "pedidos_3d_delete" on pedidos_3d;
create policy "pedidos_3d_delete" on pedidos_3d
  for delete to authenticated using (true);

-- Habilita o realtime (as duas telas se atualizam sozinhas quando uma mexe em um pedido).
-- Só adiciona se ainda não estiver na publicação (evita erro "already member of publication" ao rodar de novo).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'pedidos_3d'
  ) then
    alter publication supabase_realtime add table pedidos_3d;
  end if;
end $$;
