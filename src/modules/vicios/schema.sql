-- Módulo Vícios e Controle de Impulsos (E4.5 a E4.7)
--
-- Nota de projeto: este módulo é ferramenta de acompanhamento, não de
-- tratamento. A tabela vicios_apoio existe para que a tela sempre tenha, à
-- vista, um contato humano — e não só o app.

create table if not exists vicios (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  -- usado para escolher a linha do tempo de recuperação certa
  tipo text not null default 'outro'
    check (tipo in ('cigarro', 'alcool', 'acucar', 'apostas', 'pornografia', 'redes_sociais', 'unhas', 'outro')),
  data_inicio timestamptz not null default now(),
  custo_diario numeric(10,2) not null default 0,
  tempo_diario_min integer not null default 0,
  -- [{"texto":"...","foto_url":null}]
  motivos jsonb not null default '[]',
  recorde_dias integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists vicios_user_idx on vicios (user_id, ativo);
alter table vicios enable row level security;

-- Compromisso do dia (de manhã) e revisão (de noite).
create table if not exists vicios_pledges (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  vicio_id uuid not null references vicios (id) on delete cascade,
  data date not null,
  cumprido boolean,
  revisao text,
  criado_em timestamptz not null default now(),
  unique (vicio_id, data)
);
create index if not exists pledges_idx on vicios_pledges (user_id, data);
alter table vicios_pledges enable row level security;

create table if not exists vicios_marcos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  vicio_id uuid not null references vicios (id) on delete cascade,
  dias integer not null,
  alcancado_em date not null default current_date,
  reflexao text,
  criado_em timestamptz not null default now(),
  unique (vicio_id, dias, alcancado_em)
);
alter table vicios_marcos enable row level security;

-- O dado mais valioso do módulo: onde, quando e com que sentimento a vontade
-- aparece — cedeu ou não.
create table if not exists vicios_fissuras (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  vicio_id uuid references vicios (id) on delete cascade,
  data date not null default current_date,
  hora time not null default localtime,
  gatilho text,
  local text,
  intensidade integer not null default 5 check (intensidade between 1 and 10),
  emocao text,
  cedeu boolean not null default false,
  nota text,
  criado_em timestamptz not null default now()
);
create index if not exists fissuras_idx on vicios_fissuras (user_id, data);
alter table vicios_fissuras enable row level security;

-- Recaída não apaga o passado: guarda o recorde anterior e o aprendizado.
create table if not exists vicios_recaidas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  vicio_id uuid not null references vicios (id) on delete cascade,
  data date not null default current_date,
  aprendizado text,
  recorde_anterior_dias integer not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists recaidas_idx on vicios_recaidas (user_id, vicio_id);
alter table vicios_recaidas enable row level security;

create table if not exists vicios_apoio (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  telefone text,
  tipo text not null default 'pessoa' check (tipo in ('pessoa', 'profissional', 'grupo')),
  observacao text,
  criado_em timestamptz not null default now()
);
alter table vicios_apoio enable row level security;

-- Sua lista pessoal de "o que fazer em vez disso".
create table if not exists vicios_acoes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  texto text not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  -- Sem esta restrição, rodar o SQL de novo duplicaria a lista inteira:
  -- "on conflict do nothing" precisa de uma unicidade para ter o que detectar.
  unique (user_id, texto)
);
create unique index if not exists vicios_acoes_unicas on vicios_acoes (user_id, texto);
alter table vicios_acoes enable row level security;

insert into vicios_acoes (user_id, texto, ordem) values
('eu','Beber um copo de água devagar',1),
('eu','Caminhar 10 minutos, mesmo dentro de casa',2),
('eu','Tomar um banho',3),
('eu','Mandar mensagem para alguém da minha rede de apoio',4),
('eu','Fazer 20 respirações lentas',5),
('eu','Sair do lugar onde estou agora',6)
on conflict (user_id, texto) do nothing;
