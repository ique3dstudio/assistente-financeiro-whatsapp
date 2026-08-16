-- Bloco 7: Pix estático (QR Code "copia e cola" por pedido).
-- Rode este script no SQL Editor do Supabase DEPOIS do sql/009_despesas_fixas_parcelamento.sql.
-- É seguro rodar mais de uma vez (idempotente).

-- ============ Dados necessários pro payload Pix (padrão Banco Central) ============
-- chave_pix: sua chave cadastrada no banco (CPF, CNPJ, e-mail, telefone ou chave aleatória).
-- cidade: cidade da loja, exigida pelo padrão do BR Code (fica visível no app de pagamento).
alter table configuracoes add column if not exists chave_pix text;
alter table configuracoes add column if not exists cidade text;
