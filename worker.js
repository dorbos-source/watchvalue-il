import pg from 'pg';
import fs from 'fs/promises';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function logRun(jobType, fn) {
  const { rows } = await pool.query(
    "insert into ingestion_runs(job_type,status) values($1,'running') returning id",
    [jobType]
  );
  const id=rows[0].id;
  try{
    const details=await fn();
    await pool.query(
      "update ingestion_runs set status='success',finished_at=now(),details=$2::jsonb where id=$1",
      [id,JSON.stringify(details||{})]
    );
    return details;
  }catch(error){
    await pool.query(
      "update ingestion_runs set status='failed',finished_at=now(),error=$2 where id=$1",
      [id,String(error?.stack||error)]
    );
    throw error;
  }
}

async function catalogQualityScan(){
  return logRun('catalog_quality_scan',async()=>{
    const {rows:[summary]}=await pool.query(`
      select
        count(*)::int as watches,
        count(*) filter(where collection is null or collection='')::int as missing_collection,
        count(*) filter(where material is null or material='')::int as missing_material,
        count(*) filter(where dial is null or dial='')::int as missing_dial
      from watches
    `);
    const {rows:[prices]}=await pool.query(`
      select
        count(*)::int as price_rows,
        count(*) filter(where market_value_ils is null or market_value_ils<=0)::int as invalid_market,
        count(*) filter(where is_demo)::int as demo_rows
      from price_snapshots
    `);
    await pool.query(
      "update project_memory set value=$2::jsonb,updated_at=now() where key=$1",
      ['last_quality_scan',JSON.stringify({at:new Date().toISOString(),...summary,...prices})]
    ).then(async r=>{
      if(!r.rowCount) await pool.query("insert into project_memory(key,value) values($1,$2::jsonb)",['last_quality_scan',JSON.stringify({at:new Date().toISOString(),...summary,...prices})]);
    });
    return {...summary,...prices};
  });
}

async function syncCoreCatalog(){
  return logRun('catalog_sync',async()=>{
    const rows=JSON.parse(await fs.readFile(new URL('./catalog/core-references.json',import.meta.url),'utf8'));
    let inserted=0,updated=0;
    const client=await pool.connect();
    try{
      await client.query('begin');
      for(const row of rows){
        const slug=row.brand.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
        const {rows:[brand]}=await client.query(
          `insert into brands(slug,name) values($1,$2)
           on conflict(name) do update set name=excluded.name returning id`,[slug,row.brand]
        );
        const exists=await client.query('select id from watches where lower(reference)=lower($1)',[row.reference]);
        await client.query(`
          insert into watches(
            brand_id,collection,model,official_model_name,nickname,generation,bracelet,bezel,variant_key,
            reference,status,production_start,production_end,case_size_mm,material,dial,updated_at
          )
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now())
          on conflict(reference) do update set
            brand_id=excluded.brand_id,collection=excluded.collection,model=excluded.model,
            official_model_name=excluded.official_model_name,nickname=excluded.nickname,generation=excluded.generation,
            bracelet=excluded.bracelet,bezel=excluded.bezel,variant_key=excluded.variant_key,status=excluded.status,
            production_start=excluded.production_start,production_end=excluded.production_end,case_size_mm=excluded.case_size_mm,
            material=excluded.material,dial=excluded.dial,updated_at=now()
        `,[
          brand.id,row.collection||null,row.model,row.official_model_name||row.collection||row.model,row.nickname||null,
          row.generation||null,row.bracelet||null,row.bezel||null,row.variant_key||row.reference,row.reference,
          String(row.status||'current').toLowerCase().includes('dis')?'discontinued':
          String(row.status||'current').toLowerCase().includes('limit')?'limited':'current',
          row.production_start||null,row.production_end||null,row.case_size_mm||null,row.material||null,row.dial||null
        ]);
        exists.rowCount?updated++:inserted++;
      }
      await client.query('commit');
      return {seen:rows.length,inserted,updated};
    }catch(error){
      await client.query('rollback');
      throw error;
    }finally{
      client.release();
    }
  });
}

async function processQueue(){
  const {rows}=await pool.query(`
    select id,task_type,payload from agent_tasks
    where status='queued' and run_after<=now()
    order by created_at asc
    limit 10
    for update skip locked
  `);
  for(const task of rows){
    await pool.query("update agent_tasks set status='running',attempts=attempts+1,updated_at=now() where id=$1",[task.id]);
    try{
      if(task.task_type==='catalog_quality_scan') await catalogQualityScan();
      else if(task.task_type==='source_terms_review'){
        await pool.query("update project_memory set value=$2::jsonb,updated_at=now() where key=$1",['source_review_state',JSON.stringify({status:'pending_human_or_agent_review',updatedAt:new Date().toISOString()})])
          .then(async r=>{if(!r.rowCount) await pool.query("insert into project_memory(key,value) values($1,$2::jsonb)",['source_review_state',JSON.stringify({status:'pending_human_or_agent_review',updatedAt:new Date().toISOString()})]);});
      }
      await pool.query("update agent_tasks set status='done',updated_at=now() where id=$1",[task.id]);
    }catch(error){
      await pool.query("update agent_tasks set status='failed',last_error=$2,updated_at=now() where id=$1",[task.id,String(error?.stack||error)]);
    }
  }
  return rows.length;
}

async function main(){
  console.log('WatchValue worker starting');
  await syncCoreCatalog();
  const processed=await processQueue();
  await catalogQualityScan();
  console.log('WatchValue worker completed', {processed});
  await pool.end();
}

main().catch(async error=>{
  console.error(error);
  try{await pool.end();}catch{}
  process.exit(1);
});
