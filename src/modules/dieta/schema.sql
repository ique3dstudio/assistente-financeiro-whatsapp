-- Módulo Dieta e Alimentação (Fase 5)

-- Banco de alimentos. Os que vêm com o app têm user_id = 'sistema' e um slug
-- fixo (para o seed poder rodar de novo sem duplicar); os seus, criados no
-- app ou lidos por código de barras, ficam com o seu user_id.
create table if not exists alimentos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  slug text unique,
  nome text not null,
  marca text,
  codigo_barras text,
  porcao_padrao_g numeric(8,2) not null default 100,
  kcal numeric(8,2) not null default 0,
  proteina_g numeric(8,2) not null default 0,
  carbo_g numeric(8,2) not null default 0,
  gordura_g numeric(8,2) not null default 0,
  fibra_g numeric(8,2),
  sodio_mg numeric(8,2),
  criado_em timestamptz not null default now()
);
create index if not exists alimentos_nome_idx on alimentos using gin (to_tsvector('portuguese', nome));
create unique index if not exists alimentos_codigo_idx on alimentos (codigo_barras) where codigo_barras is not null;
alter table alimentos enable row level security;

create table if not exists alimentos_favoritos (
  user_id text not null default 'eu',
  alimento_id uuid not null references alimentos (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (user_id, alimento_id)
);
alter table alimentos_favoritos enable row level security;

-- Refeição salva ("café da manhã padrão"): um conjunto de itens que você
-- registra inteiro, em 1 toque. Os itens ficam em jsonb porque cada um pode
-- ser um alimento do banco OU um texto livre ("2 ovos mexidos").
create table if not exists refeicoes_salvas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  refeicao_padrao text not null default 'cafe'
    check (refeicao_padrao in ('cafe', 'almoco', 'lanche', 'jantar', 'ceia', 'outro')),
  itens jsonb not null default '[]',
  kcal numeric(8,2) not null default 0,
  proteina_g numeric(8,2) not null default 0,
  carbo_g numeric(8,2) not null default 0,
  gordura_g numeric(8,2) not null default 0,
  criado_em timestamptz not null default now()
);
alter table refeicoes_salvas enable row level security;

-- Cada refeição registrada. Os macros ficam gravados na própria linha (não
-- recalculados do alimento na hora de ler): se você editar um alimento depois,
-- o histórico não muda sozinho.
create table if not exists refeicoes_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  data date not null default current_date,
  hora time not null default localtime,
  refeicao text not null default 'outro'
    check (refeicao in ('cafe', 'almoco', 'lanche', 'jantar', 'ceia', 'outro')),
  tipo_registro text not null default 'alimento'
    check (tipo_registro in ('alimento', 'texto', 'foto', 'salva')),
  alimento_id uuid references alimentos (id) on delete set null,
  quantidade_g numeric(8,2),
  descricao text,
  foto_url text,
  kcal numeric(8,2) not null default 0,
  proteina_g numeric(8,2) not null default 0,
  carbo_g numeric(8,2) not null default 0,
  gordura_g numeric(8,2) not null default 0,
  fibra_g numeric(8,2),
  sodio_mg numeric(8,2),
  -- E5.6: como você se sentiu depois — cruza com humor e treino
  sensacao_energia integer check (sensacao_energia between 1 and 5),
  sensacao_inchaco integer check (sensacao_inchaco between 1 and 5),
  sensacao_sono integer check (sensacao_sono between 1 and 5),
  criado_em timestamptz not null default now()
);
create index if not exists refeicoes_log_user_data_idx on refeicoes_log (user_id, data);
alter table refeicoes_log enable row level security;

-- Check-in do modo simples: um por dia. "comi bem hoje: sim / mais ou menos / não"
create table if not exists dieta_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  data date not null default current_date,
  avaliacao text not null check (avaliacao in ('bem', 'mais_ou_menos', 'mal')),
  nota text,
  criado_em timestamptz not null default now(),
  unique (user_id, data)
);
alter table dieta_checkins enable row level security;

-- Histórico de alvos: cada ajuste (manual ou automático) cria uma linha nova,
-- então dá para ver a evolução do alvo ao longo do tempo, não só o atual.
create table if not exists dieta_alvos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  kcal_treino numeric(8,2) not null,
  kcal_descanso numeric(8,2) not null,
  proteina_g numeric(8,2) not null,
  carbo_g numeric(8,2) not null,
  gordura_g numeric(8,2) not null,
  origem text not null default 'manual' check (origem in ('manual', 'ajuste_automatico')),
  ativo_em date not null default current_date,
  criado_em timestamptz not null default now()
);
create index if not exists dieta_alvos_user_idx on dieta_alvos (user_id, ativo_em desc);
alter table dieta_alvos enable row level security;

-- Cada proposta de ajuste semanal (E5.3), aceita ou não.
create table if not exists dieta_ajustes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  semana_inicio date not null,
  kcal_anterior numeric(8,2) not null,
  kcal_sugerido numeric(8,2) not null,
  variacao_peso_kg numeric(6,3),
  consumo_medio_kcal numeric(8,2),
  justificativa text,
  aplicado boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (user_id, semana_inicio)
);
alter table dieta_ajustes enable row level security;

-- Planejador semanal: o que você pretende comer em cada refeição do dia.
create table if not exists dieta_plano (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  data date not null,
  refeicao text not null default 'almoco'
    check (refeicao in ('cafe', 'almoco', 'lanche', 'jantar', 'ceia', 'outro')),
  alimento_id uuid references alimentos (id) on delete set null,
  descricao text,
  quantidade_g numeric(8,2),
  criado_em timestamptz not null default now()
);
create index if not exists dieta_plano_user_data_idx on dieta_plano (user_id, data);
alter table dieta_plano enable row level security;

create table if not exists lista_compras (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  item text not null,
  secao text not null default 'outros',
  quantidade text,
  comprado boolean not null default false,
  origem_plano boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists lista_compras_user_idx on lista_compras (user_id, comprado);
alter table lista_compras enable row level security;
