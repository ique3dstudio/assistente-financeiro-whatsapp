-- Life OS — banco completo até a etapa E1.2.
-- Cole ESTE arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- Pode rodar mais de uma vez sem problema: nada é apagado nem duplicado.

-- ===== NÚCLEO =====
-- Configurações que o app muda sozinho (metas, preferências de módulo, etc.)
create table if not exists configuracoes (
  user_id text not null default 'eu',
  chave text not null,
  valor text not null,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, chave)
);
alter table configuracoes enable row level security;

-- Seus dados pessoais: usados para calcular meta de água, calorias e idade.
create table if not exists perfil (
  user_id text primary key default 'eu',
  nome text,
  peso_kg numeric(5,2),
  altura_cm integer,
  nascimento date,
  modulos_ativos text[] not null default array['agua','habitos','financas'],
  atualizado_em timestamptz not null default now()
);
alter table perfil enable row level security;

-- ===== MÓDULO: ROTINA E HÁBITOS =====

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

-- ===== MÓDULO: ÁGUA =====

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

-- ===== MÓDULO: FINANÇAS =====

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
