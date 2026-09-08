-- Núcleo do Life OS — rode este arquivo PRIMEIRO no SQL Editor do Supabase,
-- depois os schema.sql de cada módulo (src/modules/<id>/schema.sql).
-- Atalho: db/RODAR-TUDO.sql já traz tudo isto junto, na ordem certa.

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
