-- Categorias e conta iniciais (E3.1). Roda de novo sem duplicar.
-- Você pode renomear, mudar ícone, cor e teto de cada uma dentro do app.

insert into categorias (user_id, nome, tipo, icone, cor, essencial, ordem) values
('eu','Mercado','despesa','🛒','#eb6834',true,1),
('eu','Alimentação fora','despesa','🍽️','#eb6834',false,2),
('eu','Delivery','despesa','🛵','#eb6834',false,3),
('eu','Transporte','despesa','🚗','#2a78d6',true,4),
('eu','Combustível','despesa','⛽','#2a78d6',true,5),
('eu','Moradia','despesa','🏠','#4a3aa7',true,6),
('eu','Contas da casa','despesa','💡','#4a3aa7',true,7),
('eu','Internet e telefone','despesa','📶','#4a3aa7',true,8),
('eu','Saúde','despesa','🩺','#e87ba4',true,9),
('eu','Farmácia','despesa','💊','#e87ba4',true,10),
('eu','Academia','despesa','🏋️','#1baf7a',false,11),
('eu','Suplementos','despesa','🥛','#1baf7a',false,12),
('eu','Educação','despesa','📚','#008300',false,13),
('eu','Assinaturas','despesa','🔁','#86877f',false,14),
('eu','Lazer','despesa','🎬','#eda100',false,15),
('eu','Compras','despesa','🛍️','#eda100',false,16),
('eu','Cuidado pessoal','despesa','✂️','#e87ba4',false,17),
('eu','Presentes','despesa','🎁','#eda100',false,18),
('eu','Impostos e taxas','despesa','🧾','#d03b3b',true,19),
('eu','Investimento','despesa','📈','#008300',false,20),
('eu','Outros','despesa','📦','#86877f',false,99),
('eu','Salário','receita','💼','#008300',false,1),
('eu','Freelance','receita','💻','#008300',false,2),
('eu','Vendas','receita','🏷️','#1baf7a',false,3),
('eu','Rendimentos','receita','📈','#1baf7a',false,4),
('eu','Reembolso','receita','↩️','#86877f',false,5),
('eu','Outras entradas','receita','📦','#86877f',false,99)
on conflict (user_id, nome, tipo) do nothing;

insert into contas (user_id, nome, tipo, icone, cor, ordem)
select 'eu', 'Carteira', 'carteira', '👛', '#eda100', 0
where not exists (select 1 from contas where user_id = 'eu');
