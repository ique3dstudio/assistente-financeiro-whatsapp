-- Módulo Diário, Humor e Fechamento do dia (E1.9)

create table if not exists humor_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  data date not null,
  nota integer not null check (nota between 1 and 5),
  emocoes text[] not null default '{}',
  fatores text[] not null default '{}',
  texto text,
  criado_em timestamptz not null default now(),
  unique (user_id, data)
);
create index if not exists humor_log_user_data_idx on humor_log (user_id, data);
alter table humor_log enable row level security;

create table if not exists diario (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  data date not null,
  tipo text not null default 'nota' check (tipo in ('nota', 'gratidao', 'travou', 'fechamento', 'reflexao')),
  conteudo text not null,
  foto_url text,
  criado_em timestamptz not null default now()
);
create index if not exists diario_user_data_idx on diario (user_id, data);
alter table diario enable row level security;
