-- Módulo Água e Hidratação (E1.5)

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
