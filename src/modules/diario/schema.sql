-- Módulo Diário, Humor e Fechamento do dia (E1.9, ampliado na E5.5)

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
  tipo text not null default 'nota' check (tipo in ('nota', 'gratidao', 'travou', 'fechamento', 'reflexao', 'marco')),
  conteudo text not null,
  foto_url text,
  criado_em timestamptz not null default now()
);
create index if not exists diario_user_data_idx on diario (user_id, data);
alter table diario enable row level security;

-- 'marco' foi acrescentado na E5.5 (linha do tempo da vida): alarga a
-- restrição de quem já tinha a tabela criada antes dessa etapa.
alter table diario drop constraint if exists diario_tipo_check;
alter table diario add constraint diario_tipo_check
  check (tipo in ('nota', 'gratidao', 'travou', 'fechamento', 'reflexao', 'marco'));

-- Reflexão semanal guiada (E5.5): uma por semana, para não virar tarefa
-- acumulada — a semana passada em branco fica em branco, não pendente.
create table if not exists revisoes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  semana_inicio date not null,
  vitorias text,
  travas text,
  aprendizado text,
  foco_semana text,
  criado_em timestamptz not null default now(),
  unique (user_id, semana_inicio)
);
create index if not exists revisoes_user_idx on revisoes (user_id, semana_inicio desc);
alter table revisoes enable row level security;
