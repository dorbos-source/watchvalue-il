const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const words=s=>new Set(clean(s).split(/\s+/).filter(x=>x.length>1));
const stop=new Set(['and','with','the','steel','watch','rolex','cartier','master','gmt','datejust','santos','tank','de']);

function usefulTokens(value){
  return [...words(value)].filter(x=>!stop.has(x));
}
function phraseScore(text,value,weight){
  const toks=usefulTokens(value);
  if(!toks.length) return {score:0,matched:0,total:0};
  const t=words(text);
  const matched=toks.filter(x=>t.has(x)).length;
  return {score:(matched/toks.length)*weight,matched,total:toks.length};
}

export function resolveVariantFingerprint({title='',bracelet='',dial='',bezel='',material='',variant_key=''},variants=[]){
  if(!variants.length) return {variant_key:null,reason:'catalog_variants_missing'};
  if(variant_key){
    const exact=variants.find(v=>String(v.variant_key).toLowerCase()===String(variant_key).toLowerCase());
    if(!exact) return {variant_key:null,reason:'variant_not_in_catalog'};
    return {variant_key:exact.variant_key,bracelet:exact.bracelet||bracelet||null,confidence:1,matchedBy:['variant_key']};
  }
  const text=[title,bracelet,dial,bezel,material].filter(Boolean).join(' ');
  const scored=variants.map(v=>{
    let score=0; const matchedBy=[];
    const parts=[
      ['bracelet',v.bracelet,4],
      ['dial',v.dial,3],
      ['bezel',v.bezel,3],
      ['material',v.material,3],
      ['nickname',v.nickname,2]
    ];
    for(const [name,val,weight] of parts){
      const x=phraseScore(text,val,weight);
      score+=x.score;
      if(x.total&&x.matched===x.total) matchedBy.push(name);
    }
    return {...v,_score:score,_matchedBy:matchedBy};
  }).sort((a,b)=>b._score-a._score);
  const best=scored[0], second=scored[1];
  if(!best||best._score<4) return {variant_key:null,reason:'variant_evidence_insufficient'};
  if(second && Math.abs(best._score-second._score)<1) return {variant_key:null,reason:'variant_ambiguous'};
  const needsDial=variants.some(v=>clean(v.dial)!==clean(best.dial));
  const needsBracelet=variants.some(v=>clean(v.bracelet)!==clean(best.bracelet));
  const needsBezel=variants.some(v=>clean(v.bezel)!==clean(best.bezel));
  const needsMaterial=variants.some(v=>clean(v.material)!==clean(best.material));
  if(needsDial&&!best._matchedBy.includes('dial')) return {variant_key:null,reason:'dial_required_for_variant'};
  if(needsBracelet&&!best._matchedBy.includes('bracelet')) return {variant_key:null,reason:'bracelet_required_for_variant'};
  if(needsBezel&&!best._matchedBy.includes('bezel')) return {variant_key:null,reason:'bezel_required_for_variant'};
  if(needsMaterial&&!best._matchedBy.includes('material')) return {variant_key:null,reason:'material_required_for_variant'};
  return {
    variant_key:best.variant_key,
    bracelet:best.bracelet||null,
    dial:best.dial||null,
    bezel:best.bezel||null,
    material:best.material||null,
    confidence:Math.min(1,best._score/13),
    matchedBy:best._matchedBy
  };
}
