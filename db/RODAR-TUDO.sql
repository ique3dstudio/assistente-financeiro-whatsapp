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

-- Offline-first (E0.5): quando o celular está sem rede, o registro fica numa
-- fila no aparelho e é reenviado depois. Cada registro carrega um id de origem;
-- esta tabela guarda o que já foi processado, para o reenvio não duplicar nada.
create table if not exists sync_idempotencia (
  user_id text not null default 'eu',
  origem_id text not null,
  caminho text,
  resposta jsonb,
  criado_em timestamptz not null default now(),
  primary key (user_id, origem_id)
);
alter table sync_idempotencia enable row level security;

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

-- Rotina guiada e Pomodoro (E1.10): guarda o tempo que você de fato passou
-- em cada hábito ou bloco de foco.
create table if not exists foco_sessoes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  tipo text not null default 'pomodoro' check (tipo in ('pomodoro', 'ritual', 'habito')),
  habito_id uuid references habitos (id) on delete set null,
  periodo text,
  data date not null,
  minutos integer not null default 0,
  concluido boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists foco_sessoes_user_data_idx on foco_sessoes (user_id, data);
alter table foco_sessoes enable row level security;

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

-- ====== MÓDULO: TREINO ======

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

-- ====== MÓDULO: TREINO — BIBLIOTECA DE EXERCÍCIOS ======

insert into exercicios (user_id, slug, nome, musculo_primario, musculos_secundarios, equipamento, tipo, nivel, instrucoes, erros_comuns) values
-- PEITO
('sistema','supino-reto-barra','Supino reto com barra','peito','{triceps,ombro_anterior}','barra','composto','iniciante','Desça a barra até o meio do peito com os cotovelos a cerca de 45° e empurre sem travar os ombros.','Descer a barra na altura do pescoço e soltar o quadril do banco.'),
('sistema','supino-inclinado-barra','Supino inclinado com barra','peito','{ombro_anterior,triceps}','barra','composto','iniciante','Banco a 30-45°; desça até a parte alta do peito.','Inclinar demais o banco, virando um desenvolvimento de ombro.'),
('sistema','supino-reto-halteres','Supino reto com halteres','peito','{triceps,ombro_anterior}','halter','composto','iniciante','Halteres na linha do peito, descida controlada até sentir alongar.','Bater os halteres no topo e perder a tensão.'),
('sistema','supino-inclinado-halteres','Supino inclinado com halteres','peito','{ombro_anterior,triceps}','halter','composto','iniciante','Banco a 30°; punhos alinhados com os cotovelos.','Arquear a lombar para empurrar mais peso.'),
('sistema','crucifixo-halteres','Crucifixo com halteres','peito','{ombro_anterior}','halter','isolado','iniciante','Cotovelos levemente flexionados e fixos; abra até o peito alongar.','Transformar em supino, dobrando e estendendo o cotovelo.'),
('sistema','crossover-cabo','Crossover na polia','peito','{ombro_anterior}','cabo','isolado','iniciante','Tronco levemente à frente, junte as mãos na linha do umbigo.','Usar carga alta e puxar com o corpo.'),
('sistema','voador-maquina','Voador (peck deck)','peito','{ombro_anterior}','maquina','isolado','iniciante','Costas apoiadas, movimento só de ombro, sem empurrar com os braços.','Abrir demais e forçar a cápsula do ombro.'),
('sistema','flexao-de-braco','Flexão de braço','peito','{triceps,abdomen,ombro_anterior}','peso_corporal','composto','iniciante','Corpo em prancha, desça até o peito quase tocar o chão.','Quadril caído ou cotovelos abertos a 90°.'),
('sistema','paralelas-peito','Paralelas (dips) para peito','peito','{triceps,ombro_anterior}','peso_corporal','composto','intermediario','Tronco inclinado à frente e desça até sentir o peito alongar.','Descer além da amplitude confortável do ombro.'),
('sistema','supino-maquina','Supino na máquina','peito','{triceps,ombro_anterior}','maquina','composto','iniciante','Ajuste o banco para as manoplas ficarem na linha do peito.','Assento alto demais, jogando a carga para o ombro.'),
-- COSTAS
('sistema','barra-fixa-pronada','Barra fixa pronada','dorsal','{biceps,trapezio,antebraco}','peso_corporal','composto','intermediario','Pegada pronada, puxe levando o peito para a barra e desça controlado.','Balançar o corpo e não estender os braços embaixo.'),
('sistema','barra-fixa-supinada','Barra fixa supinada','dorsal','{biceps,antebraco}','peso_corporal','composto','intermediario','Pegada supinada na largura dos ombros; cotovelos rentes ao corpo.','Encurtar a amplitude e puxar só metade.'),
('sistema','puxada-frente-polia','Puxada frente na polia','dorsal','{biceps,trapezio}','cabo','composto','iniciante','Puxe a barra até a clavícula, peito aberto, sem deitar o tronco.','Puxar atrás da nuca ou usar impulso de tronco.'),
('sistema','remada-curvada-barra','Remada curvada com barra','dorsal','{trapezio,lombar,biceps}','barra','composto','intermediario','Tronco a ~45°, coluna neutra, puxe a barra ao umbigo.','Arredondar a lombar e subir o tronco a cada repetição.'),
('sistema','remada-cavalinho','Remada cavalinho','dorsal','{trapezio,biceps}','barra','composto','iniciante','Peito apoiado ou tronco firme; puxe os cotovelos para trás.','Encolher os ombros em vez de puxar com as costas.'),
('sistema','remada-unilateral-halter','Remada unilateral com halter','dorsal','{trapezio,biceps}','halter','composto','iniciante','Apoie uma mão no banco, coluna neutra, puxe o halter à cintura.','Girar o tronco para levantar mais carga.'),
('sistema','remada-baixa-polia','Remada baixa na polia','dorsal','{biceps,trapezio}','cabo','composto','iniciante','Tronco fixo, puxe até o abdômen e controle a volta.','Balançar o tronco para frente e para trás.'),
('sistema','remada-maquina','Remada na máquina','dorsal','{biceps,trapezio}','maquina','composto','iniciante','Peito apoiado; puxe as manoplas até a linha das costelas.','Soltar o peito do apoio no fim da série.'),
('sistema','pullover-polia','Pullover na polia alta','dorsal','{peito,triceps}','cabo','isolado','intermediario','Braços quase estendidos, puxe a barra até as coxas só com o dorsal.','Dobrar o cotovelo e virar uma tríceps testa.'),
('sistema','levantamento-terra','Levantamento terra','isquiotibiais','{gluteos,lombar,dorsal,trapezio}','barra','composto','avancado','Barra rente à canela, coluna neutra, empurre o chão e estenda quadril e joelho juntos.','Arredondar a lombar e puxar com os braços.'),
('sistema','terra-romeno','Terra romeno','isquiotibiais','{gluteos,lombar}','barra','composto','intermediario','Joelhos levemente flexionados, empurre o quadril para trás sentindo o posterior.','Agachar em vez de flexionar o quadril.'),
('sistema','encolhimento-halteres','Encolhimento com halteres','trapezio','{ombro_posterior}','halter','isolado','iniciante','Suba os ombros para as orelhas e desça controlado.','Girar os ombros em círculo.'),
('sistema','face-pull','Face pull na polia','ombro_posterior','{trapezio}','cabo','isolado','iniciante','Puxe a corda até a altura do rosto, abrindo os cotovelos.','Usar carga alta e puxar com o tronco.'),
-- OMBROS
('sistema','desenvolvimento-militar-barra','Desenvolvimento militar com barra','ombro_lateral','{ombro_anterior,triceps,abdomen}','barra','composto','intermediario','Em pé, abdômen firme, empurre a barra acima da cabeça sem arquear a lombar.','Usar impulso de perna sem querer (isso é outro exercício).'),
('sistema','desenvolvimento-halteres','Desenvolvimento com halteres','ombro_lateral','{ombro_anterior,triceps}','halter','composto','iniciante','Cotovelos levemente à frente, empurre até quase estender.','Bater os halteres no alto e perder a tensão.'),
('sistema','desenvolvimento-arnold','Desenvolvimento Arnold','ombro_anterior','{ombro_lateral,triceps}','halter','composto','intermediario','Comece com as palmas para você e gire enquanto empurra.','Girar rápido demais e perder o controle.'),
('sistema','elevacao-lateral-halteres','Elevação lateral','ombro_lateral','{trapezio}','halter','isolado','iniciante','Suba até a linha dos ombros liderando com os cotovelos.','Balançar o corpo e subir acima do ombro com trapézio.'),
('sistema','elevacao-lateral-cabo','Elevação lateral na polia','ombro_lateral','{trapezio}','cabo','isolado','iniciante','Polia baixa cruzando na frente do corpo; suba até a linha do ombro.','Dobrar demais o cotovelo, encurtando o braço de alavanca.'),
('sistema','elevacao-frontal-halteres','Elevação frontal','ombro_anterior','{peito}','halter','isolado','iniciante','Suba o halter à frente até a altura dos olhos.','Usar a lombar para jogar o peso para cima.'),
('sistema','crucifixo-inverso-halteres','Crucifixo inverso','ombro_posterior','{trapezio}','halter','isolado','iniciante','Tronco inclinado, abra os braços na linha dos ombros.','Puxar com o dorsal em vez do ombro posterior.'),
('sistema','crucifixo-inverso-maquina','Crucifixo inverso na máquina','ombro_posterior','{trapezio}','maquina','isolado','iniciante','Peito apoiado, abra até a linha dos ombros e controle a volta.','Encolher o ombro durante o movimento.'),
-- BÍCEPS
('sistema','rosca-direta-barra','Rosca direta com barra','biceps','{antebraco}','barra','isolado','iniciante','Cotovelos fixos ao lado do corpo; suba sem balançar.','Jogar o tronco para trás para vencer a última repetição.'),
('sistema','rosca-alternada-halteres','Rosca alternada','biceps','{antebraco}','halter','isolado','iniciante','Alterne os braços, girando o punho para fora ao subir.','Encolher o ombro para ajudar.'),
('sistema','rosca-martelo','Rosca martelo','biceps','{antebraco}','halter','isolado','iniciante','Pegada neutra (polegar para cima) do início ao fim.','Balançar os halteres usando o quadril.'),
('sistema','rosca-scott','Rosca Scott','biceps','{antebraco}','barra','isolado','intermediario','Braços apoiados no banco inclinado; desça até quase estender.','Não descer o suficiente, perdendo a parte mais difícil.'),
('sistema','rosca-concentrada','Rosca concentrada','biceps','{antebraco}','halter','isolado','iniciante','Cotovelo apoiado na coxa, suba concentrando no bíceps.','Usar o ombro para levantar.'),
('sistema','rosca-polia-baixa','Rosca na polia baixa','biceps','{antebraco}','cabo','isolado','iniciante','Tensão contínua; controle a descida em 2 segundos.','Deixar o peso cair na volta.'),
-- TRÍCEPS
('sistema','triceps-testa-barra','Tríceps testa','triceps','{}','barra','isolado','intermediario','Cotovelos apontando para o teto; desça a barra até a testa.','Abrir os cotovelos e virar um supino fechado.'),
('sistema','triceps-polia-corda','Tríceps na polia com corda','triceps','{}','cabo','isolado','iniciante','Cotovelos junto ao corpo; abra a corda no fim do movimento.','Inclinar o tronco e empurrar com o peso do corpo.'),
('sistema','triceps-frances-halter','Tríceps francês','triceps','{}','halter','isolado','iniciante','Halter atrás da cabeça, cotovelos apontados para cima.','Abrir os cotovelos para os lados.'),
('sistema','triceps-coice-halter','Tríceps coice','triceps','{}','halter','isolado','iniciante','Braço paralelo ao chão; estenda só o antebraço.','Balançar o braço inteiro.'),
('sistema','mergulho-banco','Mergulho no banco','triceps','{peito,ombro_anterior}','peso_corporal','composto','iniciante','Mãos no banco atrás do corpo; desça até 90° no cotovelo.','Descer demais e sobrecarregar o ombro.'),
('sistema','supino-fechado-barra','Supino fechado','triceps','{peito,ombro_anterior}','barra','composto','intermediario','Pegada na largura dos ombros, cotovelos rentes ao tronco.','Pegada estreita demais, forçando o punho.'),
-- PERNAS: QUADRÍCEPS
('sistema','agachamento-livre-barra','Agachamento livre','quadriceps','{gluteos,isquiotibiais,lombar,abdomen}','barra','composto','avancado','Pés na largura dos ombros, desça até a coxa passar da paralela mantendo o peito aberto.','Joelho caindo para dentro e lombar arredondando no fundo.'),
('sistema','agachamento-frontal','Agachamento frontal','quadriceps','{gluteos,abdomen}','barra','composto','avancado','Barra apoiada nos ombros à frente, cotovelos altos, tronco vertical.','Deixar os cotovelos caírem e perder a barra.'),
('sistema','agachamento-hack','Agachamento hack','quadriceps','{gluteos}','maquina','composto','iniciante','Costas apoiadas, desça controlado até a paralela.','Descolar o quadril do apoio no fundo.'),
('sistema','leg-press','Leg press','quadriceps','{gluteos,isquiotibiais}','maquina','composto','iniciante','Pés na largura do quadril; desça até 90° sem soltar o lombar do apoio.','Descer demais, arredondando a lombar.'),
('sistema','cadeira-extensora','Cadeira extensora','quadriceps','{}','maquina','isolado','iniciante','Estenda até quase travar e segure meio segundo no topo.','Jogar a carga com impulso do tronco.'),
('sistema','afundo-halteres','Afundo com halteres','quadriceps','{gluteos,isquiotibiais}','halter','composto','iniciante','Passo à frente, desça o joelho de trás até perto do chão.','Joelho da frente passando muito da ponta do pé.'),
('sistema','passada-halteres','Passada (walking lunge)','quadriceps','{gluteos,isquiotibiais}','halter','composto','intermediario','Caminhe alternando as pernas, tronco ereto.','Passos curtos que jogam tudo no joelho.'),
('sistema','bulgaro-halteres','Agachamento búlgaro','quadriceps','{gluteos,isquiotibiais}','halter','composto','intermediario','Pé de trás no banco; desça na vertical sobre a perna da frente.','Apoiar o peso na perna de trás.'),
('sistema','agachamento-sumo','Agachamento sumô','adutores','{quadriceps,gluteos}','barra','composto','intermediario','Pés bem afastados e pontas para fora; desça entre as pernas.','Joelhos colapsando para dentro.'),
('sistema','agachamento-peso-corporal','Agachamento livre sem peso','quadriceps','{gluteos}','peso_corporal','composto','iniciante','Desça como se fosse sentar numa cadeira, peso no meio do pé.','Levantar os calcanhares do chão.'),
-- PERNAS: POSTERIOR E GLÚTEO
('sistema','mesa-flexora','Mesa flexora','isquiotibiais','{panturrilha}','maquina','isolado','iniciante','Quadril apoiado; flexione levando o calcanhar ao glúteo.','Levantar o quadril do apoio para puxar mais.'),
('sistema','cadeira-flexora','Cadeira flexora','isquiotibiais','{panturrilha}','maquina','isolado','iniciante','Costas apoiadas; flexione o joelho controlando a volta.','Amplitude curta e carga alta.'),
('sistema','stiff-halteres','Stiff com halteres','isquiotibiais','{gluteos,lombar}','halter','composto','intermediario','Pernas quase retas, desça os halteres rente às pernas com quadril para trás.','Curvar a coluna em vez de flexionar o quadril.'),
('sistema','elevacao-pelvica-barra','Elevação pélvica (hip thrust)','gluteos','{isquiotibiais}','barra','composto','intermediario','Costas no banco, suba o quadril até alinhar tronco e coxa e aperte o glúteo.','Hiperextender a lombar no topo.'),
('sistema','cadeira-abdutora','Cadeira abdutora','abdutores','{gluteos}','maquina','isolado','iniciante','Abra as pernas contra a resistência e volte devagar.','Jogar o tronco para trás para abrir mais.'),
('sistema','cadeira-adutora','Cadeira adutora','adutores','{}','maquina','isolado','iniciante','Feche as pernas de forma controlada, sem bater as placas.','Amplitude excessiva no alongamento.'),
('sistema','coice-gluteo-cabo','Coice de glúteo na polia','gluteos','{isquiotibiais}','cabo','isolado','iniciante','Empurre o pé para trás estendendo o quadril, tronco firme.','Arquear a lombar para ganhar amplitude.'),
-- PANTURRILHA
('sistema','panturrilha-em-pe','Panturrilha em pé','panturrilha','{}','maquina','isolado','iniciante','Suba na ponta dos pés até o limite e desça alongando.','Fazer repetições curtas e rápidas.'),
('sistema','panturrilha-sentado','Panturrilha sentado','panturrilha','{}','maquina','isolado','iniciante','Joelhos flexionados a 90°; amplitude completa.','Usar impulso para subir.'),
('sistema','panturrilha-halteres','Panturrilha com halteres','panturrilha','{}','halter','isolado','iniciante','Em pé, halteres nas mãos, suba na ponta dos pés um pé por vez ou os dois.','Perder o equilíbrio e encurtar o movimento.'),
-- ABDÔMEN E LOMBAR
('sistema','prancha-abdominal','Prancha','abdomen','{lombar,ombro_anterior}','peso_corporal','isolado','iniciante','Corpo alinhado, glúteo e abdômen contraídos; conte o tempo.','Quadril alto ou lombar afundada.'),
('sistema','abdominal-supra','Abdominal supra','abdomen','{}','peso_corporal','isolado','iniciante','Suba enrolando a coluna, sem puxar a cabeça com as mãos.','Puxar o pescoço e usar impulso.'),
('sistema','elevacao-pernas-suspenso','Elevação de pernas suspenso','abdomen','{antebraco}','peso_corporal','isolado','intermediario','Pendurado na barra, suba as pernas sem balançar.','Usar balanço em vez do abdômen.'),
('sistema','abdominal-canivete','Abdominal canivete','abdomen','{quadriceps}','peso_corporal','isolado','intermediario','Suba tronco e pernas ao mesmo tempo, tocando as mãos nos pés.','Prender a respiração e forçar o pescoço.'),
('sistema','prancha-lateral','Prancha lateral','abdomen','{lombar}','peso_corporal','isolado','iniciante','Apoio no antebraço, quadril alto e alinhado; conte o tempo.','Deixar o quadril cair para o chão.'),
('sistema','rodinha-abdominal','Rodinha abdominal','abdomen','{lombar,ombro_anterior}','peso_corporal','isolado','avancado','Role para frente mantendo a lombar neutra; volte com o abdômen.','Arquear a lombar ao estender.'),
('sistema','abdominal-polia-alta','Abdominal na polia alta','abdomen','{}','cabo','isolado','iniciante','De joelhos, enrole a coluna trazendo os cotovelos aos joelhos.','Flexionar o quadril em vez da coluna.'),
('sistema','hiperextensao-banco-romano','Hiperextensão no banco romano','lombar','{gluteos,isquiotibiais}','peso_corporal','isolado','iniciante','Desça flexionando o quadril e volte até alinhar o tronco.','Passar da linha do corpo, hiperextendendo a lombar.'),
('sistema','good-morning-barra','Good morning','isquiotibiais','{lombar,gluteos}','barra','composto','avancado','Barra nas costas, empurre o quadril para trás mantendo a coluna neutra.','Usar carga alta antes de dominar o movimento.'),
('sistema','rosca-punho-barra','Rosca de punho','antebraco','{}','barra','isolado','iniciante','Antebraços apoiados; flexione só os punhos.','Usar carga que force o cotovelo.')
on conflict (slug) do nothing;

-- ====== MÓDULO: SAÚDE ======

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

-- ====== MÓDULO: VÍCIOS E CONTROLE DE IMPULSOS ======

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

-- ====== MÓDULO: FINANÇAS ======

create table if not exists contas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  tipo text not null default 'corrente'
    check (tipo in ('corrente', 'poupanca', 'carteira', 'investimento')),
  saldo_inicial numeric(14,2) not null default 0,
  icone text not null default '🏦',
  cor text not null default '#2a78d6',
  ordem integer not null default 0,
  arquivada boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists contas_user_idx on contas (user_id, arquivada);
alter table contas enable row level security;

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  tipo text not null default 'despesa' check (tipo in ('despesa', 'receita')),
  icone text not null default '📦',
  cor text not null default '#86877f',
  teto_mensal numeric(14,2),
  -- Marca gastos que não dão para cortar (aluguel, luz) — usado na regra 50/30/20
  essencial boolean not null default false,
  parent_id uuid references categorias (id) on delete set null,
  ordem integer not null default 0,
  arquivada boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (user_id, nome, tipo)
);
create index if not exists categorias_user_idx on categorias (user_id, tipo);
alter table categorias enable row level security;

-- Cartão de crédito: o dia que fecha e o dia que vence são o coração da lógica
-- de fatura. Compra feita depois do fechamento cai na fatura seguinte.
create table if not exists cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  limite numeric(14,2),
  fechamento integer not null default 1 check (fechamento between 1 and 28),
  vencimento integer not null default 10 check (vencimento between 1 and 28),
  conta_id uuid references contas (id) on delete set null,
  icone text not null default '💳',
  cor text not null default '#eda100',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table cartoes enable row level security;

-- Lançamentos fixos (salário, aluguel, assinatura). Não geram linhas no banco:
-- são projetados nos meses seguintes na hora de mostrar.
create table if not exists recorrentes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  descricao text not null,
  valor numeric(14,2) not null,
  tipo text not null default 'despesa' check (tipo in ('receita', 'despesa')),
  categoria_id uuid references categorias (id) on delete set null,
  conta_id uuid references contas (id) on delete set null,
  cartao_id uuid references cartoes (id) on delete set null,
  dia_do_mes integer not null default 1 check (dia_do_mes between 1 and 31),
  -- 'mensal' | 'semanal' | 'anual'
  frequencia text not null default 'mensal' check (frequencia in ('mensal', 'semanal', 'anual')),
  inicio date not null default current_date,
  fim date,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table recorrentes enable row level security;

-- Ampliação da tabela de transações
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
alter table transacoes alter column categoria drop not null;
alter table transacoes add column if not exists categoria_id uuid references categorias (id) on delete set null;
alter table transacoes add column if not exists conta_id uuid references contas (id) on delete set null;
alter table transacoes add column if not exists cartao_id uuid references cartoes (id) on delete set null;
alter table transacoes add column if not exists forma_pagamento text not null default 'dinheiro';
alter table transacoes add column if not exists tags text[] not null default '{}';
alter table transacoes add column if not exists observacao text;
alter table transacoes add column if not exists anexo_url text;
alter table transacoes add column if not exists recorrente_id uuid references recorrentes (id) on delete set null;
-- Parcelamento: todas as parcelas da mesma compra dividem o grupo_parcelas
alter table transacoes add column if not exists grupo_parcelas uuid;
alter table transacoes add column if not exists parcela_num integer;
alter table transacoes add column if not exists parcela_total integer;
-- Mês da fatura (AAAA-MM) para compras no crédito: separa o mês do cartão do mês do caixa
alter table transacoes add column if not exists fatura_mes text;
-- Parcela futura entra como não efetivada: aparece na projeção, não no caixa de hoje
alter table transacoes add column if not exists efetivada boolean not null default true;
-- Pagamento de fatura é TRANSFERÊNCIA (conta → cartão), não gasto novo: mexe no
-- saldo da conta mas nunca entra nos relatórios de despesa, senão o gasto do
-- cartão seria contado duas vezes.
alter table transacoes add column if not exists transferencia boolean not null default false;

create index if not exists transacoes_user_data_idx on transacoes (user_id, data);
create index if not exists transacoes_fatura_idx on transacoes (user_id, cartao_id, fatura_mes);
create index if not exists transacoes_grupo_idx on transacoes (grupo_parcelas);
alter table transacoes enable row level security;

create table if not exists orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  mes text not null,                  -- 'AAAA-MM'
  categoria_id uuid not null references categorias (id) on delete cascade,
  valor_planejado numeric(14,2) not null,
  criado_em timestamptz not null default now(),
  unique (user_id, mes, categoria_id)
);
alter table orcamentos enable row level security;

create table if not exists metas_financeiras (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  titulo text not null,
  valor_alvo numeric(14,2) not null,
  valor_atual numeric(14,2) not null default 0,
  prazo date,
  conta_id uuid references contas (id) on delete set null,
  concluida_em date,
  criado_em timestamptz not null default now()
);
alter table metas_financeiras enable row level security;

create table if not exists dividas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'eu',
  nome text not null,
  saldo_atual numeric(14,2) not null,
  juros_mes numeric(6,3) not null default 0,     -- % ao mês
  parcela_min numeric(14,2) not null default 0,
  quitada_em date,
  criado_em timestamptz not null default now()
);
alter table dividas enable row level security;

-- ====== MÓDULO: FINANÇAS — CATEGORIAS INICIAIS ======

insert into categorias (user_id, nome, tipo, icone, cor, essencial, ordem) values
('eu','Mercado','despesa','🛒','#eb6834',true,1),
('eu','Alimentação fora','despesa','🍽️','#eb6834',false,2),
('eu','Delivery','despesa','🛵','#eb6834',false,3),
('eu','Transporte','despesa','🚗','#2a78d6',true,4),
('eu','Combustível','despesa','⛽','#2a78d6',true,5),
('eu','Moradia','despesa','🏠','#4a3aa7',true,6),
('eu','Contas da casa','despesa','💡','#4a3aa7',true,7),
('eu','Internet e telefone','despesa','📶','#4a3aa7',true,8),
('eu','Saúde','despesa','🩺','#e87ba4',true,9),
('eu','Farmácia','despesa','💊','#e87ba4',true,10),
('eu','Academia','despesa','🏋️','#1baf7a',false,11),
('eu','Suplementos','despesa','🥛','#1baf7a',false,12),
('eu','Educação','despesa','📚','#008300',false,13),
('eu','Assinaturas','despesa','🔁','#86877f',false,14),
('eu','Lazer','despesa','🎬','#eda100',false,15),
('eu','Compras','despesa','🛍️','#eda100',false,16),
('eu','Cuidado pessoal','despesa','✂️','#e87ba4',false,17),
('eu','Presentes','despesa','🎁','#eda100',false,18),
('eu','Impostos e taxas','despesa','🧾','#d03b3b',true,19),
('eu','Investimento','despesa','📈','#008300',false,20),
('eu','Outros','despesa','📦','#86877f',false,99),
('eu','Salário','receita','💼','#008300',false,1),
('eu','Freelance','receita','💻','#008300',false,2),
('eu','Vendas','receita','🏷️','#1baf7a',false,3),
('eu','Rendimentos','receita','📈','#1baf7a',false,4),
('eu','Reembolso','receita','↩️','#86877f',false,5),
('eu','Outras entradas','receita','📦','#86877f',false,99)
on conflict (user_id, nome, tipo) do nothing;

insert into contas (user_id, nome, tipo, icone, cor, ordem)
select 'eu', 'Carteira', 'carteira', '👛', '#eda100', 0
where not exists (select 1 from contas where user_id = 'eu');
