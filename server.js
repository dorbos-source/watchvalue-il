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
app.use(express.static(__dirname));

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
    from brands b
    left join watches w on w.brand_id = b.id
    group by b.id
    order by b.name
  `);
  res.json(rows);
});

app.get('/api/watches', async (req, res) => {
  if (!pool) return res.json([]);
  const q = String(req.query.q || '').trim();
  const { rows } = await pool.query(`
    select w.id, w.reference, w.model, w.collection, w.status,
           w.production_start, w.production_end,
           b.name as brand,
           p.market_value_usd, p.retail_price_usd, p.currency, p.as_of
    from watches w
    join brands b on b.id = w.brand_id
    left join lateral (
      select market_value_usd, retail_price_usd, currency, as_of
      from price_snapshots ps
      where ps.watch_id = w.id
      order by as_of desc
      limit 1
    ) p on true
    where ($1 = '' or w.reference ilike '%' || $1 || '%' or w.model ilike '%' || $1 || '%' or b.name ilike '%' || $1 || '%')
    order by b.name, w.collection, w.reference
    limit 100
  `, [q]);
  res.json(rows);
});

app.get('/api/project-memory', async (_req, res) => {
  if (!pool) return res.json([]);
  const { rows } = await pool.query('select key, value, updated_at from project_memory order by key');
  res.json(rows);
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

initializeDatabase()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`WatchValue IL listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
