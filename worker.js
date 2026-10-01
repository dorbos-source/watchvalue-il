import pg from 'pg';
import fs from 'fs/promises';
import { normalizeMarketplaceListing } from './market/normalize-marketplace.mjs';
import { searchEbay } from './market/adapters/ebay.mjs';
import { currentIlsRate } from './market/fx-current.mjs';

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
      "update ingestion_runs set status='success',finished_at=now(),records_seen=$2,records_written=$3,details=$4::jsonb where id=$1",
      [id,Number(details?.seen ?? details?.watches ?? details?.eligible ?? 0),Number(details?.written ?? details?.inserted ?? 0),JSON.stringify(details||{})]
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

async function syncCoreVariants(){
  return logRun('variant_sync',async()=>{
    const groups=JSON.parse(await fs.readFile(new URL('./catalog/core-variants.json',import.meta.url),'utf8'));
    let written=0;
    const client=await pool.connect();
    try{
      await client.query('begin');
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
          await client.query(`
            delete from catalog_fact_sources where variant_id=$1 and source_url=$2
          `,[variant.id,row.source_url]);
          const verifiedAt=row.verified_at||null;
          await client.query(`
            insert into catalog_fact_sources(watch_id,variant_id,field_name,source_key,source_url,source_type,verified_at,confidence,notes)
            values($1,$2,'variant_configuration',$5,$3,$4,coalesce($6::timestamptz,now()),100,'Verified against official manufacturer page')
          `,[watch.id,variant.id,row.source_url,row.source_type||'official',row.source_key||'official_catalog',verifiedAt]);
          written++;
        }
      }
      await client.query('commit');
      return {groups:groups.length,written};
    }catch(error){await client.query('rollback');throw error;}finally{client.release();}
  });
}

async function syncVerifiedObservations(){
  return logRun('verified_market_sync',async()=>{
    const rows=JSON.parse(await fs.readFile(new URL('./market/verified-observations.json',import.meta.url),'utf8'));
    await pool.query(`
      insert into source_registry(source_key,name,source_type,base_url,enabled,usage_mode,notes,last_checked_at) values
      ('phillips_auction','Phillips Auctions','auction','https://www.phillips.com',true,'public_results',
       'Public auction result pages; observations are stored with source URL and result type.',now()),
      ('christies_auction','Christie''s Auctions','auction','https://www.christies.com',true,'public_results',
       'Public completed auction results with realized prices and source URLs.',now()),
      ('convertworld_historical','Convertworld Historical FX','fx','https://www.convertworld.com',true,'historical_fx',
       'Historical FX provenance used only when explicitly captured with rate date.',now()),
      ('poundsterlinglive_historical','Pound Sterling Live Historical FX','fx','https://www.poundsterlinglive.com',true,'historical_fx',
       'Historical CHF/ILS series provenance used only with explicit rate date.',now()),
      ('valutafx_historical','ValutaFX Historical FX','fx','https://www.valutafx.com',true,'historical_fx',
       'Historical CHF/ILS series provenance used only with explicit rate date.',now()),
      ('exchange_rates_org_historical','Exchange-Rates.org Historical FX','fx','https://www.exchange-rates.org',true,'historical_fx',
       'Historical FX series provenance used only with explicit rate date.',now()),
      ('exchange_rates_uk_historical','Exchange Rates UK Historical FX','fx','https://www.exchangerates.org.uk',true,'historical_fx',
       'Historical USD/ILS series provenance used only with explicit rate date.',now()),
      ('derived_crossrate_historical','Derived Historical Cross-Rate','fx','https://www.exchangerates.org.uk',true,'historical_fx',
       'Cross-rate derived from two dated public FX series; components are preserved in observation metadata.',now())
      on conflict(source_key) do update set name=excluded.name,source_type=excluded.source_type,
        base_url=excluded.base_url,enabled=excluded.enabled,usage_mode=excluded.usage_mode,
        notes=excluded.notes,last_checked_at=now()
    `);
    let written=0;
    for(const row of rows){
      const {rows:[watch]}=await pool.query('select id from watches where lower(reference)=lower($1)',[row.reference]);
      if(!watch) continue;
      await pool.query(`
        insert into market_observations(
          watch_id,source_key,source_observation_id,source_url,observation_type,price,currency,price_ils,
          condition,year,full_set,country,seller_type,observed_at,is_verified,metadata,
          fx_rate,fx_rate_date,fx_source_key
        ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'auction_house',$13,$14,$15::jsonb,$16,$17,$18)
        on conflict(source_key,source_observation_id) where source_observation_id is not null do update set
          source_url=excluded.source_url,observation_type=excluded.observation_type,price=excluded.price,
          currency=excluded.currency,price_ils=excluded.price_ils,condition=excluded.condition,year=excluded.year,
          full_set=excluded.full_set,country=excluded.country,observed_at=excluded.observed_at,
          is_verified=excluded.is_verified,metadata=excluded.metadata,fx_rate=excluded.fx_rate,
          fx_rate_date=excluded.fx_rate_date,fx_source_key=excluded.fx_source_key,captured_at=now()
      `,[watch.id,row.source_key,row.source_observation_id,row.source_url,row.observation_type,row.price,row.currency,
          row.price_ils||null,row.condition||null,row.year||null,row.full_set??null,row.country||null,row.observed_at,
          !!row.is_verified,JSON.stringify({import:'verified-public-seed',fx_source_url:row.fx_source_url||null,fx_components:row.fx_components||null}),
          row.fx_rate||null,row.fx_rate_date||null,row.fx_source_key||null]);
      written++;
    }
    return {seen:rows.length,written};
  });
}


async function syncVerifiedRetailPrices(){
  return logRun('verified_retail_sync',async()=>{
    const rows=JSON.parse(await fs.readFile(new URL('./market/verified-retail-prices.json',import.meta.url),'utf8'));
    let written=0;
    const client=await pool.connect();
    try{
      await client.query('begin');
      for(const row of rows){
        const {rows:[watch]}=await client.query('select id from watches where lower(reference)=lower($1)',[row.reference]);
        if(!watch) continue;
        const {rows:[variant]}=await client.query(
          'select id from watch_variants where watch_id=$1 and lower(variant_key)=lower($2) limit 1',
          [watch.id,row.variant_key]
        );
        await client.query(`
          delete from retail_prices
          where watch_id=$1
            and (($2::bigint is null and variant_id is null) or variant_id=$2)
            and source_key=$3 and source_url=$4 and currency=$5
            and market_country is not distinct from $6
            and effective_at=$7::timestamptz
        `,[watch.id,variant?.id||null,row.source_key,row.source_url,row.currency,row.market_country||null,row.effective_at]);
        await client.query(`
          insert into retail_prices(
            watch_id,variant_id,source_key,source_url,price,currency,market_country,
            includes_tax,effective_at,captured_at,is_official,metadata
          ) values($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,now(),$10,$11::jsonb)
        `,[
          watch.id,variant?.id||null,row.source_key,row.source_url,row.price,row.currency,
          row.market_country||null,row.includes_tax??null,row.effective_at,!!row.is_official,
          JSON.stringify({...row.metadata,variant_key:row.variant_key,curated_provenance:true})
        ]);
        written++;
      }
      await client.query('commit');
      return {seen:rows.length,written};
    }catch(error){
      await client.query('rollback');
      throw error;
    }finally{
      client.release();
    }
  });
}

async function calculateWatchValueEstimates(){
  return logRun('watchvalue_estimate',async()=>{
    const {rows:watches}=await pool.query("select distinct watch_id from market_observations where is_verified=true and price_ils>0 and (currency='ILS' or (fx_rate is not null and fx_source_key is not null))");
    let written=0,skipped=0;
    for(const item of watches){
      const {rows}=await pool.query("select price_ils,source_key from market_observations where watch_id=$1 and is_verified=true and price_ils>0 and (currency='ILS' or (fx_rate is not null and fx_source_key is not null)) order by price_ils",[item.watch_id]);
      const sources=new Set(rows.map(x=>x.source_key).filter(Boolean)).size;
      if(rows.length<3 || sources<2){skipped++;continue;}
      const v=rows.map(x=>Number(x.price_ils)).sort((a,b)=>a-b);
      const median=v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;
      const d=v.map(x=>Math.abs(x-median)).sort((a,b)=>a-b);
      const mad=d.length%2?d[(d.length-1)/2]:(d[d.length/2-1]+d[d.length/2])/2;
      const cleanRows=mad===0?rows:rows.filter(x=>Math.abs(Number(x.price_ils)-median)<=3*mad);
      const clean=cleanRows.map(x=>Number(x.price_ils)).sort((a,b)=>a-b);
      const cleanSources=new Set(cleanRows.map(x=>x.source_key).filter(Boolean)).size;
      if(clean.length<3 || cleanSources<2){skipped++;continue;}
      const value=clean.length%2?clean[(clean.length-1)/2]:(clean[clean.length/2-1]+clean[clean.length/2])/2;
      const low=clean[Math.floor((clean.length-1)*0.25)];
      const high=clean[Math.floor((clean.length-1)*0.75)];
      const confidence=Math.min(95,35+Math.min(clean.length,20)*2+Math.min(cleanSources,5)*8);
      await pool.query("insert into watchvalue_estimates(watch_id,market_value_ils,low_ils,high_ils,confidence,observation_count,source_count,methodology_version,is_demo,details) values($1,$2,$3,$4,$5,$6,$7,'wv-median-mad-v1',false,$8::jsonb)",[item.watch_id,Math.round(value),Math.round(low),Math.round(high),confidence,clean.length,cleanSources,JSON.stringify({verifiedOnly:true,outlierRule:'3x MAD',minimumObservations:3,minimumSources:2,thresholdAppliedAfterOutlierFiltering:true})]);
      written++;
    }
    return {eligible:watches.length,written,skipped};
  });
}


async function syncMarketplaceSourceRegistry(){
  await pool.query(`
    insert into source_registry(source_key,name,source_type,base_url,enabled,usage_mode,notes,last_checked_at) values
    ('ebay_market','eBay','marketplace','https://www.ebay.com',true,'official_api',
     'Official eBay Buy Browse API. Listings are accepted only with strict reference + variant + year + bracelet identity.',now()),
    ('chrono24_market','Chrono24','marketplace','https://www.chrono24.com',false,'research_only',
     'Large asking-price marketplace. Disabled for automated ingestion until an approved access method is configured.',now()),
    ('watchfinder_market','Watchfinder','dealer','https://www.watchfinder.com',false,'research_only',
     'Dealer inventory used for cross-check research; automated ingestion disabled until access policy is approved.',now()),
    ('bobs_market','Bob''s Watches','dealer','https://www.bobswatches.com',false,'research_only',
     'Dealer and historical transaction research source; automated ingestion disabled until access policy is approved.',now())
    on conflict(source_key) do update set name=excluded.name,source_type=excluded.source_type,
      base_url=excluded.base_url,usage_mode=excluded.usage_mode,notes=excluded.notes,last_checked_at=now()
  `);
  return {written:4};
}


async function syncVerifiedMarketplaceSeed(){
  return logRun('verified_marketplace_seed',async()=>{
    const rules=JSON.parse(await fs.readFile(new URL('./market/variant-rules.json',import.meta.url),'utf8'));
    const rows=JSON.parse(await fs.readFile(new URL('./market/verified-marketplace-listings.json',import.meta.url),'utf8'));
    let seen=0,written=0,rejected=0;
    for(const raw of rows){
      seen++;
      const normalized=normalizeMarketplaceListing(raw,rules);
      if(!normalized.accepted){rejected++;continue;}
      const l=normalized.listing;
      const {rows:[watch]}=await pool.query('select id from watches where lower(reference)=lower($1) limit 1',[l.reference]);
      if(!watch){rejected++;continue;}
      const {rows:[variant]}=await pool.query('select id from watch_variants where watch_id=$1 and lower(variant_key)=lower($2) limit 1',[watch.id,l.variant_key]);
      if(!variant){rejected++;continue;}
      const fx=await currentIlsRate(l.currency);
      const priceIls=Math.round(Number(l.asking_price)*fx.rate*100)/100;
      await pool.query(`
        insert into marketplace_listings(
          watch_id,variant_id,source_key,source_listing_id,source_url,title,asking_price,currency,price_ils,
          year,bracelet,condition,full_set,country,seller_type,captured_at,is_active,metadata
        ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now(),true,$16::jsonb)
        on conflict(source_key,source_listing_id) where source_listing_id is not null do update set
          watch_id=excluded.watch_id,variant_id=excluded.variant_id,source_url=excluded.source_url,title=excluded.title,
          asking_price=excluded.asking_price,currency=excluded.currency,price_ils=excluded.price_ils,
          year=excluded.year,bracelet=excluded.bracelet,condition=excluded.condition,full_set=excluded.full_set,
          country=excluded.country,seller_type=excluded.seller_type,captured_at=now(),is_active=true,metadata=excluded.metadata
      `,[watch.id,variant.id,l.source_key,l.source_listing_id,l.source_url,l.title,l.asking_price,l.currency,priceIls,
          l.year,l.bracelet,l.condition||null,l.full_set??null,l.country||null,l.seller_type||null,
          JSON.stringify({...l.metadata,verified_public_seed:true,verified_at:raw.verified_at||null,fx})]);
      written++;
    }
    return {seen,written,rejected};
  });
}

async function ingestEbayMarketplace(){
  return logRun('ebay_marketplace_ingest',async()=>{
    const rules=JSON.parse(await fs.readFile(new URL('./market/variant-rules.json',import.meta.url),'utf8'));
    const refs=Object.values(rules).filter(Array.isArray).flat().map(x=>x.reference).filter(Boolean);
    let seen=0,written=0,rejected=0;
    for(const reference of refs){
      const result=await searchEbay({
        clientId:process.env.EBAY_CLIENT_ID,
        clientSecret:process.env.EBAY_CLIENT_SECRET,
        reference,
        limit:Number(process.env.EBAY_SEARCH_LIMIT||200)
      });
      if(!result.enabled) return {seen,written,rejected,skipped:true,reason:result.reason};
      for(const raw of result.items){
        seen++;
        const normalized=normalizeMarketplaceListing({...raw,reference},rules);
        if(!normalized.accepted){
          rejected++;
          await pool.query(`
            insert into marketplace_quarantine(source_key,source_listing_id,source_url,reference,title,reasons,payload,last_seen_at)
            values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,now())
            on conflict(source_key,source_listing_id) where source_listing_id is not null
            do update set source_url=excluded.source_url,reference=excluded.reference,title=excluded.title,
              reasons=excluded.reasons,payload=excluded.payload,last_seen_at=now()
          `,[raw.source_key,raw.source_listing_id,raw.source_url||null,reference,raw.title||null,
              JSON.stringify(normalized.reasons),JSON.stringify(raw)]);
          continue;
        }
        const l=normalized.listing;
        const {rows:[watch]}=await pool.query('select id from watches where lower(reference)=lower($1) limit 1',[l.reference]);
        if(!watch){rejected++;continue;}
        const {rows:[variant]}=await pool.query(
          'select id from watch_variants where watch_id=$1 and lower(variant_key)=lower($2) limit 1',
          [watch.id,l.variant_key]
        );
        if(!variant){rejected++;continue;}
        let priceIls=null,fxMeta=null;
        try{
          const fx=await currentIlsRate(l.currency);
          priceIls=Math.round(Number(l.asking_price)*fx.rate*100)/100;
          fxMeta=fx;
        }catch(error){
          rejected++;
          await pool.query(`
            insert into marketplace_quarantine(source_key,source_listing_id,source_url,reference,title,reasons,payload,last_seen_at)
            values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,now())
            on conflict(source_key,source_listing_id) where source_listing_id is not null
            do update set reasons=excluded.reasons,payload=excluded.payload,last_seen_at=now()
          `,[l.source_key,l.source_listing_id,l.source_url,l.reference,l.title,
              JSON.stringify(['fx_unavailable']),JSON.stringify({...raw,fx_error:String(error?.message||error)})]);
          continue;
        }
        await pool.query(`
          insert into marketplace_listings(
            watch_id,variant_id,source_key,source_listing_id,source_url,title,asking_price,currency,price_ils,
            year,bracelet,condition,full_set,country,seller_type,captured_at,is_active,metadata
          ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now(),true,$16::jsonb)
          on conflict(source_key,source_listing_id) where source_listing_id is not null do update set
            watch_id=excluded.watch_id,variant_id=excluded.variant_id,source_url=excluded.source_url,title=excluded.title,
            asking_price=excluded.asking_price,currency=excluded.currency,price_ils=excluded.price_ils,
            year=excluded.year,bracelet=excluded.bracelet,condition=excluded.condition,country=excluded.country,
            seller_type=excluded.seller_type,captured_at=now(),is_active=true,metadata=excluded.metadata
        `,[watch.id,variant.id,l.source_key,l.source_listing_id,l.source_url,l.title,l.asking_price,l.currency,priceIls,
            l.year,l.bracelet,l.condition||null,l.full_set??null,l.country||null,l.seller_type||null,
            JSON.stringify({...l.metadata,fx:fxMeta,identity:{reference:l.reference,variant_key:l.variant_key,year:l.year,bracelet:l.bracelet}})]);
        written++;
      }
    }
    return {seen,written,rejected,references:refs.length};
  });
}

async function calculateYearlyMarketplacePrices(){
  return logRun('yearly_marketplace_price',async()=>{
    const {rows:groups}=await pool.query(`
      select watch_id,variant_id,year,
             count(*)::int as listing_count,
             count(distinct source_key)::int as source_count
      from marketplace_listings
      where is_active=true and price_ils>0 and year is not null and variant_id is not null
      group by watch_id,variant_id,year
    `);
    let written=0,skipped=0;
    for(const g of groups){
      const {rows}=await pool.query(`
        select price_ils,source_key from marketplace_listings
        where watch_id=$1 and variant_id=$2 and year=$3 and is_active=true and price_ils>0
        order by price_ils
      `,[g.watch_id,g.variant_id,g.year]);
      const sources=new Set(rows.map(r=>r.source_key).filter(Boolean)).size;
      if(rows.length<3 || sources<2){skipped++;continue;}
      const values=rows.map(r=>Number(r.price_ils)).sort((a,b)=>a-b);
      const median=values.length%2?values[(values.length-1)/2]:(values[values.length/2-1]+values[values.length/2])/2;
      const q1=values[Math.floor((values.length-1)*0.25)];
      const q3=values[Math.floor((values.length-1)*0.75)];
      const iqr=q3-q1;
      const clean=values.filter(v=>v>=q1-1.5*iqr && v<=q3+1.5*iqr);
      if(clean.length<3){skipped++;continue;}
      const value=clean.length%2?clean[(clean.length-1)/2]:(clean[clean.length/2-1]+clean[clean.length/2])/2;
      const low=clean[0],high=clean[clean.length-1];
      await pool.query(`
        insert into yearly_market_prices(watch_id,variant_id,year,market_price_ils,low_ils,high_ils,listing_count,source_count,methodology_version,details)
        values($1,$2,$3,$4,$5,$6,$7,$8,'marketplace-median-v1',$9::jsonb)
      `,[g.watch_id,g.variant_id,g.year,Math.round(value),Math.round(low),Math.round(high),clean.length,sources,
          JSON.stringify({requiredIdentity:['reference','variant_key','year','bracelet'],outlierRule:'1.5x IQR',sourceMinimum:2,listingMinimum:3})]);
      written++;
    }
    return {seen:groups.length,written,skipped};
  });
}

async function processQueue(){
  let processed=0;
  let ranQualityScan=false;
  while(processed<10){
    const client=await pool.connect();
    let task;
    try{
      await client.query('begin');
      const {rows}=await client.query(`
        select id,task_type,payload from agent_tasks
        where status='queued' and run_after<=now()
        order by created_at asc
        limit 1
        for update skip locked
      `);
      if(!rows.length){
        await client.query('commit');
        break;
      }
      task=rows[0];
      await client.query("update agent_tasks set status='running',attempts=attempts+1,updated_at=now() where id=$1",[task.id]);
      await client.query('commit');
    }catch(error){
      try{await client.query('rollback');}catch{}
      throw error;
    }finally{
      client.release();
    }

    try{
      if(task.task_type==='catalog_quality_scan'){
        await catalogQualityScan();
        ranQualityScan=true;
      }else if(task.task_type==='source_terms_review'){
        await pool.query("update project_memory set value=$2::jsonb,updated_at=now() where key=$1",['source_review_state',JSON.stringify({status:'pending_human_or_agent_review',updatedAt:new Date().toISOString()})])
          .then(async r=>{if(!r.rowCount) await pool.query("insert into project_memory(key,value) values($1,$2::jsonb)",['source_review_state',JSON.stringify({status:'pending_human_or_agent_review',updatedAt:new Date().toISOString()})]);});
      }
      await pool.query("update agent_tasks set status='done',last_error=null,updated_at=now() where id=$1",[task.id]);
    }catch(error){
      await pool.query("update agent_tasks set status='failed',last_error=$2,updated_at=now() where id=$1",[task.id,String(error?.stack||error)]);
    }
    processed++;
  }
  return {processed,ranQualityScan};
}

async function recoverStaleTasks(){
  const {rowCount}=await pool.query(`
    update agent_tasks
    set status='queued',last_error='Recovered stale running task',updated_at=now(),run_after=now()
    where status='running' and updated_at < now()-interval '2 hours' and attempts < 5
  `);
  return {recovered:rowCount};
}

async function sourceFreshnessHeartbeat(sourceKey,fn){
  const started=new Date();
  await pool.query(`
    insert into source_refresh_state(source_key,last_attempt_at,consecutive_failures)
    values($1,now(),0)
    on conflict(source_key) do update set last_attempt_at=now()
  `,[sourceKey]);
  try{
    const result=await fn();
    await pool.query(`
      update source_refresh_state set last_success_at=now(),consecutive_failures=0,last_error=null,
        rows_seen=$2,rows_written=$3,next_refresh_at=now()+interval '6 hours'
      where source_key=$1
    `,[sourceKey,Number(result?.seen||0),Number(result?.written||0)]);
    return result;
  }catch(error){
    await pool.query(`
      update source_refresh_state set consecutive_failures=consecutive_failures+1,last_error=$2,
        next_refresh_at=now()+interval '6 hours' where source_key=$1
    `,[sourceKey,String(error?.message||error)]);
    throw error;
  }
}

async function enqueueAgentPipeline(){
  const jobs=[
    ['catalog_quality_scan',{scope:'phase1',brands:['Rolex','Cartier']}],
    ['source_terms_review',{sources:['rolex_official','cartier_official','padani_cartier_il','chrono24_market','phillips_auction','boi_fx']}]
  ];
  let queued=0;
  for(const [taskType,payload] of jobs){
    const {rowCount}=await pool.query(`
      insert into agent_tasks(task_type,payload,status,run_after)
      select $1,$2::jsonb,'queued',now()
      where not exists(
        select 1 from agent_tasks where task_type=$1 and status in ('queued','running') and created_at>now()-interval '12 hours'
      )
    `,[taskType,JSON.stringify(payload)]);
    queued+=rowCount;
  }
  return {queued};
}

async function main(){
  console.log('WatchValue worker starting');
  await recoverStaleTasks();
  await enqueueAgentPipeline();
  await syncCoreCatalog();
  await syncCoreVariants();
  await syncMarketplaceSourceRegistry();
  await sourceFreshnessHeartbeat('phillips_auction',syncVerifiedObservations);
  await syncVerifiedMarketplaceSeed();
  await sourceFreshnessHeartbeat('ebay_market',ingestEbayMarketplace);
  await syncVerifiedRetailPrices();
  await calculateWatchValueEstimates();
  await calculateYearlyMarketplacePrices();
  const queue=await processQueue();
  if(!queue.ranQualityScan) await catalogQualityScan();
  console.log('WatchValue worker completed', queue);
  await pool.end();
}

main().catch(async error=>{
  console.error(error);
  try{await pool.end();}catch{}
  process.exit(1);
});
