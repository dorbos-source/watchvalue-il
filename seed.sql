insert into brands(slug,name) values
('rolex','Rolex'),('patek-philippe','Patek Philippe'),('audemars-piguet','Audemars Piguet'),
('cartier','Cartier'),('omega','Omega'),('richard-mille','Richard Mille'),('vacheron-constantin','Vacheron Constantin'),
('tudor','Tudor'),('iwc','IWC'),('breitling','Breitling'),('panerai','Panerai'),
('jaeger-lecoultre','Jaeger-LeCoultre'),('grand-seiko','Grand Seiko'),('hublot','Hublot'),
('a-lange-sohne','A. Lange & Söhne'),('fp-journe','F.P. Journe')
on conflict do nothing;

with watch_seed(brand,collection,model,reference,status,production_start,production_end,case_size_mm,material,dial) as (values
('Rolex','GMT-Master II','Pepsi','126710BLRO','current',2018,null,40,'Oystersteel','Black'),
('Rolex','Submariner Date','Black','126610LN','current',2020,null,41,'Oystersteel','Black'),
('Rolex','Cosmograph Daytona','Panda','126500LN','current',2023,null,40,'Oystersteel','White'),
('Rolex','Submariner Date','Hulk','116610LV','discontinued',2010,2020,40,'Oystersteel','Green'),
('Rolex','GMT-Master II','Batman','126710BLNR','current',2019,null,40,'Oystersteel','Black'),
('Rolex','Day-Date 40','Yellow Gold','228238','current',2015,null,40,'18K Yellow Gold','Various'),
('Patek Philippe','Nautilus','Blue Dial','5711/1A-010','discontinued',2006,2021,40,'Steel','Blue'),
('Patek Philippe','Nautilus','Moon Phase','5712/1A-001','current',2006,null,40,'Steel','Blue'),
('Audemars Piguet','Royal Oak','Selfwinding','15510ST.OO.1320ST.06','current',2022,null,41,'Steel','Blue'),
('Audemars Piguet','Royal Oak','Jumbo Extra-Thin','16202ST.OO.1240ST.02','current',2022,null,39,'Steel','Blue'),
('Cartier','Santos de Cartier','Large','WSSA0018','current',2018,null,39.8,'Steel','White'),
('Cartier','Tank Must','Large','WSTA0041','current',2021,null,33.7,'Steel','White'),
('Omega','Speedmaster','Moonwatch Sapphire','310.30.42.50.01.002','current',2021,null,42,'Steel','Black'),
('Omega','Seamaster Diver 300M','Black','210.30.42.20.01.001','current',2018,null,42,'Steel','Black'),
('Richard Mille','RM 11','Flyback Chronograph','RM11-03','discontinued',2016,2022,44.5,'Titanium','Skeleton'),
('Vacheron Constantin','Overseas','Blue Dial','4500V/110A-B128','discontinued',2016,2024,41,'Steel','Blue'),
('Tudor','Black Bay Fifty-Eight','Black','79030N','current',2018,null,39,'Steel','Black'),
('IWC','Pilot’s Watch','Mark XX','IW328201','current',2022,null,40,'Steel','Black'),
('Breitling','Navitimer B01','Chronograph 43','AB0138211B1P1','current',2022,null,43,'Steel','Black'),
('F.P. Journe','Chronomètre Bleu','Tantalum','CB','current',2009,null,39,'Tantalum','Blue')
)
insert into watches(brand_id,collection,model,reference,status,production_start,production_end,case_size_mm,material,dial)
select b.id,s.collection,s.model,s.reference,s.status,s.production_start,s.production_end,s.case_size_mm,s.material,s.dial
from watch_seed s join brands b on b.name=s.brand
on conflict(reference) do update set
collection=excluded.collection,model=excluded.model,status=excluded.status,production_start=excluded.production_start,
production_end=excluded.production_end,case_size_mm=excluded.case_size_mm,material=excluded.material,dial=excluded.dial,updated_at=now();

with price_seed(reference,market_ils,retail_ils,change_12m,liquidity_score,liquidity_label) as (values
('126710BLRO',72500,46500,4.8,94,'Very High'),
('126610LN',55800,42300,2.1,98,'Very High'),
('126500LN',109500,59100,6.2,96,'Very High'),
('116610LV',74800,null,1.8,89,'High'),
('126710BLNR',61200,45500,2.9,95,'Very High'),
('228238',151000,167000,-0.7,78,'High'),
('5711/1A-010',395000,null,-1.6,82,'High'),
('5712/1A-001',462000,null,3.1,76,'High'),
('15510ST.OO.1320ST.06',186000,117000,0.9,84,'High'),
('16202ST.OO.1240ST.02',348000,null,2.4,71,'High'),
('WSSA0018',23500,31500,3.4,88,'High'),
('WSTA0041',11800,13900,1.3,83,'High'),
('310.30.42.50.01.002',24800,33300,1.2,91,'High'),
('210.30.42.20.01.001',16800,23500,-0.5,87,'High'),
('RM11-03',785000,null,-2.4,53,'Medium'),
('4500V/110A-B128',103000,null,2.7,72,'High'),
('79030N',10500,14900,0.5,86,'High'),
('IW328201',18100,25200,-1.1,67,'Medium'),
('AB0138211B1P1',22300,35200,-0.8,63,'Medium'),
('CB',315000,null,5.4,48,'Medium')
)
insert into price_snapshots(
  watch_id,as_of,currency,market_value_ils,retail_price_ils,dealer_buy_ils,dealer_ask_ils,private_sale_ils,
  change_12m,liquidity_score,liquidity_label,confidence,listing_count,source_count,methodology_version,is_demo
)
select w.id,'2026-09-24T00:00:00Z','ILS',p.market_ils,p.retail_ils,
round(p.market_ils*0.91),round(p.market_ils*1.055),round(p.market_ils*0.96),
p.change_12m,p.liquidity_score,p.liquidity_label,65,0,0,'demo-v1',true
from price_seed p join watches w on w.reference=p.reference
on conflict(watch_id,as_of) do update set
market_value_ils=excluded.market_value_ils,retail_price_ils=excluded.retail_price_ils,
dealer_buy_ils=excluded.dealer_buy_ils,dealer_ask_ils=excluded.dealer_ask_ils,private_sale_ils=excluded.private_sale_ils,
change_12m=excluded.change_12m,liquidity_score=excluded.liquidity_score,liquidity_label=excluded.liquidity_label,
confidence=excluded.confidence,methodology_version=excluded.methodology_version,is_demo=excluded.is_demo;

insert into project_memory(key,value) values
('product', '{"name":"WatchValue IL","market":"Israel","positioning":"Luxury watch price guide and market intelligence"}'),
('subscription', '{"trial_days":7,"monthly_usd":14.99,"annual_usd":149}'),
('catalog_policy', '{"scope":"liquid luxury brands and all actively traded references","include_discontinued":true,"reference_based":true}'),
('data_policy', '{"paid_data_required":false,"use_multiple_permitted_public_sources":true,"calculate_own_market_value":true,"never_present_demo_data_as_live":true}'),
('ui_v2', '{"status":"deployed","mobile_first":true,"watchlist":true,"filters":true,"reference_pages":true}')
on conflict (key) do update set value=excluded.value, updated_at=now();

insert into source_registry(source_key,name,source_type,base_url,enabled,usage_mode,notes) values
('rolex_official','Rolex Official','official','https://www.rolex.com',false,'metadata','Official catalog/reference metadata only; enable adapter after source terms are reviewed.'),
('patek_official','Patek Philippe Official','official','https://www.patek.com',false,'metadata','Official catalog/reference metadata only; enable adapter after source terms are reviewed.'),
('ap_official','Audemars Piguet Official','official','https://www.audemarspiguet.com',false,'metadata','Official catalog/reference metadata only; enable adapter after source terms are reviewed.'),
('cartier_official','Cartier Official','official','https://www.cartier.com',false,'metadata','Official catalog/reference metadata only; enable adapter after source terms are reviewed.'),
('omega_official','Omega Official','official','https://www.omegawatches.com',false,'metadata','Official catalog/reference metadata only; enable adapter after source terms are reviewed.'),
('manual_market_seed','WatchValue Curated Market Seed','marketplace',null,true,'demo','Temporary demo market observations only. Replace with permitted live data adapters.')
on conflict(source_key) do update set name=excluded.name,source_type=excluded.source_type,base_url=excluded.base_url,
enabled=excluded.enabled,usage_mode=excluded.usage_mode,notes=excluded.notes,updated_at=now();

insert into agent_tasks(task_type,payload,status,run_after)
select 'catalog_quality_scan','{"scope":"all"}'::jsonb,'queued',now()
where not exists(select 1 from agent_tasks where task_type='catalog_quality_scan' and status in ('queued','running'));

insert into agent_tasks(task_type,payload,status,run_after)
select 'source_terms_review','{"scope":"official_sources"}'::jsonb,'queued',now()
where not exists(select 1 from agent_tasks where task_type='source_terms_review' and status in ('queued','running'));
