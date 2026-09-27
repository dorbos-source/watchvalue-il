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

-- Production cleanup: synthetic/demo price snapshots must never survive startup.
delete from price_snapshots where is_demo=true;

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
('manual_market_seed','WatchValue Curated Market Seed','marketplace',null,false,'disabled_demo','Legacy demo source retained only for provenance; no demo observations may be presented or ingested.'),
('padani_cartier_il','Padani Cartier Israel','dealer','https://padani.com/collections/cartier',false,'retail','Israeli Cartier retail/catalog source. Current public catalog exposes ILS pricing; enable automated adapter only after usage/terms review.'),
('chrono24_market','Chrono24','marketplace','https://www.chrono24.com',false,'asking','Secondary-market asking/listing depth. Keep asking prices separate from completed transactions; enable automated adapter only after usage/terms review.'),
('phillips_auction','Phillips Auctions','auction','https://www.phillips.com',true,'public_results','Public completed auction-result observations; retain source URL and sale date.'),
('boi_fx','Bank of Israel FX','fx','https://www.boi.org.il',false,'fx','Official ILS FX normalization source; historical rate provenance required before conversion.')
on conflict(source_key) do update set name=excluded.name,source_type=excluded.source_type,base_url=excluded.base_url,
enabled=excluded.enabled,usage_mode=excluded.usage_mode,notes=excluded.notes,updated_at=now();

insert into agent_tasks(task_type,payload,status,run_after)
select 'catalog_quality_scan','{"scope":"all"}'::jsonb,'queued',now()
where not exists(select 1 from agent_tasks where task_type='catalog_quality_scan' and status in ('queued','running'));

insert into agent_tasks(task_type,payload,status,run_after)
select 'source_terms_review','{"scope":"official_sources"}'::jsonb,'queued',now()
where not exists(select 1 from agent_tasks where task_type='source_terms_review' and status in ('queued','running'));
