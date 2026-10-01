import { resolveVariantFingerprint } from './variant-fingerprint.mjs';
const YEAR_RE=/\b(19[5-9]\d|20[0-3]\d)\b/g;
const norm=s=>String(s||'').trim();
const upper=s=>norm(s).toUpperCase().replace(/[^A-Z0-9]/g,'');

export function extractYear(value,title=''){
  const direct=Number(value);
  const max=new Date().getUTCFullYear()+1;
  if(Number.isInteger(direct)&&direct>=1950&&direct<=max) return direct;
  const years=[...String(title).matchAll(YEAR_RE)].map(m=>Number(m[1])).filter(y=>y<=max);
  return years.length===1?years[0]:null;
}

export function extractBracelet(value,title=''){
  const text=(norm(value)+' '+norm(title)).toLowerCase();
  const hasJ=/\bjubilee\b/.test(text);
  const hasO=/\boyster\b/.test(text);
  if(hasJ&&hasO) return null;
  if(hasJ) return 'Jubilee';
  if(hasO) return 'Oyster';
  return norm(value)||null;
}

export function resolveStrictVariant({reference,variant_key,bracelet,title},rules){
  const ref=upper(reference);
  const explicit=norm(variant_key);
  const br=extractBracelet(bracelet,title);
  const groups=Object.values(rules||{}).filter(Array.isArray).flat();
  const group=groups.find(g=>upper(g.reference)===ref);
  if(!group) return explicit?{variant_key:explicit,bracelet:br}:{variant_key:null,bracelet:br};
  if(explicit){
    const v=(group.variants||[]).find(x=>norm(x.variant_key)===explicit);
    if(!v) return {variant_key:null,bracelet:br,reason:'variant_not_allowed_for_reference'};
    if(br&&norm(v.bracelet).toLowerCase()!==br.toLowerCase()) return {variant_key:null,bracelet:br,reason:'bracelet_variant_conflict'};
    return {variant_key:explicit,bracelet:norm(v.bracelet)||br};
  }
  if(!br) return {variant_key:null,bracelet:null,reason:'bracelet_missing'};
  const matches=(group.variants||[]).filter(v=>norm(v.bracelet).toLowerCase()===br.toLowerCase());
  if(matches.length!==1) return {variant_key:null,bracelet:br,reason:'variant_ambiguous'};
  return {variant_key:matches[0].variant_key,bracelet:br};
}

export function normalizeMarketplaceListing(input,rules,catalogVariants=[]){
  const reference=norm(input.reference);
  const title=norm(input.title);
  const year=extractYear(input.year,title);
  let resolved=resolveStrictVariant({...input,reference,title},rules);
  if(!resolved.variant_key && catalogVariants.length){
    resolved=resolveVariantFingerprint({...input,reference,title},catalogVariants);
  }
  const price=Number(input.asking_price);
  const currency=norm(input.currency).toUpperCase();
  const source_url=norm(input.source_url);
  const reasons=[];
  if(!reference) reasons.push('reference_missing');
  if(!year) reasons.push('year_missing_or_ambiguous');
  if(!resolved.variant_key) reasons.push(resolved.reason||'variant_missing');
  if(!resolved.bracelet) reasons.push('bracelet_missing');
  if(!(price>0)) reasons.push('price_invalid');
  if(!currency) reasons.push('currency_missing');
  if(!source_url) reasons.push('source_url_missing');
  return {
    accepted:reasons.length===0,
    reasons,
    listing:{
      ...input,reference,title,year,
      variant_key:resolved.variant_key,
      bracelet:resolved.bracelet,
      dial:resolved.dial||input.dial||null,
      bezel:resolved.bezel||input.bezel||null,
      material:resolved.material||input.material||null,
      identity_confidence:resolved.confidence??null,
      identity_matched_by:resolved.matchedBy||null,
      asking_price:price,
      currency,
      source_url
    }
  };
}
