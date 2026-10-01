const cache=new Map();
export async function currentIlsRate(currency){
  const c=String(currency||'').toUpperCase();
  if(c==='ILS') return {rate:1,source:'identity'};
  const hit=cache.get(c);
  if(hit&&Date.now()-hit.at<3600000) return hit.value;
  const url=`https://api.frankfurter.app/latest?from=${encodeURIComponent(c)}&to=ILS`;
  const r=await fetch(url);
  if(!r.ok) throw new Error('FX '+r.status+' for '+c);
  const j=await r.json();
  const rate=Number(j?.rates?.ILS);
  if(!(rate>0)) throw new Error('FX rate missing for '+c);
  const value={rate,source:'frankfurter',date:j.date||null,url};
  cache.set(c,{at:Date.now(),value});
  return value;
}
