-- Módulo Finanças (Fase 3)
--
-- Nota de projeto: a tabela `transacoes` já existia da versão anterior (o
-- assistente do WhatsApp), com `categoria` em texto. Ela é ampliada aqui em vez
-- de recriada, e o campo de texto continua funcionando — é por ele que a IA
-- lança um gasto sem precisar conhecer os ids das suas categorias.

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
