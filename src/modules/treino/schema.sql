-- Módulo Treino e Progressão de Carga (Fase 2)

-- Biblioteca de exercícios. Os que vêm com o app têm user_id = 'sistema' e um
-- slug fixo, para o seed poder rodar de novo sem duplicar. Os seus, criados no
-- app, ficam com o seu user_id e slug nulo.
create table if not exists exercicios (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  slug text unique,
  nome text not null,
  musculo_primario text not null,
  musculos_secundarios text[] not null default '{}',
  equipamento text not null default 'barra',
  tipo text not null default 'composto' check (tipo in ('composto', 'isolado')),
  nivel text not null default 'iniciante' check (nivel in ('iniciante', 'intermediario', 'avancado')),
  instrucoes text,
  erros_comuns text,
  video_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists exercicios_musculo_idx on exercicios (musculo_primario);
alter table exercicios enable row level security;

-- Uma rotina é um treino nomeado (Treino A, Push, Full body) com dia da semana.
create table if not exists treino_rotinas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  tipo text not null default 'livre'
    check (tipo in ('a_b', 'abc', 'ppl', 'full_body', 'upper_lower', 'livre')),
  -- 0 = domingo. {2,4,6} = terça, quinta, sábado
  dias_semana integer[] not null default '{}',
  observacao text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists treino_rotinas_user_idx on treino_rotinas (user_id, ativo);
alter table treino_rotinas enable row level security;

-- Os exercícios de uma rotina, com alvo de séries/reps/RIR e a REGRA DE
-- PROGRESSÃO que o app usa para sugerir a carga de hoje.
create table if not exists treino_rotina_exercicios (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  rotina_id uuid not null references treino_rotinas (id) on delete cascade,
  exercicio_id uuid not null references exercicios (id) on delete cascade,
  series_alvo integer not null default 3,
  reps_min integer not null default 8,
  reps_max integer not null default 12,
  rir_alvo numeric(3,1) not null default 2,
  descanso_seg integer not null default 90,
  regra_progressao text not null default 'dupla'
    check (regra_progressao in ('linear', 'dupla', 'rir', 'percentual_1rm', 'nenhuma')),
  incremento_kg numeric(5,2) not null default 2.5,
  percentual_1rm numeric(4,1),
  -- Exercícios com o mesmo grupo viram supersérie (ex: 'A1' e 'A1')
  agrupamento text,
  ordem integer not null default 0,
  notas text,
  criado_em timestamptz not null default now(),
  unique (rotina_id, exercicio_id, ordem)
);
create index if not exists treino_rotina_ex_idx on treino_rotina_exercicios (rotina_id, ordem);
alter table treino_rotina_exercicios enable row level security;

create table if not exists treino_sessoes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  rotina_id uuid references treino_rotinas (id) on delete set null,
  data date not null,
  duracao_min integer,
  sensacao integer check (sensacao between 1 and 5),
  nota text,
  concluida_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists treino_sessoes_user_data_idx on treino_sessoes (user_id, data);
alter table treino_sessoes enable row level security;

-- Cada série registrada. É a tabela mais importante do módulo: dela saem a
-- progressão, os PRs, o volume e todos os gráficos.
create table if not exists treino_series (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  sessao_id uuid not null references treino_sessoes (id) on delete cascade,
  exercicio_id uuid not null references exercicios (id) on delete cascade,
  serie integer not null default 1,
  peso numeric(6,2) not null default 0,
  reps integer not null default 0,
  rir numeric(3,1),
  tipo text not null default 'normal'
    check (tipo in ('normal', 'aquecimento', 'dropset', 'rest_pause', 'falha')),
  is_pr boolean not null default false,
  nota text,
  criado_em timestamptz not null default now()
);
create index if not exists treino_series_ex_idx on treino_series (user_id, exercicio_id, criado_em);
create index if not exists treino_series_sessao_idx on treino_series (sessao_id);
alter table treino_series enable row level security;

create table if not exists medidas_corporais (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  data date not null,
  peso_kg numeric(5,2),
  gordura_pct numeric(4,1),
  braco_cm numeric(4,1),
  peito_cm numeric(4,1),
  cintura_cm numeric(4,1),
  quadril_cm numeric(4,1),
  coxa_cm numeric(4,1),
  panturrilha_cm numeric(4,1),
  foto_url text,
  nota text,
  criado_em timestamptz not null default now(),
  unique (user_id, data)
);
create index if not exists medidas_user_data_idx on medidas_corporais (user_id, data);
alter table medidas_corporais enable row level security;
