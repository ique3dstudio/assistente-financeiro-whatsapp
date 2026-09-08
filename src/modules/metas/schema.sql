-- Módulo Metas (E1.6 e E1.7)

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
