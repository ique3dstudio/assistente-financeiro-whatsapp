-- Bloco 7: aba "Orçamento" (proposta comercial em PDF, separada do fluxo de pedido).
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/014_produto_acabado.sql.
-- É seguro rodar mais de uma vez (idempotente).
--
-- Fluxo: um orçamento é uma proposta enviada ao cliente, sem gerar pedido nem lançamento
-- financeiro nenhum. Quando o cliente aceita, um botão no app converte ele num pedido de
-- verdade (cria/reaproveita o cliente, cria o pedido e os itens_pedido), sem redigitar nada.

-- ============ Dados da empresa (pro cabeçalho da proposta em PDF) ============
alter table configuracoes add column if not exists cnpj text;
alter table configuracoes add column if not exists endereco text;
alter table configuracoes add column if not exists telefone text;

update configuracoes set
  cnpj = coalesce(cnpj, '66.206.716/0001-58'),
  endereco = coalesce(endereco, 'Rua João Tibiriçá Piratininga, 475 - Jardim Pau Preto, Indaiatuba - SP, CEP 13330-450'),
  telefone = coalesce(telefone, '(19) 99392-5034')
where id = 1;

-- ============ ORÇAMENTOS (a proposta em si) ============
create table if not exists orcamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  cliente_documento text,
  cliente_endereco text,
  cliente_contato text,
  -- vendedor responsável pela proposta (mesmo vocabulário usado em movimentos.responsavel)
  responsavel text check (responsavel is null or responsavel in ('Tamires', 'Gustavo')),
  condicao_pagamento text,
  prazo_entrega text,
  frete text,
  validade_dias integer not null default 15 check (validade_dias > 0),
  observacoes text,
  status text not null default 'enviado' check (status in ('enviado', 'aceito', 'recusado')),
  -- preenchido quando o orçamento é convertido em pedido real
  pedido_id uuid references pedidos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_orcamentos_updated_at on orcamentos;
create trigger trg_orcamentos_updated_at
before update on orcamentos
for each row execute function set_updated_at();

alter table orcamentos enable row level security;
drop policy if exists "orcamentos_all" on orcamentos;
create policy "orcamentos_all" on orcamentos for all to authenticated using (true) with check (true);

create index if not exists idx_orcamentos_status on orcamentos(status);

-- ============ ITENS DO ORÇAMENTO ============
create table if not exists itens_orcamento (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  descricao text not null,
  quantidade numeric not null default 1 check (quantidade > 0),
  valor_unitario numeric not null default 0 check (valor_unitario >= 0),
  created_at timestamptz not null default now()
);

alter table itens_orcamento enable row level security;
drop policy if exists "itens_orcamento_all" on itens_orcamento;
create policy "itens_orcamento_all" on itens_orcamento for all to authenticated using (true) with check (true);

create index if not exists idx_itens_orcamento_orcamento on itens_orcamento(orcamento_id);

-- ============ Realtime ============
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orcamentos') then
    alter publication supabase_realtime add table orcamentos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'itens_orcamento') then
    alter publication supabase_realtime add table itens_orcamento;
  end if;
end $$;
