-- Life OS — banco completo (núcleo + todos os módulos já construídos).
--
-- COMO USAR: cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- Pode rodar quantas vezes quiser: tudo é "create if not exists" / "add column if
-- not exists", então nada é apagado, duplicado ou sobrescrito.
--
-- Gerado por scripts/gerar-sql.js — não edite à mão; edite o schema.sql do módulo.

-- ====== NÚCLEO ======

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
  -- Guardamos os DESLIGADOS, não os ligados: assim um módulo novo já nasce ativo
  -- sem precisar mexer no seu perfil.
  modulos_inativos text[] not null default '{}',
  atualizado_em timestamptz not null default now()
);
alter table perfil add column if not exists modulos_inativos text[] not null default '{}';
alter table perfil enable row level security;

-- ====== MÓDULO: ROTINA E HÁBITOS ======

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

-- ====== MÓDULO: ÁGUA ======

create table if not exists agua_registros (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  data date not null,
  quantidade_ml integer not null,
  -- 'agua', 'cha', 'cafe', 'refrigerante', 'alcool' — cada um hidrata diferente
  bebida text not null default 'agua',
  fator numeric(3,2) not null default 1.0,
  criado_em timestamptz not null default now()
);
create index if not exists agua_registros_user_data_idx on agua_registros (user_id, data);
alter table agua_registros add column if not exists bebida text not null default 'agua';
alter table agua_registros add column if not exists fator numeric(3,2) not null default 1.0;
alter table agua_registros enable row level security;

-- Seus recipientes de verdade (a garrafa que você usa, a caneca do café).
create table if not exists agua_recipientes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  volume_ml integer not null,
  bebida text not null default 'agua',
  emoji text not null default '🥤',
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists agua_recipientes_user_idx on agua_recipientes (user_id, ordem);
alter table agua_recipientes enable row level security;

-- ====== MÓDULO: METAS ======

create table if not exists metas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  titulo text not null,
  horizonte text not null default 'curto' check (horizonte in ('curto', 'medio', 'longo')),
  area text not null default 'saude'
    check (area in ('saude', 'carreira', 'financeiro', 'relacionamentos', 'aprendizado', 'espiritual')),
  -- Como o progresso é medido
  metrica text,                -- nome legível: "kg no supino", "R$ guardados"
  unidade text,
  valor_inicial numeric(14,2) not null default 0,
  valor_alvo numeric(14,2),
  valor_atual numeric(14,2) not null default 0,
  -- Vínculo automático: id de uma métrica publicada por um módulo
  -- (ex: 'agua.sequencia', 'financas.sobra_mes'). Preenchido = não se atualiza à mão.
  metrica_id text,
  prazo date,
  motivo text,
  foto_url text,
  parent_id uuid references metas (id) on delete set null,
  concluida_em date,
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);
create index if not exists metas_user_idx on metas (user_id, horizonte);
alter table metas enable row level security;

create table if not exists metas_marcos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  meta_id uuid not null references metas (id) on delete cascade,
  titulo text not null,
  data_alvo date,
  concluido_em date,
  reflexao text,
  foto_url text,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists metas_marcos_meta_idx on metas_marcos (meta_id, ordem);
alter table metas_marcos enable row level security;

-- Liga uma meta aos hábitos e tarefas que a empurram. Meta sem vínculo há 14
-- dias é sinalizada como órfã.
create table if not exists metas_vinculos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  meta_id uuid not null references metas (id) on delete cascade,
  tipo text not null check (tipo in ('habito', 'tarefa', 'evento')),
  referencia_id uuid not null,
  criado_em timestamptz not null default now(),
  unique (meta_id, tipo, referencia_id)
);
alter table metas_vinculos enable row level security;

-- ====== MÓDULO: AGENDA E TAREFAS ======

create table if not exists agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  titulo text not null,
  tipo text not null default 'pessoal'
    check (tipo in ('reuniao', 'consulta', 'treino', 'pessoal', 'viagem', 'financeiro')),
  data date not null,
  hora time,
  duracao_min integer not null default 60,
  dia_inteiro boolean not null default false,
  local text,
  participantes text,
  pauta text,
  notas text,
  -- {"tipo":"nenhuma"} | {"tipo":"diaria"} | {"tipo":"semanal","dias":[2,4]}
  -- {"tipo":"mensal","dia":10} | {"tipo":"cada_n_dias","n":15}   (+ "ate":"2027-01-01")
  recorrencia jsonb not null default '{"tipo":"nenhuma"}',
  -- minutos antes do evento: {1440, 30} = 1 dia antes e 30 min antes
  lembretes integer[] not null default '{}',
  meta_id uuid references metas (id) on delete set null,
  concluido_em date,
  criado_em timestamptz not null default now()
);
create index if not exists agenda_eventos_user_data_idx on agenda_eventos (user_id, data);
alter table agenda_eventos enable row level security;

create table if not exists tarefas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  titulo text not null,
  nota text,
  prazo date,
  hora time,
  prioridade integer not null default 2 check (prioridade between 1 and 3),
  periodo text not null default 'qualquer' check (periodo in ('manha', 'tarde', 'noite', 'qualquer')),
  meta_id uuid references metas (id) on delete set null,
  evento_id uuid references agenda_eventos (id) on delete set null,
  concluida_em date,
  criado_em timestamptz not null default now()
);
create index if not exists tarefas_user_prazo_idx on tarefas (user_id, prazo);
alter table tarefas enable row level security;

-- ====== MÓDULO: DIÁRIO E HUMOR ======

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

-- ====== MÓDULO: FINANÇAS ======

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
