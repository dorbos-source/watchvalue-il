insert into brands(slug,name) values
('rolex','Rolex'),('patek-philippe','Patek Philippe'),('audemars-piguet','Audemars Piguet'),
('cartier','Cartier'),('omega','Omega'),('richard-mille','Richard Mille'),('vacheron-constantin','Vacheron Constantin'),
('tudor','Tudor'),('iwc','IWC'),('breitling','Breitling'),('panerai','Panerai'),
('jaeger-lecoultre','Jaeger-LeCoultre'),('grand-seiko','Grand Seiko'),('hublot','Hublot'),
('a-lange-sohne','A. Lange & Söhne'),('fp-journe','F.P. Journe')
on conflict do nothing;

insert into project_memory(key,value) values
('product', '{"name":"WatchValue IL","market":"Israel","positioning":"Luxury watch price guide and market intelligence"}'),
('subscription', '{"trial_days":7,"monthly_usd":14.99,"annual_usd":149}'),
('catalog_policy', '{"scope":"liquid luxury brands and all actively traded references","include_discontinued":true,"reference_based":true}'),
('data_policy', '{"paid_data_required":false,"use_multiple_permitted_public_sources":true,"calculate_own_market_value":true,"never_present_demo_data_as_live":true}')
on conflict (key) do update set value=excluded.value, updated_at=now();
