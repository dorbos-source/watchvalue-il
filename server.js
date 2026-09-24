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
    select w.id,w.reference,w.model,w.collection,w.status,w.production_start,w.production_end,
           w.case_size_mm,w.material,w.dial,w.movement,w.image_url,b.name as brand,
           p.market_value_ils,p.retail_price_ils,p.dealer_buy_ils,p.dealer_ask_ils,p.private_sale_ils,
           p.change_12m,p.liquidity_score,p.liquidity_label,p.confidence,p.listing_count,p.source_count,
           p.is_demo,p.as_of
    from watches w
    join brands b on b.id=w.brand_id
    left join lateral (
      select * from price_snapshots ps where ps.watch_id=w.id order by as_of desc limit 1
    ) p on true
    where ($1='' or w.reference ilike '%'||$1||'%' or w.model ilike '%'||$1||'%' or
           w.collection ilike '%'||$1||'%' or b.name ilike '%'||$1||'%')
    order by coalesce(p.liquidity_score,0) desc,b.name,w.collection,w.reference
    limit 500
  `,[q]);
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

app.get('/api/project-memory', async (_req, res) => {
  if (!pool) return res.json([]);
  const { rows } = await pool.query('select key,value,updated_at from project_memory order by key');
  res.json(rows);
});

app.get('/api/system/status', async (_req,res)=>{
  if(!pool) return res.status(503).json({ok:false});
  const [catalog,prices,sources,runs,tasks]=await Promise.all([
    pool.query("select count(*)::int as watches,count(distinct brand_id)::int as brands from watches"),
    pool.query("select count(*)::int as snapshots,count(*) filter(where is_demo)::int as demo_snapshots,max(as_of) as latest_price_at from price_snapshots"),
    pool.query("select count(*)::int as sources,count(*) filter(where enabled)::int as enabled_sources from source_registry"),
    pool.query("select id,job_type,status,started_at,finished_at,records_seen,records_written,error from ingestion_runs order by started_at desc limit 5"),
    pool.query("select status,count(*)::int as count from agent_tasks group by status order by status")
  ]);
  res.json({
    ok:true,
    catalog:catalog.rows[0],
    prices:prices.rows[0],
    sources:sources.rows[0],
    recentRuns:runs.rows,
    tasks:tasks.rows
  });
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

initializeDatabase().then(()=>{
  app.listen(port,'0.0.0.0',()=>console.log(`WatchValue IL listening on ${port}`));
}).catch(error=>{
  console.error('Database initialization failed:',error);
  process.exit(1);
});
