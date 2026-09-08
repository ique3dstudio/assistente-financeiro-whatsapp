-- Módulo Rotina e Hábitos (E1.1 e E1.2)

create table if not exists habitos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  emoji text not null default '✅',
  cor text not null default '#3ba9f4',
  periodo text not null default 'qualquer' check (periodo in ('manha', 'tarde', 'noite', 'qualquer')),
  horario time,
  duracao_min integer,
  -- {"tipo":"diaria"} | {"tipo":"dias_semana","dias":[1,3,5]}
  -- {"tipo":"vezes_semana","vezes":3} | {"tipo":"cada_n_dias","n":2}
  frequencia jsonb not null default '{"tipo":"diaria"}',
  meta_qtd numeric(10,2),
  unidade text,
  nao_negociavel boolean not null default false,
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists habitos_user_idx on habitos (user_id, ativo);
alter table habitos enable row level security;

create table if not exists habitos_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  habito_id uuid not null references habitos (id) on delete cascade,
  data date not null,
  concluido boolean not null default true,
  quantidade numeric(10,2),
  nota text,
  criado_em timestamptz not null default now(),
  unique (habito_id, data)
);
create index if not exists habitos_log_user_data_idx on habitos_log (user_id, data);
alter table habitos_log enable row level security;

-- Dia de folga: falta programada que não quebra a sequência (até 2 por mês).
create table if not exists habitos_folgas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  habito_id uuid references habitos (id) on delete cascade,
  data date not null,
  criado_em timestamptz not null default now(),
  unique (user_id, habito_id, data)
);
alter table habitos_folgas enable row level security;

-- Rotina guiada e Pomodoro (E1.10): guarda o tempo que você de fato passou
-- em cada hábito ou bloco de foco.
create table if not exists foco_sessoes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  tipo text not null default 'pomodoro' check (tipo in ('pomodoro', 'ritual', 'habito')),
  habito_id uuid references habitos (id) on delete set null,
  periodo text,
  data date not null,
  minutos integer not null default 0,
  concluido boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists foco_sessoes_user_data_idx on foco_sessoes (user_id, data);
alter table foco_sessoes enable row level security;
