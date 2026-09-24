const demoWatches = [
  {brand:'Rolex',collection:'GMT-Master II',model:'Pepsi',ref:'126710BLRO',market:72500,retail:46500,change:4.8,status:'Current',years:'2018–היום',size:'40mm',material:'Oystersteel',dial:'Black',liquidity:'Very High',vol:94},
  {brand:'Rolex',collection:'Submariner Date',model:'Black',ref:'126610LN',market:55800,retail:42300,change:2.1,status:'Current',years:'2020–היום',size:'41mm',material:'Oystersteel',dial:'Black',liquidity:'Very High',vol:98},
  {brand:'Rolex',collection:'Cosmograph Daytona',model:'Panda',ref:'126500LN',market:109500,retail:59100,change:6.2,status:'Current',years:'2023–היום',size:'40mm',material:'Oystersteel',dial:'White',liquidity:'Very High',vol:96},
  {brand:'Rolex',collection:'Submariner Date',model:'Hulk',ref:'116610LV',market:74800,retail:null,change:1.8,status:'Discontinued',years:'2010–2020',size:'40mm',material:'Oystersteel',dial:'Green',liquidity:'High',vol:89},
  {brand:'Rolex',collection:'GMT-Master II',model:'Batman',ref:'126710BLNR',market:61200,retail:45500,change:2.9,status:'Current',years:'2019–היום',size:'40mm',material:'Oystersteel',dial:'Black',liquidity:'Very High',vol:95},
  {brand:'Rolex',collection:'Day-Date 40',model:'Yellow Gold',ref:'228238',market:151000,retail:167000,change:-0.7,status:'Current',years:'2015–היום',size:'40mm',material:'18K Yellow Gold',dial:'Various',liquidity:'High',vol:78},
  {brand:'Patek Philippe',collection:'Nautilus',model:'Blue Dial',ref:'5711/1A-010',market:395000,retail:null,change:-1.6,status:'Discontinued',years:'2006–2021',size:'40mm',material:'Steel',dial:'Blue',liquidity:'High',vol:82},
  {brand:'Patek Philippe',collection:'Nautilus',model:'Moon Phase',ref:'5712/1A-001',market:462000,retail:null,change:3.1,status:'Current',years:'2006–היום',size:'40mm',material:'Steel',dial:'Blue',liquidity:'High',vol:76},
  {brand:'Audemars Piguet',collection:'Royal Oak',model:'Selfwinding',ref:'15510ST.OO.1320ST.06',market:186000,retail:117000,change:0.9,status:'Current',years:'2022–היום',size:'41mm',material:'Steel',dial:'Blue',liquidity:'High',vol:84},
  {brand:'Audemars Piguet',collection:'Royal Oak',model:'Jumbo Extra-Thin',ref:'16202ST.OO.1240ST.02',market:348000,retail:null,change:2.4,status:'Current',years:'2022–היום',size:'39mm',material:'Steel',dial:'Blue',liquidity:'High',vol:71},
  {brand:'Cartier',collection:'Santos de Cartier',model:'Large',ref:'WSSA0018',market:23500,retail:31500,change:3.4,status:'Current',years:'2018–היום',size:'39.8mm',material:'Steel',dial:'White',liquidity:'High',vol:88},
  {brand:'Cartier',collection:'Tank Must',model:'Large',ref:'WSTA0041',market:11800,retail:13900,change:1.3,status:'Current',years:'2021–היום',size:'33.7mm',material:'Steel',dial:'White',liquidity:'High',vol:83},
  {brand:'Omega',collection:'Speedmaster',model:'Moonwatch Sapphire',ref:'310.30.42.50.01.002',market:24800,retail:33300,change:1.2,status:'Current',years:'2021–היום',size:'42mm',material:'Steel',dial:'Black',liquidity:'High',vol:91},
  {brand:'Omega',collection:'Seamaster Diver 300M',model:'Black',ref:'210.30.42.20.01.001',market:16800,retail:23500,change:-0.5,status:'Current',years:'2018–היום',size:'42mm',material:'Steel',dial:'Black',liquidity:'High',vol:87},
  {brand:'Richard Mille',collection:'RM 11',model:'Flyback Chronograph',ref:'RM11-03',market:785000,retail:null,change:-2.4,status:'Discontinued',years:'2016–2022',size:'44.5mm',material:'Titanium',dial:'Skeleton',liquidity:'Medium',vol:53},
  {brand:'Vacheron Constantin',collection:'Overseas',model:'Blue Dial',ref:'4500V/110A-B128',market:103000,retail:null,change:2.7,status:'Discontinued',years:'2016–2024',size:'41mm',material:'Steel',dial:'Blue',liquidity:'High',vol:72},
  {brand:'Tudor',collection:'Black Bay Fifty-Eight',model:'Black',ref:'79030N',market:10500,retail:14900,change:0.5,status:'Current',years:'2018–היום',size:'39mm',material:'Steel',dial:'Black',liquidity:'High',vol:86},
  {brand:'IWC',collection:'Pilot’s Watch',model:'Mark XX',ref:'IW328201',market:18100,retail:25200,change:-1.1,status:'Current',years:'2022–היום',size:'40mm',material:'Steel',dial:'Black',liquidity:'Medium',vol:67},
  {brand:'Breitling',collection:'Navitimer B01',model:'Chronograph 43',ref:'AB0138211B1P1',market:22300,retail:35200,change:-0.8,status:'Current',years:'2022–היום',size:'43mm',material:'Steel',dial:'Black',liquidity:'Medium',vol:63},
  {brand:'F.P. Journe',collection:'Chronomètre Bleu',model:'Tantalum',ref:'CB',market:315000,retail:null,change:5.4,status:'Current',years:'2009–היום',size:'39mm',material:'Tantalum',dial:'Blue',liquidity:'Medium',vol:48}
];
let watches=[...demoWatches];

async function loadDatabaseCatalog(){
  try{
    const res=await fetch('/api/watches',{headers:{'Accept':'application/json'}});
    if(!res.ok) return;
    const rows=await res.json();
    if(!Array.isArray(rows)||!rows.length) return;
    watches=rows.map(r=>({
      brand:r.brand,
      collection:r.collection||'',
      model:r.model||'',
      ref:r.reference,
      market:Number(r.market_value_ils)||0,
      retail:r.retail_price_ils==null?null:Number(r.retail_price_ils),
      dealerBuy:r.dealer_buy_ils==null?null:Number(r.dealer_buy_ils),
      dealerAsk:r.dealer_ask_ils==null?null:Number(r.dealer_ask_ils),
      privateSale:r.private_sale_ils==null?null:Number(r.private_sale_ils),
      change:Number(r.change_12m)||0,
      status:r.status==='discontinued'?'Discontinued':r.status==='limited'?'Limited':'Current',
      years:r.production_start?(String(r.production_start)+'–'+(r.production_end||'היום')):'—',
      size:r.case_size_mm?(String(r.case_size_mm).replace(/\.00$/,'')+'mm'):'—',
      material:r.material||'—',
      dial:r.dial||'—',
      liquidity:r.liquidity_label||'—',
      vol:Number(r.liquidity_score)||0,
      confidence:r.confidence==null?null:Number(r.confidence),
      listingCount:r.listing_count==null?0:Number(r.listing_count),
      sourceCount:r.source_count==null?0:Number(r.source_count),
      isDemo:Boolean(r.is_demo),
      asOf:r.as_of||null,
      imageUrl:r.image_url||null
    }));
  }catch(err){
    console.warn('Catalog API unavailable, using local fallback',err);
  }
}

const brandMeta = [
 ['Rolex','The Crown'],['Patek Philippe','Geneva'],['Audemars Piguet','Le Brassus'],['Cartier','Paris'],
 ['Omega','Bienne'],['Richard Mille','Les Breuleux'],['Vacheron Constantin','Geneva'],['Tudor','Geneva'],
 ['IWC','Schaffhausen'],['Breitling','Grenchen'],['Panerai','Firenze'],['Jaeger-LeCoultre','Le Sentier'],
 ['Grand Seiko','Japan'],['Hublot','Nyon'],['A. Lange & Söhne','Glashütte'],['F.P. Journe','Geneva']
];

const app = document.getElementById('app');
const fmt = n => n ? new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(n) : '—';
const fmtPlain = n => new Intl.NumberFormat('he-IL',{maximumFractionDigits:0}).format(n);
const watchKey = w => w.ref;
let marketState={q:'',brand:'All',status:'All',sort:'popular'};

function miniChart(change=1, id='g'){
 const up=change>=0;
 const pts=up?'0,82 32,74 65,77 98,58 132,62 166,44 200,48 235,31 270,36 305,19 340,23 380,9':'0,17 35,25 70,20 106,38 142,34 180,50 215,46 252,67 290,62 330,80 380,76';
 const color=up?'#5ce6a2':'#ff727c';
 return `<svg viewBox="0 0 380 95" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".24"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polyline fill="none" stroke="${color}" stroke-width="2.5" points="${pts}"/><polygon fill="url(#${id})" points="${pts} 380,95 0,95"/></svg>`;
}

function statusLabel(s){return s==='Discontinued'?'הופסק ייצור':s==='Limited'?'מהדורה מוגבלת':'בייצור';}
function isSaved(ref){ return JSON.parse(localStorage.getItem('wv_watchlist')||'[]').includes(ref); }
function saveToggle(ref){
 let list=JSON.parse(localStorage.getItem('wv_watchlist')||'[]');
 if(list.includes(ref)){list=list.filter(x=>x!==ref);toast('הוסר מה־Watchlist');}
 else{list.push(ref);toast('נוסף ל־Watchlist');}
 localStorage.setItem('wv_watchlist',JSON.stringify(list));
 route();
}
function toast(msg){
 const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show');
 clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove('show'),1800);
}

function home(){
 const featured=watches[0];
 app.innerHTML=`
 <section class="hero-v2">
   <div class="shell hero-layout">
     <div class="hero-copy">
       <div class="micro-label">LUXURY WATCH MARKET INTELLIGENCE · ISRAEL</div>
       <h1>המחיר האמיתי<br><span>של השעון שלך.</span></h1>
       <p>מחירון שוק ישראלי לשעוני יוקרה. Reference, שנתון, Retail, שוק משני, סחירות ודגמים שהופסקו — במקום לנחש אם המחיר הוגן.</p>
       <form id="heroSearch" class="hero-search">
         <span>⌕</span><input id="heroSearchInput" placeholder="חפש מותג, דגם או Reference"><button>בדוק מחיר</button>
       </form>
       <div class="popular-searches"><span>חיפושים פופולריים:</span><button data-query="126610LN">126610LN</button><button data-query="Daytona">Daytona</button><button data-query="Santos">Santos</button><button data-query="5711">5711</button></div>
     </div>
     <article class="spotlight-card" data-watch="${featured.ref}">
       <div class="spotlight-top"><span class="badge">MARKET SPOTLIGHT</span><span class="trend positive">+${featured.change}%</span></div>
       <div class="watch-art rolex-art"><div class="watch-face"><span>ROLEX</span><b>GMT-MASTER II</b><small>PEPSI</small></div></div>
       <div class="spotlight-name"><div><small>${featured.brand}</small><h3>${featured.collection} “${featured.model}”</h3><span>Ref. ${featured.ref}</span></div><div class="big-money">${fmt(featured.market)}</div></div>
       <div class="spotlight-chart">${miniChart(featured.change,'heroChart')}</div>
       <div class="spotlight-stats"><div><span>Retail</span><b>${fmt(featured.retail)}</b></div><div><span>Premium</span><b class="positive">+${Math.round((featured.market/featured.retail-1)*100)}%</b></div><div><span>Liquidity</span><b>${featured.liquidity}</b></div></div>
     </article>
   </div>
 </section>

 <section class="trust-strip"><div class="shell">
   <div><b>16</b><span>מותגים נבחרים</span></div><i></i><div><b>Reference</b><span>תמחור ברמת דגם מדויק</span></div><i></i><div><b>Current + Discontinued</b><span>כולל דגמים שיצאו מייצור</span></div><i></i><div><b>Israel + Global</b><span>שכבת השוואה מקומית</span></div>
 </div></section>

 ${marketBlock({limit:8,title:'השעונים החמים בשוק',subtitle:'דגמים עם עניין וסחירות גבוהים'})}
 ${brandBlock()}
 ${discontinuedStrip()}
 ${howItWorks()}
 ${premiumBanner()}
 `;
 bindCommon();
 document.getElementById('heroSearch')?.addEventListener('submit',e=>{e.preventDefault();const q=document.getElementById('heroSearchInput').value.trim();location.hash='#/market?q='+encodeURIComponent(q);});
 document.querySelectorAll('[data-query]').forEach(x=>x.onclick=()=>location.hash='#/market?q='+encodeURIComponent(x.dataset.query));
}

function marketBlock({limit=null,title='מחירון השוק',subtitle='חפש והשווה לפי Reference'}={}){
 let data=filterWatches();
 if(limit) data=data.slice(0,limit);
 return `<section class="section-v2" id="market">
 <div class="shell">
   <div class="section-head"><div><div class="micro-label">LIVE MARKET · DEMO DATA</div><h2>${title}</h2><p>${subtitle}</p></div><a class="text-link" href="#/market">לכל המחירון ←</a></div>
   ${limit?'':filtersHtml()}
   <div class="market-shell">
     <div class="market-headrow"><span>שעון</span><span>מחיר שוק</span><span>Retail</span><span>12M</span><span>סחירות</span><span></span></div>
     <div class="market-list">
       ${data.length?data.map(marketRow).join(''):'<div class="empty-state"><b>לא נמצאו תוצאות</b><span>נסה שם מותג, דגם או Reference אחר.</span></div>'}
     </div>
   </div>
 </div></section>`;
}

function marketRow(w){
 return `<article class="market-row" data-watch="${w.ref}">
   <div class="watch-ident"><button class="heart ${isSaved(w.ref)?'saved':''}" data-save="${w.ref}" aria-label="Watchlist">♡</button><div class="thumb">${w.brand.slice(0,2).toUpperCase()}</div><div><b>${w.brand}</b><strong>${w.collection} ${w.model}</strong><small>Ref. ${w.ref} · ${statusLabel(w.status)}</small></div></div>
   <div class="market-cell"><small>Market</small><b>${fmt(w.market)}</b></div>
   <div class="market-cell"><small>Retail</small><b>${fmt(w.retail)}</b></div>
   <div class="market-cell"><small>12M</small><b class="${w.change>=0?'positive':'negative'}">${w.change>=0?'+':''}${w.change}%</b></div>
   <div class="liquidity-cell"><small>Liquidity</small><div class="liq"><i style="width:${w.vol}%"></i></div><b>${w.liquidity}</b></div>
   <div class="row-arrow">‹</div>
 </article>`;
}

function filtersHtml(){
 return `<div class="filters">
   <div class="market-search"><span>⌕</span><input id="marketSearch" value="${escapeHtml(marketState.q)}" placeholder="חיפוש לפי Reference, מותג או דגם"></div>
   <select id="brandFilter"><option value="All">כל המותגים</option>${brandMeta.map(b=>`<option ${marketState.brand===b[0]?'selected':''}>${b[0]}</option>`).join('')}</select>
   <select id="statusFilter"><option value="All">כל הסטטוסים</option><option value="Current" ${marketState.status==='Current'?'selected':''}>בייצור</option><option value="Discontinued" ${marketState.status==='Discontinued'?'selected':''}>הופסק ייצור</option></select>
   <select id="sortFilter"><option value="popular">הכי סחירים</option><option value="priceHigh">מחיר: גבוה לנמוך</option><option value="priceLow">מחיר: נמוך לגבוה</option><option value="gainers">העולים</option><option value="losers">היורדים</option></select>
 </div>`;
}
function filterWatches(){
 let arr=[...watches];
 if(marketState.q){const q=marketState.q.toLowerCase();arr=arr.filter(w=>[w.brand,w.collection,w.model,w.ref].join(' ').toLowerCase().includes(q));}
 if(marketState.brand!=='All')arr=arr.filter(w=>w.brand===marketState.brand);
 if(marketState.status!=='All')arr=arr.filter(w=>w.status===marketState.status);
 const sorts={popular:(a,b)=>b.vol-a.vol,priceHigh:(a,b)=>b.market-a.market,priceLow:(a,b)=>a.market-b.market,gainers:(a,b)=>b.change-a.change,losers:(a,b)=>a.change-b.change};
 return arr.sort(sorts[marketState.sort]||sorts.popular);
}

function marketPage(){
 const params=new URLSearchParams((location.hash.split('?')[1]||'')); if(params.has('q'))marketState.q=params.get('q');
 app.innerHTML=`<section class="page-hero"><div class="shell"><div class="micro-label">WATCHVALUE MARKET</div><h1>מחירון שעוני יוקרה</h1><p>חיפוש לפי מותג, Collection או Reference מדויק.</p></div></section>${marketBlock()}`;
 bindMarket();
}
function bindMarket(){
 bindCommon();
 const search=document.getElementById('marketSearch'); if(search)search.oninput=e=>{marketState.q=e.target.value;refreshMarketOnly();};
 const brand=document.getElementById('brandFilter');if(brand)brand.onchange=e=>{marketState.brand=e.target.value;refreshMarketOnly();};
 const status=document.getElementById('statusFilter');if(status)status.onchange=e=>{marketState.status=e.target.value;refreshMarketOnly();};
 const sort=document.getElementById('sortFilter');if(sort){sort.value=marketState.sort;sort.onchange=e=>{marketState.sort=e.target.value;refreshMarketOnly();};}
}
function refreshMarketOnly(){ const sec=document.querySelector('#market'); if(!sec)return; sec.outerHTML=marketBlock(); bindMarket(); }

function brandBlock(){
 return `<section class="section-v2 muted-section" id="brands"><div class="shell">
  <div class="section-head"><div><div class="micro-label">BRAND DIRECTORY</div><h2>המותגים שאנחנו עוקבים אחריהם</h2><p>רק שווקים עם סחירות, עניין ומספיק דאטה לתמחור.</p></div><a class="text-link" href="#/brands">לכל המותגים ←</a></div>
  <div class="brand-grid-v2">${brandMeta.map(([name,origin])=>`<button class="brand-card" data-brand="${name}"><span class="brand-monogram">${name.split(' ').map(x=>x[0]).join('').slice(0,2)}</span><div><b>${name}</b><small>${origin}</small></div><span class="brand-count">${watches.filter(w=>w.brand===name).length || 'Soon'}</span></button>`).join('')}</div>
 </div></section>`;
}
function brandsPage(){app.innerHTML=`<section class="page-hero"><div class="shell"><div class="micro-label">BRAND DIRECTORY</div><h1>מותגי היוקרה הסחירים</h1><p>הקטלוג יורחב לכל Reference סחיר בכל מותג.</p></div></section>${brandBlock()}`;bindCommon();}

function discontinuedStrip(){
 const data=watches.filter(w=>w.status==='Discontinued').slice(0,4);
 return `<section class="section-v2"><div class="shell"><div class="section-head"><div><div class="micro-label">DISCONTINUED</div><h2>דגמים שהשוק ממשיך לתמחר</h2><p>ייצור נגמר. השוק לא.</p></div><a class="text-link" href="#/discontinued">כל הדגמים ←</a></div><div class="cards-4">${data.map(w=>`<article class="watch-card" data-watch="${w.ref}"><div class="card-status">DISCONTINUED</div><div class="card-art"><span>${w.brand}</span><b>${w.ref}</b></div><h3>${w.collection}</h3><p>${w.model}</p><div class="card-bottom"><b>${fmt(w.market)}</b><span class="${w.change>=0?'positive':'negative'}">${w.change>=0?'+':''}${w.change}%</span></div></article>`).join('')}</div></div></section>`;
}
function discontinuedPage(){marketState.status='Discontinued';marketState.q='';marketState.brand='All';app.innerHTML=`<section class="page-hero"><div class="shell"><div class="micro-label">DISCONTINUED INDEX</div><h1>הפסיקו לייצר. לא הפסיקו להיסחר.</h1><p>מעקב אחרי References שיצאו מייצור ועדיין פעילים בשוק המשני.</p></div></section>${marketBlock({title:'Discontinued Market',subtitle:'מחירי שוק לדגמים שהופסקו'})}`;bindMarket();}

function howItWorks(){
 return `<section class="section-v2 method-section"><div class="shell method-grid"><div><div class="micro-label">WATCHVALUE METHOD</div><h2>מחיר אחד.<br>מאחורי הקלעים — הרבה דאטה.</h2><p>המטרה של WatchValue היא לא להעתיק מחיר מאתר אחד, אלא לנקות, להשוות ולשקלל מספר מקורות כדי לקבל טווח שוק שימושי.</p></div><div class="method-steps"><div><span>01</span><b>איסוף</b><p>Listings, תוצאות מכירה, Retail ומידע Reference.</p></div><div><span>02</span><b>ניקוי</b><p>כפילויות, חריגות, מצב, שנתון ו־Full Set.</p></div><div><span>03</span><b>תמחור</b><p>Global Market מול התאמת שוק ישראל.</p></div><div><span>04</span><b>ביטחון</b><p>Sample size, freshness ו־confidence score.</p></div></div></div></section>`;
}
function premiumBanner(){return `<section class="section-v2"><div class="shell"><div class="premium-banner"><div><div class="micro-label">WATCHVALUE PREMIUM</div><h2>לא רק המחיר של היום.</h2><p>גרפים, היסטוריה, התראות, Watchlist ומעקב תיק.</p></div><div><strong>$14.99</strong><span>/ חודש</span><button class="cta-button" data-pricing>7 ימים חינם</button></div></div></div></section>`; }

function watchPage(ref){
 const w=watches.find(x=>x.ref.toLowerCase()===decodeURIComponent(ref).toLowerCase());
 if(!w){notFound();return;}
 const premium=w.retail?Math.round((w.market/w.retail-1)*100):null;
 app.innerHTML=`<section class="watch-page"><div class="shell">
  <div class="crumbs"><a href="#/">ראשי</a><span>/</span><a href="#/market">${w.brand}</a><span>/</span><b>${w.ref}</b></div>
  <div class="watch-layout">
    <div class="watch-hero-art">
      <button class="watchlist-big ${isSaved(w.ref)?'saved':''}" data-save="${w.ref}">♡ <span>${isSaved(w.ref)?'ב־Watchlist':'הוסף ל־Watchlist'}</span></button>
      <div class="lux-watch"><div class="lux-strap top"></div><div class="lux-case"><div class="lux-dial"><small>${w.brand}</small><b>${w.collection}</b><span>${w.ref}</span></div></div><div class="lux-strap bottom"></div></div>
      <div class="art-caption">Illustrative product view · Image integration next</div>
    </div>
    <div class="watch-info">
      <div class="watch-title-row"><div><div class="micro-label">${w.brand.toUpperCase()} · ${statusLabel(w.status).toUpperCase()}</div><h1>${w.collection}</h1><h3>${w.model}</h3><p>Reference <b>${w.ref}</b> · ${w.years}</p></div><span class="status-chip ${w.status==='Discontinued'?'disc':''}">${statusLabel(w.status)}</span></div>
      <div class="valuation-card">
        <div class="valuation-main"><span>WatchValue Market Estimate</span><strong>${fmt(w.market)}</strong><small>Demo estimate · data engine in development</small></div>
        <div class="valuation-change ${w.change>=0?'positive':'negative'}"><span>12M</span><b>${w.change>=0?'+':''}${w.change}%</b></div>
      </div>
      <div class="price-trio"><div><span>Retail / MSRP</span><b>${fmt(w.retail)}</b></div><div><span>Private sale</span><b>${fmt(Math.round(w.market*.96))}</b></div><div><span>Dealer ask</span><b>${fmt(Math.round(w.market*1.055))}</b></div></div>
      <div class="chart-panel"><div class="chart-head"><div><b>Price history</b><small>12 חודשים</small></div><div class="chart-tabs"><button>1M</button><button>6M</button><button class="active">1Y</button><button>5Y</button></div></div><div class="main-chart">${miniChart(w.change,'watchChart')}</div><div class="chart-axis"><span>${fmt(Math.round(w.market*.85))}</span><span>${fmt(w.market)}</span></div></div>
      <div class="spec-grid"><div><span>קוטר</span><b>${w.size}</b></div><div><span>חומר</span><b>${w.material}</b></div><div><span>לוח</span><b>${w.dial}</b></div><div><span>סחירות</span><b>${w.liquidity}</b></div></div>
      <div class="insight-card"><div><div class="micro-label">MARKET INSIGHT</div><h3>${premium!==null?`נסחר ${premium>=0?'מעל':'מתחת'} ל־Retail בכ־${Math.abs(premium)}%`:'Reference ללא Retail פעיל'}</h3><p>ב־Premium נציג כאן פער ישראל/עולם, מספר תצפיות, confidence score וזמן מכירה משוער.</p></div><button class="soft-button" data-pricing>פתח Premium</button></div>
    </div>
  </div>
  <section class="related"><div class="section-head"><div><div class="micro-label">RELATED REFERENCES</div><h2>דגמים נוספים שכדאי להשוות</h2></div></div><div class="cards-4">${watches.filter(x=>x.brand===w.brand&&x.ref!==w.ref).slice(0,4).map(x=>`<article class="mini-watch-card" data-watch="${x.ref}"><span>${x.ref}</span><b>${x.collection}</b><small>${x.model}</small><strong>${fmt(x.market)}</strong></article>`).join('')||'<div class="empty-note">נוסיף References נוספים לקטלוג בקרוב.</div>'}</div></section>
 </div></section>`;
 bindCommon();
}

function watchlistPage(){
 const refs=JSON.parse(localStorage.getItem('wv_watchlist')||'[]'); const saved=watches.filter(w=>refs.includes(w.ref));
 app.innerHTML=`<section class="page-hero"><div class="shell"><div class="micro-label">MY WATCHLIST</div><h1>השוק שאתה עוקב אחריו</h1><p>נשמר במכשיר כרגע. חשבון משתמש וסנכרון ענן יחוברו בהמשך.</p></div></section><section class="section-v2"><div class="shell">${saved.length?'<div class="watchlist-grid">'+saved.map(w=>`<article class="saved-card" data-watch="${w.ref}"><button data-save="${w.ref}">×</button><span>${w.brand}</span><h3>${w.collection}</h3><p>${w.model} · ${w.ref}</p><strong>${fmt(w.market)}</strong><div class="${w.change>=0?'positive':'negative'}">${w.change>=0?'+':''}${w.change}%</div></article>`).join('')+'</div>':'<div class="watchlist-empty"><span>♡</span><h2>ה־Watchlist שלך עדיין ריק</h2><p>הוסף שעונים מהמחירון כדי לעקוב אחריהם במקום אחד.</p><a class="cta-button" href="#/market">פתח מחירון</a></div>'}</div></section>`;
 bindCommon();
}
function notFound(){app.innerHTML='<section class="page-hero"><div class="shell"><h1>לא מצאנו את ה־Reference הזה.</h1><a class="cta-button" href="#/market">חזור למחירון</a></div></section>';bindCommon();}

function bindCommon(){
 document.querySelectorAll('[data-watch]').forEach(el=>el.onclick=e=>{if(e.target.closest('[data-save]'))return;location.hash='#/watch/'+encodeURIComponent(el.dataset.watch);});
 document.querySelectorAll('[data-save]').forEach(el=>el.onclick=e=>{e.stopPropagation();saveToggle(el.dataset.save);});
 document.querySelectorAll('[data-brand]').forEach(el=>el.onclick=()=>{marketState.brand=el.dataset.brand;marketState.status='All';marketState.q='';location.hash='#/market';});
 document.querySelectorAll('[data-pricing]').forEach(el=>el.onclick=openPricing);
 updateNav();
}
function bindGlobal(){
 document.querySelectorAll('[data-pricing]').forEach(el=>el.onclick=openPricing);
 document.querySelector('[data-close-pricing]')?.addEventListener('click',closePricing);
 document.getElementById('pricingModal')?.addEventListener('click',e=>{if(e.target.id==='pricingModal')closePricing();});
 document.getElementById('searchToggle')?.addEventListener('click',openSearch);
 document.querySelector('[data-close-search]')?.addEventListener('click',closeSearch);
 document.getElementById('globalSearch')?.addEventListener('click',e=>{if(e.target.id==='globalSearch')closeSearch();});
 const input=document.getElementById('globalSearchInput'); if(input)input.oninput=e=>renderSearchResults(e.target.value);
}
function openPricing(){const m=document.getElementById('pricingModal');m.style.display='grid';m.setAttribute('aria-hidden','false');}
function closePricing(){const m=document.getElementById('pricingModal');m.style.display='none';m.setAttribute('aria-hidden','true');}
function openSearch(){const m=document.getElementById('globalSearch');m.style.display='grid';m.setAttribute('aria-hidden','false');setTimeout(()=>document.getElementById('globalSearchInput')?.focus(),40);renderSearchResults('');}
function closeSearch(){const m=document.getElementById('globalSearch');m.style.display='none';m.setAttribute('aria-hidden','true');}
function renderSearchResults(q){
 const el=document.getElementById('globalSearchResults'); if(!el)return;
 const data=q?watches.filter(w=>[w.brand,w.collection,w.model,w.ref].join(' ').toLowerCase().includes(q.toLowerCase())).slice(0,8):watches.slice(0,6);
 el.innerHTML=data.map(w=>`<button data-search-watch="${w.ref}"><span><b>${w.brand}</b><small>${w.collection} ${w.model}</small></span><em>${w.ref}</em></button>`).join('');
 el.querySelectorAll('[data-search-watch]').forEach(x=>x.onclick=()=>{closeSearch();location.hash='#/watch/'+encodeURIComponent(x.dataset.searchWatch);});
}
function updateNav(){const path=(location.hash.split('?')[0]||'#/').replace('#/','').split('/')[0]||'home';document.querySelectorAll('.mobile-nav [data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===path));}
function escapeHtml(v=''){return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function route(){
 const raw=(location.hash||'#/').replace(/^#/,''); const path=raw.split('?')[0]; const parts=path.split('/').filter(Boolean);
 if(parts[0]==='watch')watchPage(parts.slice(1).join('/'));
 else if(parts[0]==='market')marketPage();
 else if(parts[0]==='brands')brandsPage();
 else if(parts[0]==='discontinued')discontinuedPage();
 else if(parts[0]==='watchlist')watchlistPage();
 else home();
 window.scrollTo({top:0,behavior:'instant'});
}
window.addEventListener('hashchange',route);
bindGlobal();
loadDatabaseCatalog().finally(route);