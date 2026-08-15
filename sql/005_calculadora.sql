-- Histórico da Calculadora livre + canais de venda com comissão pré-definida.
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/004_bloco3.sql.
-- É seguro rodar mais de uma vez (idempotente).

-- ============ Canais de venda (comissão % + taxa fixa, editável) ============
create table if not exists canais_venda (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  comissao_percentual numeric not null default 0,
  taxa_fixa numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table canais_venda enable row level security;
drop policy if exists "canais_venda_all" on canais_venda;
create policy "canais_venda_all" on canais_venda for all to authenticated using (true) with check (true);

-- Valores de referência (ago/2026) para o plano com frete grátis de cada plataforma.
-- Shopee e TikTok Shop têm um número único; o do Mercado Livre varia bastante por categoria
-- e anúncio (Clássico/Premium), então o valor aqui é só um ponto de partida "Clássico" — ajuste
-- em ⚙ Configurações > Canais de venda conforme a categoria real do seu produto.
insert into canais_venda (nome, comissao_percentual, taxa_fixa)
select * from (values
  ('Shopee (frete grátis)', 20, 4),
  ('TikTok Shop (frete grátis)', 6, 6),
  ('Mercado Livre (Clássico, aprox. — revisar por categoria)', 12, 6)
) as v(nome, comissao_percentual, taxa_fixa)
where not exists (select 1 from canais_venda);

-- ============ Histórico de consultas da Calculadora livre ============
create table if not exists consultas_calculadora (
  id uuid primary key default gen_random_uuid(),
  descricao text,
  material_id uuid references materiais(id) on delete set null,
  material_nome text,
  peso_gramas numeric,
  tempo_horas numeric,
  mao_obra_horas numeric,
  mao_obra_terceiro numeric,
  canal_venda_id uuid references canais_venda(id) on delete set null,
  canal_venda_nome text,
  comissao_percentual numeric,
  taxa_fixa_comissao numeric,
  item_adicional numeric,
  custo_total numeric,
  custo_com_risco numeric,
  preco_sem_comissao numeric,
  preco_final numeric,
  lucro_liquido numeric,
  criado_por text,
  created_at timestamptz not null default now()
);

alter table consultas_calculadora enable row level security;
drop policy if exists "consultas_calculadora_all" on consultas_calculadora;
create policy "consultas_calculadora_all" on consultas_calculadora for all to authenticated using (true) with check (true);

-- ============ Realtime ============
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'canais_venda') then
    alter publication supabase_realtime add table canais_venda;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'consultas_calculadora') then
    alter publication supabase_realtime add table consultas_calculadora;
  end if;
end $$;
