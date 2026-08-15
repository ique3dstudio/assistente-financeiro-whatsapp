-- Avatar/logo da loja, trocável direto pelo app (upload de foto do celular).
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/005_calculadora.sql.
-- É seguro rodar mais de uma vez (idempotente).

alter table configuracoes add column if not exists logo_path text;

-- Bucket público (a logo aparece até na página de acompanhamento, sem login).
insert into storage.buckets (id, name, public)
values ('loja3d-branding', 'loja3d-branding', true)
on conflict (id) do nothing;

-- Qualquer um pode VER a logo (é pública, aparece pro cliente); só quem está logado pode trocar.
drop policy if exists "loja3d_branding_select" on storage.objects;
create policy "loja3d_branding_select" on storage.objects
  for select using (bucket_id = 'loja3d-branding');

drop policy if exists "loja3d_branding_insert" on storage.objects;
create policy "loja3d_branding_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'loja3d-branding');

drop policy if exists "loja3d_branding_delete" on storage.objects;
create policy "loja3d_branding_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'loja3d-branding');

-- Função pública (mesmo padrão de acompanhar_pedido): devolve só nome da loja e caminho da
-- logo, pra página de acompanhamento (sem login) conseguir mostrar a marca certa.
create or replace function obter_configuracoes_publicas()
returns table (nome_loja text, logo_path text)
language sql
security definer
set search_path = public
stable
as $$
  select nome_loja, logo_path from configuracoes where id = 1;
$$;

grant execute on function obter_configuracoes_publicas() to anon;
