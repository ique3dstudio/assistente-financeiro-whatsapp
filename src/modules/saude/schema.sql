-- Módulo Saúde (E4.1 a E4.4)

create table if not exists medicamentos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  dose text,
  -- horários do dia em que você toma: {'08:00','20:00'}
  horarios time[] not null default '{}',
  frequencia text not null default 'diaria'
    check (frequencia in ('diaria', 'dias_semana', 'se_necessario')),
  dias_semana integer[] not null default '{}',
  inicio date not null default current_date,
  fim date,
  estoque_atual numeric(10,2),
  estoque_alerta numeric(10,2) default 7,
  unidade text default 'comprimido',
  observacao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists medicamentos_user_idx on medicamentos (user_id, ativo);
alter table medicamentos enable row level security;

create table if not exists medicamentos_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  medicamento_id uuid not null references medicamentos (id) on delete cascade,
  data date not null,
  horario time not null,
  tomado boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (medicamento_id, data, horario)
);
create index if not exists medicamentos_log_idx on medicamentos_log (user_id, data);
alter table medicamentos_log enable row level security;

create table if not exists saude_consultas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  especialidade text not null,
  profissional text,
  local text,
  data date not null,
  hora time,
  motivo text,
  -- o que você quer perguntar (escrito antes) e o que foi dito (escrito depois)
  perguntas text,
  resumo text,
  prescricao text,
  retorno_em date,
  criado_em timestamptz not null default now()
);
create index if not exists consultas_user_data_idx on saude_consultas (user_id, data);
alter table saude_consultas enable row level security;

-- Rotinas que vencem: dentista a cada 6 meses, check-up anual.
create table if not exists saude_recorrencias (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  tipo text not null default 'consulta' check (tipo in ('consulta', 'exame', 'vacina')),
  cada_meses integer not null default 6,
  ultima_em date,
  criado_em timestamptz not null default now()
);
alter table saude_recorrencias enable row level security;

create table if not exists saude_exames (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  tipo text not null,
  data date not null,
  laboratorio text,
  arquivo_url text,
  observacao text,
  criado_em timestamptz not null default now()
);
create index if not exists exames_user_data_idx on saude_exames (user_id, data);
alter table saude_exames enable row level security;

-- Cada valor de exame vira uma linha: é o que permite o gráfico de evolução
-- de um marcador ao longo dos anos, com a faixa de referência ao fundo.
create table if not exists saude_marcadores (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  exame_id uuid references saude_exames (id) on delete cascade,
  data date not null,
  marcador text not null,
  valor numeric(12,3) not null,
  unidade text,
  ref_min numeric(12,3),
  ref_max numeric(12,3),
  criado_em timestamptz not null default now()
);
create index if not exists marcadores_idx on saude_marcadores (user_id, marcador, data);
alter table saude_marcadores enable row level security;

create table if not exists sinais_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  data date not null,
  hora time,
  tipo text not null
    check (tipo in ('pressao', 'fc_repouso', 'peso', 'glicemia', 'saturacao', 'temperatura')),
  valor numeric(10,2) not null,
  valor2 numeric(10,2),                -- diastólica, no caso da pressão
  nota text,
  criado_em timestamptz not null default now()
);
create index if not exists sinais_idx on sinais_log (user_id, tipo, data);
alter table sinais_log enable row level security;

create table if not exists sono_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  data date not null,                  -- dia em que você ACORDOU
  dormiu_em time,
  acordou_em time,
  duracao_min integer,
  qualidade integer check (qualidade between 1 and 5),
  nota text,
  criado_em timestamptz not null default now(),
  unique (user_id, data)
);
create index if not exists sono_idx on sono_log (user_id, data);
alter table sono_log enable row level security;

create table if not exists sintomas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  data date not null,
  hora time,
  nome text not null,
  intensidade integer not null default 5 check (intensidade between 1 and 10),
  nota text,
  criado_em timestamptz not null default now()
);
create index if not exists sintomas_idx on sintomas (user_id, data);
alter table sintomas enable row level security;

create table if not exists vacinas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  data date,
  dose text,
  proxima_em date,
  local text,
  criado_em timestamptz not null default now()
);
alter table vacinas enable row level security;

create table if not exists saude_contatos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  especialidade text,
  telefone text,
  observacao text,
  criado_em timestamptz not null default now()
);
alter table saude_contatos enable row level security;
