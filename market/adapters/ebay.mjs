const API='https://api.ebay.com';
let tokenCache={token:null,expiresAt:0};

async function token(clientId,clientSecret){
  if(tokenCache.token&&Date.now()<tokenCache.expiresAt-60000) return tokenCache.token;
  const auth=Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body=new URLSearchParams({grant_type:'client_credentials',scope:'https://api.ebay.com/oauth/api_scope'});
  const r=await fetch(API+'/identity/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},body});
  if(!r.ok) throw new Error('eBay OAuth '+r.status+': '+(await r.text()).slice(0,300));
  const j=await r.json();
  tokenCache={token:j.access_token,expiresAt:Date.now()+Number(j.expires_in||7200)*1000};
  return tokenCache.token;
}

export async function searchEbay({clientId,clientSecret,reference,limit=200}){
  if(!clientId||!clientSecret) return {enabled:false,items:[],reason:'credentials_missing'};
  const access=await token(clientId,clientSecret);
  const q=encodeURIComponent(reference);
  const url=`${API}/buy/browse/v1/item_summary/search?q=${q}&category_ids=31387&limit=${Math.min(limit,200)}`;
  const r=await fetch(url,{headers:{Authorization:'Bearer '+access,'X-EBAY-C-MARKETPLACE-ID':'EBAY_US'}});
  if(!r.ok) throw new Error('eBay Browse '+r.status+': '+(await r.text()).slice(0,300));
  const j=await r.json();
  const items=(j.itemSummaries||[]).map(x=>({
    source_key:'ebay_market',
    source_listing_id:x.itemId||null,
    source_url:x.itemWebUrl||x.itemAffiliateWebUrl||'',
    title:x.title||'',
    asking_price:Number(x.price?.value||0),
    currency:x.price?.currency||'',
    condition:x.condition||null,
    country:x.itemLocation?.country||null,
    seller_type:'marketplace',
    metadata:{seller:x.seller?.username||null,buyingOptions:x.buyingOptions||[],image:x.image?.imageUrl||null}
  }));
  return {enabled:true,items,total:Number(j.total||items.length)};
}
