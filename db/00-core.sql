-- Núcleo do Vida OS — rode este arquivo PRIMEIRO no SQL Editor do Supabase,
-- depois os schema.sql de cada módulo (src/modules/<id>/schema.sql).

create table if not exists configuracoes (
  user_id text not null default 'eu',
  chave text not null,
  valor text not null,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, chave)
);

alter table configuracoes enable row level security;
