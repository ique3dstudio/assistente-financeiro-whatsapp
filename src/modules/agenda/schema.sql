-- Módulo Agenda e Tarefas (E1.8)
--
-- Nota de projeto: o evento guarda DATA + HORA separadas (não um timestamp),
-- porque o servidor roda em UTC e o app vive no fuso de Brasília. Assim
-- "consulta quinta 15h" continua sendo 15h, independente de onde o servidor está.

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
