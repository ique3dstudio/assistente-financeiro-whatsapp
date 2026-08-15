-- Bloco 4: fluxo de caixa (contas, plano de contas e o ledger central "movimentos").
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/006_logo.sql.
-- É seguro rodar mais de uma vez (idempotente).
--
-- Arquitetura: uma tabela central de movimentos, não duas paralelas (produção x financeiro).
-- O pedido continua sendo a única fonte de verdade da venda — o app.js gera/atualiza
-- automaticamente os lançamentos de sinal e saldo vinculados a cada pedido (colunas
-- pedido_id + origem). Lançamentos avulsos (compra de insumo, despesa fixa, etc.) entram
-- na mesma tabela com pedido_id nulo.

-- ============ CONTAS (carteiras: banco, dinheiro, maquininha, Pix...) ============
create table if not exists contas_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'outro' check (tipo in ('banco', 'dinheiro', 'maquininha', 'pix', 'outro')),
  saldo_inicial numeric not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

alter table contas_financeiras enable row level security;
drop policy if exists "contas_financeiras_all" on contas_financeiras;
create policy "contas_financeiras_all" on contas_financeiras for all to authenticated using (true) with check (true);

-- ============ CATEGORIAS (plano de contas, customizável) ============
create table if not exists categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  -- categoria protegida = pró-labore/retirada de sócio (separação PF x PJ); só um aviso
  -- visual no app, não trava nada no banco.
  protegida boolean not null default false,
  -- slug estável usado pelo app pra achar categorias "de sistema" (ex: venda de pedido)
  -- mesmo que o nome seja renomeado depois. Categorias criadas pelo usuário não têm slug.
  slug text unique,
  ordem integer not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

alter table categorias_financeiras enable row level security;
drop policy if exists "categorias_financeiras_all" on categorias_financeiras;
create policy "categorias_financeiras_all" on categorias_financeiras for all to authenticated using (true) with check (true);

-- ============ MOVIMENTOS (o ledger — toda entrada/saída de dinheiro passa por aqui) ============
create table if not exists movimentos (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid references contas_financeiras(id) on delete set null,
  categoria_id uuid references categorias_financeiras(id) on delete set null,
  -- pedido de origem, quando o lançamento foi gerado automaticamente a partir de um pedido
  pedido_id uuid references pedidos(id) on delete set null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  valor numeric not null check (valor > 0),
  descricao text,
  -- regime de caixa: data em que o dinheiro entra/sai de fato, não a data da venda
  data_movimento date not null default current_date,
  -- "atrasado" não é um valor gravado — é calculado no app (previsto + data no passado),
  -- pra não depender de um job/cron rodando pra atualizar o status sozinho.
  status text not null default 'previsto' check (status in ('previsto', 'realizado', 'cancelado')),
  origem text not null default 'manual'
    check (origem in ('manual', 'pedido_sinal', 'pedido_saldo', 'transferencia', 'ia_texto', 'ia_foto', 'ia_audio')),
  -- pra transferência entre contas: aponta pro lançamento espelho (saída de uma conta / entrada na outra)
  transferencia_par_id uuid references movimentos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evita duplicar o lançamento automático de sinal/saldo se o pedido for salvo de novo.
create unique index if not exists idx_movimentos_pedido_origem
  on movimentos(pedido_id, origem)
  where pedido_id is not null and origem in ('pedido_sinal', 'pedido_saldo');

create index if not exists idx_movimentos_data on movimentos(data_movimento);
create index if not exists idx_movimentos_conta on movimentos(conta_id);
create index if not exists idx_movimentos_status on movimentos(status);

drop trigger if exists trg_movimentos_updated_at on movimentos;
create trigger trg_movimentos_updated_at
before update on movimentos
for each row execute function set_updated_at();

alter table movimentos enable row level security;
drop policy if exists "movimentos_all" on movimentos;
create policy "movimentos_all" on movimentos for all to authenticated using (true) with check (true);

-- ============ Onboarding: plano de contas pronto pra oficina 3D ============
insert into categorias_financeiras (nome, tipo, protegida, slug, ordem) values
  ('Venda de pedidos', 'entrada', false, 'venda_pedidos', 1),
  ('Outras receitas', 'entrada', false, 'outras_receitas', 2),
  ('Filamento/Resina', 'saida', false, 'filamento', 10),
  ('Energia elétrica', 'saida', false, 'energia', 11),
  ('Manutenção de máquina', 'saida', false, 'manutencao', 12),
  ('Embalagem', 'saida', false, 'embalagem', 13),
  ('Taxa de marketplace', 'saida', false, 'taxa_marketplace', 14),
  ('Marketing/Divulgação', 'saida', false, 'marketing', 15),
  ('Assinaturas/Software', 'saida', false, 'assinaturas', 16),
  ('Pró-labore / retirada', 'saida', true, 'pro_labore', 17),
  ('Outras despesas', 'saida', false, 'outras_despesas', 18)
on conflict (slug) do nothing;

-- ============ Onboarding: contas padrão ============
insert into contas_financeiras (nome, tipo)
select v.nome, v.tipo
from (values
  ('Dinheiro', 'dinheiro'),
  ('Banco PJ', 'banco'),
  ('Maquininha', 'maquininha'),
  ('Pix', 'pix')
) as v(nome, tipo)
where not exists (select 1 from contas_financeiras);

-- ============ Migração: pedidos já existentes viram lançamentos de sinal/saldo ============
-- Só roda pra pedidos que ainda não têm lançamento vinculado (evita duplicar se rodar de novo).
do $$
declare
  cat_venda_id uuid;
begin
  select id into cat_venda_id from categorias_financeiras where slug = 'venda_pedidos';

  insert into movimentos (categoria_id, pedido_id, tipo, valor, descricao, data_movimento, status, origem)
  select
    cat_venda_id,
    p.id,
    'entrada',
    p.valor_sinal,
    'Sinal — ' || c.nome,
    p.created_at::date,
    'realizado',
    'pedido_sinal'
  from pedidos p
  join clientes c on c.id = p.cliente_id
  where coalesce(p.valor_sinal, 0) > 0
    and not exists (
      select 1 from movimentos m where m.pedido_id = p.id and m.origem = 'pedido_sinal'
    );

  insert into movimentos (categoria_id, pedido_id, tipo, valor, descricao, data_movimento, status, origem)
  select
    cat_venda_id,
    p.id,
    'entrada',
    saldo.valor,
    'Saldo — ' || c.nome,
    coalesce(p.prazo_entrega, p.created_at::date),
    case when p.pagamento = 'pago' then 'realizado' else 'previsto' end,
    'pedido_saldo'
  from pedidos p
  join clientes c on c.id = p.cliente_id
  join lateral (
    select coalesce(sum(i.valor), 0) - coalesce(p.valor_sinal, 0) as valor
    from itens_pedido i where i.pedido_id = p.id
  ) as saldo on saldo.valor > 0
  where not exists (
    select 1 from movimentos m where m.pedido_id = p.id and m.origem = 'pedido_saldo'
  );
end $$;

-- ============ Realtime ============
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'contas_financeiras') then
    alter publication supabase_realtime add table contas_financeiras;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'categorias_financeiras') then
    alter publication supabase_realtime add table categorias_financeiras;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'movimentos') then
    alter publication supabase_realtime add table movimentos;
  end if;
end $$;
