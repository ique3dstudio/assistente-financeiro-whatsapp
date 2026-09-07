-- Módulo Água — cole isto no SQL Editor do Supabase e clique em Run.

create table if not exists agua_registros (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  data date not null,
  quantidade_ml integer not null,
  criado_em timestamptz not null default now()
);

create index if not exists agua_registros_user_data_idx on agua_registros (user_id, data);

-- RLS ligado e sem políticas: ninguém acessa pelo navegador,
-- só o servidor (que usa a service_role key). É o que queremos aqui.
alter table agua_registros enable row level security;
