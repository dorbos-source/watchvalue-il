import pg from 'pg';
import fs from 'fs/promises';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function normalizeStatus(v='current'){
  const x=String(v).toLowerCase();
  if(x.includes('dis')) return 'discontinued';
  if(x.includes('limit')) return 'limited';
  return 'current';
}

async function upsertBrand(client,name){
  const slug=name.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const {rows}=await client.query(
    `insert into brands(slug,name) values($1,$2)
     on conflict(name) do update set name=excluded.name
     returning id`,[slug,name]
  );
  return rows[0].id;
}

async function importRows(rows){
  const client=await pool.connect();
  const report={seen:rows.length,inserted:0,updated:0,errors:[]};
  try{
    await client.query('begin');
    for(const row of rows){
      try{
        if(!row.brand||!row.reference||!row.model) throw new Error('brand/reference/model required');
        const brandId=await upsertBrand(client,row.brand);
        const existing=await client.query('select id from watches where lower(reference)=lower($1)',[row.reference]);
        await client.query(`
          insert into watches(
            brand_id,collection,model,reference,status,production_start,production_end,
            case_size_mm,material,dial,movement,limited_quantity,image_url,updated_at
          ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())
          on conflict(reference) do update set
            brand_id=excluded.brand_id,collection=excluded.collection,model=excluded.model,
            status=excluded.status,production_start=excluded.production_start,production_end=excluded.production_end,
            case_size_mm=excluded.case_size_mm,material=excluded.material,dial=excluded.dial,
            movement=excluded.movement,limited_quantity=excluded.limited_quantity,
            image_url=coalesce(excluded.image_url,watches.image_url),updated_at=now()
        `,[
          brandId,row.collection||null,row.model,row.reference,normalizeStatus(row.status),
          row.production_start||null,row.production_end||null,row.case_size_mm||null,
          row.material||null,row.dial||null,row.movement||null,row.limited_quantity||null,row.image_url||null
        ]);
        existing.rowCount ? report.updated++ : report.inserted++;
      }catch(error){
        report.errors.push({reference:row.reference||null,error:error.message});
      }
    }
    await client.query('commit');
    return report;
  }catch(error){
    await client.query('rollback');
    throw error;
  }finally{
    client.release();
  }
}

const file=process.argv[2];
if(!file){
  console.error('Usage: node catalog/import-catalog.js <json-file>');
  process.exit(2);
}
const rows=JSON.parse(await fs.readFile(file,'utf8'));
const report=await importRows(rows);
console.log(JSON.stringify(report,null,2));
await pool.end();
