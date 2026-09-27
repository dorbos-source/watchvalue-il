import fs from 'node:fs';

const refsPath='catalog/core-references.json';
const varsPath='catalog/core-variants.json';
const retailPath='market/verified-retail-prices.json';

const refs=JSON.parse(fs.readFileSync(refsPath,'utf8'));
const groups=JSON.parse(fs.readFileSync(varsPath,'utf8'));
const retail=JSON.parse(fs.readFileSync(retailPath,'utf8'));

const errors=[];
const warnings=[];

const refKeys=new Set();
for(const [i,row] of refs.entries()){
  const ref=String(row.reference||'').trim();
  if(!ref) errors.push(`${refsPath}[${i}] missing reference`);
  const key=ref.toLowerCase();
  if(key && refKeys.has(key)) errors.push(`Duplicate reference: ${ref}`);
  if(key) refKeys.add(key);
  if(!row.brand) errors.push(`${ref||i}: missing brand`);
  if(!row.model) errors.push(`${ref||i}: missing model`);
  if(!row.status) warnings.push(`${ref||i}: missing status`);
  if(row.status==='current' && row.production_end) warnings.push(`${ref}: current with production_end`);
}

const variantKeys=new Set();
for(const [gi,group] of groups.entries()){
  const ref=String(group.reference||'').trim();
  if(!ref) errors.push(`${varsPath}[${gi}] missing group reference`);
  if(ref && !refKeys.has(ref.toLowerCase())) errors.push(`Variant group references unknown watch: ${ref}`);
  for(const [vi,v] of (group.variants||[]).entries()){
    const vk=String(v.variant_key||'').trim();
    if(!vk) errors.push(`${ref} variant[${vi}] missing variant_key`);
    const unique=`${ref.toLowerCase()}::${vk.toLowerCase()}`;
    if(vk && variantKeys.has(unique)) errors.push(`Duplicate variant_key for ${ref}: ${vk}`);
    if(vk) variantKeys.add(unique);

    if(!v.source_url) errors.push(`${ref}/${vk}: missing source_url`);
    else {
      try{
        const u=new URL(v.source_url);
        if(!['https:','http:'].includes(u.protocol)) errors.push(`${ref}/${vk}: invalid source_url protocol`);
      }catch{ errors.push(`${ref}/${vk}: invalid source_url`); }
    }
    if(!v.source_type) errors.push(`${ref}/${vk}: missing source_type`);
    if(!v.source_key) errors.push(`${ref}/${vk}: missing source_key`);
    if(v.verified_at && Number.isNaN(Date.parse(v.verified_at))) errors.push(`${ref}/${vk}: invalid verified_at`);
  }
}

for(const [i,row] of retail.entries()){
  const prefix=`${retailPath}[${i}]`;
  const ref=String(row.reference||'').trim();
  const vk=String(row.variant_key||'').trim();
  if(!ref || !refKeys.has(ref.toLowerCase())) errors.push(`${prefix}: unknown/missing reference ${ref}`);
  if(!vk || !variantKeys.has(`${ref.toLowerCase()}::${vk.toLowerCase()}`)) errors.push(`${prefix}: unknown/missing variant_key ${vk}`);
  if(!row.source_url) errors.push(`${prefix}: missing source_url`);
  else { try { new URL(row.source_url); } catch { errors.push(`${prefix}: invalid source_url`); } }
  if(!row.source_key) errors.push(`${prefix}: missing source_key`);
  if(!(Number(row.price)>0)) errors.push(`${prefix}: invalid price`);
  if(!row.currency) errors.push(`${prefix}: missing currency`);
  if(!row.effective_at || Number.isNaN(Date.parse(row.effective_at))) errors.push(`${prefix}: invalid effective_at`);
  if(row.is_official!==true) errors.push(`${prefix}: curated official retail row must set is_official=true`);
}

const text=fs.readFileSync('seed.sql','utf8');
if(/methodology_version\s*,\s*is_demo[\s\S]*?true/i.test(text) && !/Temporary demo|demo market/i.test(text)){
  warnings.push('seed.sql contains demo data; ensure it remains clearly labeled and never rendered as real.');
}

if(warnings.length){
  console.warn('\nWarnings:');
  for(const w of warnings) console.warn('- '+w);
}
if(errors.length){
  console.error('\nValidation failed:');
  for(const e of errors) console.error('- '+e);
  process.exit(1);
}

console.log(`Catalog QA passed: ${refs.length} references, ${[...variantKeys].length} variants, ${retail.length} verified retail prices.`);
