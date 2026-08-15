-- Bloco 5: categorias financeiras extras (do dia a dia real da loja) e campo "responsável"
-- nos lançamentos, pra saber quanto cada sócia gastou.
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/007_financeiro.sql.
-- É seguro rodar mais de uma vez (idempotente).

-- ============ Categorias extras (sem slug — são específicas da loja, não "de sistema") ============
insert into categorias_financeiras (nome, tipo, ordem)
select v.nome, v.tipo, v.ordem
from (values
  ('Venda pessoalmente', 'entrada', 3),
  ('Impressora', 'saida', 19),
  ('Itens de embalagem', 'saida', 20),
  ('Filamentos', 'saida', 21),
  ('Ferramentas', 'saida', 22),
  ('Itens para impressão', 'saida', 23),
  ('DAS MEI', 'saida', 24),
  ('Mensalidade Claude', 'saida', 25)
) as v(nome, tipo, ordem)
where not exists (
  select 1 from categorias_financeiras c where c.nome = v.nome
);

-- ============ Responsável (qual das sócias gerou o lançamento) ============
alter table movimentos add column if not exists responsavel text;

alter table movimentos drop constraint if exists movimentos_responsavel_check;
alter table movimentos add constraint movimentos_responsavel_check
  check (responsavel is null or responsavel in ('Tamires', 'Gustavo'));
