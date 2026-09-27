import express from 'express';
import pg from 'pg';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 3000;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

async function initializeDatabase() {
  if (!pool) return;
  const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  const seed = await fs.readFile(path.join(__dirname, 'seed.sql'), 'utf8');
  await pool.query(schema);
  await pool.query(seed);
  console.log('WatchValue IL database initialized');
}

app.use(express.json());
app.use(express.static(__dirname,{etag:true,maxAge:'5m'}));

app.get('/health', async (_req, res) => {
  try {
    if (pool) await pool.query('select 1');
    res.json({ ok: true, app: process.env.APP_NAME || 'WatchValue IL', db: !!pool });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.get('/api/config', (_req, res) => {
  res.json({
    appName: process.env.APP_NAME || 'WatchValue IL',
    trialDays: Number(process.env.TRIAL_DAYS || 7),
    monthlyPriceUsd: Number(process.env.MONTHLY_PRICE_USD || 14.99),
    annualPriceUsd: Number(process.env.ANNUAL_PRICE_USD || 149)
  });
});

app.get('/api/brands', async (_req, res) => {
  if (!pool) return res.json([]);
  const { rows } = await pool.query(`
    select b.id, b.slug, b.name, count(w.id)::int as watch_count
    from brands b left join watches w on w.brand_id=b.id
    group by b.id order by b.name
  `);
  res.json(rows);
});

app.get('/api/watches', async (req, res) => {
  if (!pool) return res.json([]);
  const q = String(req.query.q || '').trim();
  const { rows } = await pool.query(`
    select w.id,w.reference,w.model,w.collection,w.official_model_name,w.nickname,w.generation,w.bracelet,w.bezel,w.variant_key,
           w.status,w.production_start,w.production_end,w.case_size_mm,w.material,w.dial,w.movement,w.image_url,b.name as brand,
           p.market_value_ils,p.retail_price_ils,p.dealer_buy_ils,p.dealer_ask_ils,p.private_sale_ils,
           p.change_12m,p.liquidity_score,p.liquidity_label,p.confidence,p.listing_count,p.source_count,
           p.is_demo,p.as_of
    from watches w
    join brands b on b.id=w.brand_id
    left join lateral (
      select * from price_snapshots ps where ps.watch_id=w.id order by as_of desc limit 1
    ) p on true
    where ($1='' or w.reference ilike '%'||$1||'%' or w.model ilike '%'||$1||'%' or
           w.collection ilike '%'||$1||'%' or coalesce(w.official_model_name,'') ilike '%'||$1||'%' or
           coalesce(w.nickname,'') ilike '%'||$1||'%' or coalesce(w.generation,'') ilike '%'||$1||'%' or
           coalesce(w.bracelet,'') ilike '%'||$1||'%' or b.name ilike '%'||$1||'%')
    order by coalesce(p.liquidity_score,0) desc,b.name,w.collection,w.reference
    limit 500
  `,[q]);
  res.json(rows);
});

app.get('/api/watch/:reference/variants', async (req,res)=>{
  if(!pool) return res.json([]);
  const {rows}=await pool.query(`
    select v.id,v.variant_key,v.nickname,v.dial,v.bracelet,v.bezel,v.material,
           v.production_start,v.production_end,v.image_url
    from watch_variants v
    join watches w on w.id=v.watch_id
    where lower(w.reference)=lower($1)
    order by v.variant_key
  `,[req.params.reference]);
  res.json(rows);
});

app.get('/api/watch/:reference', async (req,res)=>{
  if(!pool) return res.status(404).json({error:'Database unavailable'});
  const {rows}=await pool.query(`
    select w.*,b.name as brand,
           p.market_value_ils,p.retail_price_ils,p.dealer_buy_ils,p.dealer_ask_ils,p.private_sale_ils,
           p.change_12m,p.liquidity_score,p.liquidity_label,p.confidence,p.listing_count,p.source_count,p.is_demo,p.as_of
    from watches w join brands b on b.id=w.brand_id
    left join lateral (select * from price_snapshots ps where ps.watch_id=w.id order by as_of desc limit 1) p on true
    where lower(w.reference)=lower($1) limit 1
  `,[req.params.reference]);
  if(!rows.length) return res.status(404).json({error:'Reference not found'});
  res.json(rows[0]);
});

app.get('/api/watch/:reference/market', async (req,res)=>{
  if(!pool) return res.status(503).json({error:'Database unavailable'});
  const {rows:[watch]}=await pool.query('select id from watches where lower(reference)=lower($1) limit 1',[req.params.reference]);
  if(!watch) return res.status(404).json({error:'Reference not found'});
  const [observations,estimate,retail,variants,freshness]=await Promise.all([
    pool.query(`
      select mo.observation_type,mo.price,mo.currency,mo.price_ils,mo.condition,mo.year,mo.full_set,
             mo.country,mo.seller_type,mo.observed_at,mo.captured_at,mo.is_verified,mo.source_key,mo.source_url,
             mo.fx_rate,mo.fx_rate_date,mo.fx_source_key,s.name as source_name
      from market_observations mo left join source_registry s on s.source_key=mo.source_key
      where mo.watch_id=$1 order by mo.observed_at desc limit 100
    `,[watch.id]),
    pool.query(`
      select market_value_ils,low_ils,high_ils,confidence,observation_count,source_count,
             methodology_version,is_demo,as_of
      from watchvalue_estimates where watch_id=$1 order by as_of desc limit 1
    `,[watch.id]),
    pool.query(`
      select rp.price,rp.currency,rp.market_country,rp.includes_tax,rp.effective_at,rp.captured_at,
             rp.is_official,rp.source_key,rp.source_url,s.name as source_name
      from retail_prices rp left join source_registry s on s.source_key=rp.source_key
      where rp.watch_id=$1 order by rp.effective_at desc,rp.captured_at desc limit 30
    `,[watch.id]),
    pool.query(`
      select v.variant_key,v.nickname,v.dial,v.bracelet,v.bezel,v.material,v.image_url,
             c.source_key,c.source_url,c.verified_at,c.confidence
      from watch_variants v
      left join catalog_fact_sources c on c.variant_id=v.id and c.field_name='variant_configuration'
      where v.watch_id=$1 order by v.variant_key
    `,[watch.id]),
    pool.query(`
      select sr.source_key,sr.name,sr.source_type,sr.usage_mode,sr.enabled,
             sf.last_attempt_at,sf.last_success_at,sf.next_refresh_at,sf.consecutive_failures,
             sf.last_error,sf.rows_seen,sf.rows_written
      from source_registry sr left join source_refresh_state sf on sf.source_key=sr.source_key
      where sr.source_key in (
        select distinct source_key from market_observations where watch_id=$1
        union select distinct source_key from retail_prices where watch_id=$1
        union select distinct c.source_key from catalog_fact_sources c where c.watch_id=$1
      ) order by sr.name
    `,[watch.id])
  ]);
  res.json({
    estimate:estimate.rows[0]||null,
    observations:observations.rows,
    retail:retail.rows,
    variants:variants.rows,
    sources:freshness.rows,
    provenance:{generatedAt:new Date().toISOString(),reference:req.params.reference}
  });
});

app.get('/api/project-memory', async (_req, res) => {
  if (!pool) return res.json([]);
  const { rows } = await pool.query('select key,value,updated_at from project_memory order by key');
  res.json(rows);
});

app.get('/api/system/status', async (_req,res)=>{
  if(!pool) return res.status(503).json({ok:false});
  const [catalog,prices,sources,runs,tasks,market,estimates]=await Promise.all([
    pool.query("select count(*)::int as watches,count(distinct brand_id)::int as brands from watches"),
    pool.query("select count(*)::int as snapshots,count(*) filter(where is_demo)::int as demo_snapshots,max(as_of) as latest_price_at from price_snapshots"),
    pool.query("select count(*)::int as sources,count(*) filter(where enabled)::int as enabled_sources from source_registry"),
    pool.query("select id,job_type,status,started_at,finished_at,records_seen,records_written,error from ingestion_runs order by started_at desc limit 5"),
    pool.query("select status,count(*)::int as count from agent_tasks group by status order by status"),
    pool.query("select count(*)::int as observations,count(*) filter(where is_verified)::int as verified_observations,max(observed_at) as latest_observation_at from market_observations"),
    pool.query("select count(*)::int as estimates,count(*) filter(where is_demo)::int as demo_estimates,max(as_of) as latest_estimate_at from watchvalue_estimates")
  ]);
  res.json({
    ok:true,
    catalog:catalog.rows[0],
    prices:prices.rows[0],
    sources:sources.rows[0],
    recentRuns:runs.rows,
    tasks:tasks.rows,
    market:market.rows[0],
    estimates:estimates.rows[0]
  });
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

initializeDatabase().then(()=>{
  app.listen(port,'0.0.0.0',()=>console.log(`WatchValue IL listening on ${port}`));
}).catch(error=>{
  console.error('Database initialization failed:',error);
  process.exit(1);
});
