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
