-- Módulo Finanças — cole isto no SQL Editor do Supabase e clique em Run.
-- Serve tanto para criar a tabela do zero quanto para atualizar a que já existia
-- na versão anterior (que só tinha "telefone").

create table if not exists transacoes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  telefone text,
  data date not null default current_date,
  valor numeric(12, 2) not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  categoria text not null,
  descricao text,
  criado_em timestamptz not null default now()
);

alter table transacoes add column if not exists user_id text not null default 'eu';
alter table transacoes add column if not exists data date not null default current_date;
alter table transacoes alter column telefone drop not null;

create index if not exists transacoes_user_data_idx on transacoes (user_id, data);

alter table transacoes enable row level security;
