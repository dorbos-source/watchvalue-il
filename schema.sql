create table if not exists brands (
  id bigserial primary key,
  slug text unique not null,
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists watches (
  id bigserial primary key,
  brand_id bigint not null references brands(id) on delete cascade,
  collection text,
  model text not null,
  reference text unique not null,
  status text not null default 'current' check (status in ('current','discontinued','limited')),
  production_start int,
  production_end int,
  case_size_mm numeric(5,2),
  material text,
  dial text,
  movement text,
  limited_quantity int,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table watches add column if not exists image_url text;

alter table watches add column if not exists official_model_name text;
alter table watches add column if not exists nickname text;
alter table watches add column if not exists generation text;
alter table watches add column if not exists bracelet text;
alter table watches add column if not exists bezel text;
alter table watches add column if not exists variant_key text;
create index if not exists watches_collection_idx on watches(collection);
create index if not exists watches_generation_idx on watches(generation);
create index if not exists watches_variant_key_idx on watches(variant_key);


create index if not exists watches_brand_idx on watches(brand_id);
create index if not exists watches_reference_idx on watches(reference);

create table if not exists price_snapshots (
  id bigserial primary key,
  watch_id bigint not null references watches(id) on delete cascade,
  as_of timestamptz not null default now(),
  currency text not null default 'USD',
  market_value_usd numeric(14,2),
  retail_price_usd numeric(14,2),
  dealer_buy_usd numeric(14,2),
  dealer_ask_usd numeric(14,2),
  private_sale_usd numeric(14,2),
  market_value_ils numeric(14,2),
  retail_price_ils numeric(14,2),
  dealer_buy_ils numeric(14,2),
  dealer_ask_ils numeric(14,2),
  private_sale_ils numeric(14,2),
  change_12m numeric(8,2),
  liquidity_score numeric(5,2),
  liquidity_label text,
  confidence numeric(5,2),
  listing_count int,
  source_count int,
  methodology_version text,
  is_demo boolean not null default false,
  unique(watch_id, as_of)
);

alter table price_snapshots add column if not exists market_value_ils numeric(14,2);
alter table price_snapshots add column if not exists retail_price_ils numeric(14,2);
alter table price_snapshots add column if not exists dealer_buy_ils numeric(14,2);
alter table price_snapshots add column if not exists dealer_ask_ils numeric(14,2);
alter table price_snapshots add column if not exists private_sale_ils numeric(14,2);
alter table price_snapshots add column if not exists change_12m numeric(8,2);
alter table price_snapshots add column if not exists liquidity_score numeric(5,2);
alter table price_snapshots add column if not exists liquidity_label text;
alter table price_snapshots add column if not exists is_demo boolean not null default false;

create index if not exists price_snapshots_watch_time_idx on price_snapshots(watch_id, as_of desc);

create table if not exists listings (
  id bigserial primary key,
  watch_id bigint references watches(id) on delete cascade,
  source text not null,
  source_listing_id text,
  url text,
  asking_price numeric(14,2),
  currency text,
  condition text,
  year int,
  full_set boolean,
  country text,
  seller_type text,
  observed_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique(source, source_listing_id)
);

create table if not exists news_items (
  id bigserial primary key,
  source text not null,
  source_url text unique not null,
  title text not null,
  summary_he text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists project_memory (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists agent_tasks (
  id bigserial primary key,
  task_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  attempts int not null default 0,
  last_error text,
  run_after timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id bigserial primary key,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  plan text check (plan in ('monthly','annual')),
  status text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists source_registry (
  id bigserial primary key,
  source_key text unique not null,
  name text not null,
  source_type text not null check (source_type in ('official','marketplace','auction','dealer','community','fx','news')),
  base_url text,
  enabled boolean not null default false,
  usage_mode text not null default 'research',
  notes text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ingestion_runs (
  id bigserial primary key,
  source_key text references source_registry(source_key) on delete set null,
  job_type text not null,
  status text not null check (status in ('running','success','failed','skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen int not null default 0,
  records_written int not null default 0,
  details jsonb not null default '{}'::jsonb,
  error text
);

create index if not exists ingestion_runs_started_idx on ingestion_runs(started_at desc);


-- Normalized configuration layer: one official reference can have multiple dial/bracelet/bezel variants.
create table if not exists watch_variants (
  id bigserial primary key,
  watch_id bigint not null references watches(id) on delete cascade,
  variant_key text not null,
  nickname text,
  dial text,
  bracelet text,
  bezel text,
  material text,
  production_start int,
  production_end int,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(watch_id, variant_key)
);
create index if not exists watch_variants_watch_idx on watch_variants(watch_id);
create index if not exists watch_variants_key_idx on watch_variants(variant_key);

-- Provenance for catalog facts so model/year/status data can be audited before being treated as authoritative.
create table if not exists catalog_fact_sources (
  id bigserial primary key,
  watch_id bigint not null references watches(id) on delete cascade,
  variant_id bigint references watch_variants(id) on delete cascade,
  field_name text not null,
  source_key text,
  source_url text,
  source_type text,
  verified_at timestamptz,
  confidence numeric(5,2),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists catalog_fact_sources_watch_idx on catalog_fact_sources(watch_id);
create index if not exists catalog_fact_sources_variant_idx on catalog_fact_sources(variant_id);


-- Raw market observations stay separate from calculated WatchValue estimates.
create table if not exists market_observations (
  id bigserial primary key,
  watch_id bigint not null references watches(id) on delete cascade,
  variant_id bigint references watch_variants(id) on delete set null,
  source_key text references source_registry(source_key) on delete set null,
  source_observation_id text,
  source_url text,
  observation_type text not null check (observation_type in ('asking','transaction','auction_result','dealer_bid','dealer_ask','private_sale')),
  price numeric(14,2) not null check (price > 0),
  currency text not null,
  price_ils numeric(14,2),
  condition text,
  year int,
  full_set boolean,
  country text,
  seller_type text,
  observed_at timestamptz not null default now(),
  captured_at timestamptz not null default now(),
  is_verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);
create unique index if not exists market_observations_source_id_uidx
  on market_observations(source_key,source_observation_id)
  where source_observation_id is not null;
create index if not exists market_observations_watch_time_idx on market_observations(watch_id,observed_at desc);
create index if not exists market_observations_type_idx on market_observations(observation_type);

create table if not exists watchvalue_estimates (
  id bigserial primary key,
  watch_id bigint not null references watches(id) on delete cascade,
  variant_id bigint references watch_variants(id) on delete set null,
  as_of timestamptz not null default now(),
  market_value_ils numeric(14,2) not null,
  low_ils numeric(14,2),
  high_ils numeric(14,2),
  confidence numeric(5,2),
  observation_count int not null default 0,
  source_count int not null default 0,
  methodology_version text not null,
  is_demo boolean not null default false,
  details jsonb not null default '{}'::jsonb
);
create index if not exists watchvalue_estimates_watch_time_idx on watchvalue_estimates(watch_id,as_of desc);


-- Official manufacturer/store retail prices. Kept separate from secondary-market observations.
create table if not exists retail_prices (
  id bigserial primary key,
  watch_id bigint not null references watches(id) on delete cascade,
  variant_id bigint references watch_variants(id) on delete set null,
  source_key text references source_registry(source_key) on delete set null,
  source_url text,
  price numeric(14,2) not null check(price>0),
  currency text not null,
  market_country text,
  includes_tax boolean,
  effective_at timestamptz not null default now(),
  captured_at timestamptz not null default now(),
  is_official boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists retail_prices_watch_time_idx on retail_prices(watch_id,effective_at desc);

alter table watchvalue_estimates add column if not exists retail_price_ils numeric(14,2);
alter table watchvalue_estimates add column if not exists market_to_retail_ratio numeric(10,4);
alter table watchvalue_estimates add column if not exists premium_discount_pct numeric(10,2);


-- FX provenance for historical and current ILS normalization.
create table if not exists fx_rates (
  id bigserial primary key,
  rate_date date not null,
  base_currency text not null,
  quote_currency text not null default 'ILS',
  rate numeric(18,8) not null check(rate>0),
  source_key text not null,
  source_url text,
  captured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(rate_date,base_currency,quote_currency,source_key)
);
create index if not exists fx_rates_pair_date_idx on fx_rates(base_currency,quote_currency,rate_date desc);

alter table market_observations add column if not exists fx_rate numeric(18,8);
alter table market_observations add column if not exists fx_rate_date date;
alter table market_observations add column if not exists fx_source_key text;
