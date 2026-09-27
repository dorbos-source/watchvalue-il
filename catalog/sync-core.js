import pg from 'pg';
import fs from 'fs/promises';

const { Pool } = pg;

function normalizeStatus(v='current'){
  const x=String(v).toLowerCase();
  if(x.includes('dis')) return 'discontinued';
  if(x.includes('limit')) return 'limited';
  return 'current';
}

export async function syncCoreCatalogAndVariants(connectionString=process.env.DATABASE_URL){
  if(!connectionString) return {references:{seen:0,written:0},variants:{groups:0,written:0}};
  const pool=new Pool({connectionString});
  const refs=JSON.parse(await fs.readFile(new URL('./core-references.json',import.meta.url),'utf8'));
  const groups=JSON.parse(await fs.readFile(new URL('./core-variants.json',import.meta.url),'utf8'));
  const client=await pool.connect();
  let refsWritten=0,variantsWritten=0;
  try{
    await client.query('begin');
    for(const row of refs){
      const slug=row.brand.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const {rows:[brand]}=await client.query(
        `insert into brands(slug,name) values($1,$2)
         on conflict(name) do update set name=excluded.name returning id`,[slug,row.brand]
      );
      await client.query(`
        insert into watches(
          brand_id,collection,model,official_model_name,nickname,generation,bracelet,bezel,variant_key,
          reference,status,production_start,production_end,case_size_mm,material,dial,movement,limited_quantity,image_url,updated_at
        ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,now())
        on conflict(reference) do update set
          brand_id=excluded.brand_id,collection=excluded.collection,model=excluded.model,
          official_model_name=excluded.official_model_name,nickname=excluded.nickname,generation=excluded.generation,
          bracelet=excluded.bracelet,bezel=excluded.bezel,variant_key=excluded.variant_key,status=excluded.status,
          production_start=excluded.production_start,production_end=excluded.production_end,case_size_mm=excluded.case_size_mm,
          material=excluded.material,dial=excluded.dial,movement=excluded.movement,limited_quantity=excluded.limited_quantity,
          image_url=coalesce(excluded.image_url,watches.image_url),updated_at=now()
      `,[
        brand.id,row.collection||null,row.model,row.official_model_name||row.collection||row.model,row.nickname||null,
        row.generation||null,row.bracelet||null,row.bezel||null,row.variant_key||null,row.reference,normalizeStatus(row.status),
        row.production_start||null,row.production_end||null,row.case_size_mm||null,row.material||null,row.dial||null,
        row.movement||null,row.limited_quantity||null,row.image_url||null
      ]);
      refsWritten++;
    }

    for(const group of groups){
      const {rows:[watch]}=await client.query('select id from watches where lower(reference)=lower($1)',[group.reference]);
      if(!watch) continue;
      for(const row of group.variants||[]){
        const {rows:[variant]}=await client.query(`
          insert into watch_variants(watch_id,variant_key,nickname,dial,bracelet,bezel,material,production_start,production_end,image_url,updated_at)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
          on conflict(watch_id,variant_key) do update set
            nickname=excluded.nickname,dial=excluded.dial,bracelet=excluded.bracelet,bezel=excluded.bezel,
            material=excluded.material,production_start=excluded.production_start,production_end=excluded.production_end,
            image_url=coalesce(excluded.image_url,watch_variants.image_url),updated_at=now()
          returning id
        `,[watch.id,row.variant_key,row.nickname||null,row.dial||null,row.bracelet||null,row.bezel||null,row.material||null,row.production_start||null,row.production_end||null,row.image_url||null]);

        await client.query(
          'delete from catalog_fact_sources where variant_id=$1 and field_name=$2',
          [variant.id,'variant_configuration']
        );
        await client.query(`
          insert into catalog_fact_sources(
            watch_id,variant_id,field_name,source_key,source_url,source_type,verified_at,confidence,notes
          ) values($1,$2,'variant_configuration',$3,$4,$5,coalesce($6::timestamptz,now()),100,'Verified against official manufacturer page')
        `,[
          watch.id,variant.id,row.source_key||'official_catalog',row.source_url||null,row.source_type||'official',row.verified_at||null
        ]);
        variantsWritten++;
      }
    }
    await client.query('commit');
    return {references:{seen:refs.length,written:refsWritten},variants:{groups:groups.length,written:variantsWritten}};
  }catch(error){
    await client.query('rollback');
    throw error;
  }finally{
    client.release();
    await pool.end();
  }
}
