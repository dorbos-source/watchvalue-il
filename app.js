const brands = [
  ['Rolex',1480],['Patek Philippe',820],['Audemars Piguet',640],['Cartier',720],['Omega',1180],['Richard Mille',380],['Vacheron Constantin',430],['Tudor',510],['IWC',490],['Breitling',620],['Panerai',430],['Jaeger-LeCoultre',410],['Grand Seiko',470],['Hublot',520],['A. Lange & Söhne',270],['F.P. Journe',180]
];

const watches = [
  {brand:'Rolex',model:'GMT-Master II Pepsi',ref:'126710BLRO',market:72500,retail:46500,change:4.8,status:'Current',year:'2018–היום',size:'40mm',material:'Steel',liquidity:'גבוהה מאוד'},
  {brand:'Rolex',model:'Submariner Date',ref:'126610LN',market:55800,retail:42300,change:2.1,status:'Current',year:'2020–היום',size:'41mm',material:'Steel',liquidity:'גבוהה מאוד'},
  {brand:'Rolex',model:'Daytona Panda',ref:'126500LN',market:109500,retail:59100,change:6.2,status:'Current',year:'2023–היום',size:'40mm',material:'Steel',liquidity:'גבוהה מאוד'},
  {brand:'Rolex',model:'Submariner Hulk',ref:'116610LV',market:74800,retail:0,change:1.8,status:'Discontinued',year:'2010–2020',size:'40mm',material:'Steel',liquidity:'גבוהה'},
  {brand:'Patek Philippe',model:'Nautilus',ref:'5711/1A-010',market:395000,retail:0,change:-1.6,status:'Discontinued',year:'2006–2021',size:'40mm',material:'Steel',liquidity:'גבוהה'},
  {brand:'Audemars Piguet',model:'Royal Oak',ref:'15510ST',market:186000,retail:117000,change:0.9,status:'Current',year:'2022–היום',size:'41mm',material:'Steel',liquidity:'גבוהה'},
  {brand:'Cartier',model:'Santos de Cartier Large',ref:'WSSA0018',market:23500,retail:31500,change:3.4,status:'Current',year:'2018–היום',size:'39.8mm',material:'Steel',liquidity:'גבוהה'},
  {brand:'Omega',model:'Speedmaster Moonwatch',ref:'310.30.42.50.01.002',market:24800,retail:33300,change:1.2,status:'Current',year:'2021–היום',size:'42mm',material:'Steel',liquidity:'גבוהה'},
  {brand:'Richard Mille',model:'RM 11-03',ref:'RM11-03',market:785000,retail:0,change:-2.4,status:'Discontinued',year:'2016–2022',size:'44.5mm',material:'Titanium',liquidity:'בינונית'},
  {brand:'Vacheron Constantin',model:'Overseas',ref:'4500V/110A-B128',market:103000,retail:0,change:2.7,status:'Discontinued',year:'2016–2024',size:'41mm',material:'Steel',liquidity:'גבוהה'},
  {brand:'Tudor',model:'Black Bay 58',ref:'79030N',market:10500,retail:14900,change:0.5,status:'Current',year:'2018–היום',size:'39mm',material:'Steel',liquidity:'גבוהה'},
  {brand:'F.P. Journe',model:'Chronomètre Bleu',ref:'CB',market:315000,retail:0,change:5.4,status:'Current',year:'2009–היום',size:'39mm',material:'Tantalum',liquidity:'בינונית'}
];

const fmt = n => n ? new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(n) : '—';
const app = document.getElementById('app');

function chartSvg(up=true){
 const pts = up ? '0,95 25,88 48,92 70,72 95,76 120,58 150,61 178,42 205,48 235,31 270,36 300,20 340,26 380,10' : '0,28 30,20 62,36 95,30 128,50 164,42 204,63 238,56 272,78 310,70 350,90 380,84';
 return `<svg viewBox="0 0 380 110" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#29d889" stop-opacity=".28"/><stop offset="1" stop-color="#29d889" stop-opacity="0"/></linearGradient></defs><polyline fill="none" stroke="#29d889" stroke-width="3" points="${pts}"/><polygon fill="url(#fill)" points="${pts} 380,110 0,110"/></svg>`;
}

function home(){
 app.innerHTML = `
 <section class="hero"><div class="wrap hero-grid">
  <div><div class="eyebrow">LUXURY WATCH MARKET DATA · ISRAEL</div><h1>לדעת כמה השעון <span>באמת שווה.</span></h1><p>מחירון ישראלי לשעוני יוקרה — מחיר שוק, Retail, שנתונים, דגמים שהופסקו, היסטוריית מחיר וסחירות. במקום לנחש.</p>
   <form class="search-shell" id="searchForm"><input id="searchInput" placeholder="חפש Rolex, 126610LN, Nautilus..."/><button>חיפוש</button></form><div class="search-hint">נסה: 126710BLRO · Daytona · Santos · 5711</div>
  </div>
  <div class="hero-card"><div class="market-head"><div><span class="watch-chip">ROLEX · 126710BLRO</span><h3>GMT-Master II “Pepsi”</h3></div><span class="positive">▲ 4.8%</span></div><div class="market-price">₪72,500</div><small class="muted">WatchValue Market Estimate · Demo</small><div class="mini-chart">${chartSvg(true)}</div><div class="mini-stats"><div><small>Retail</small><b>₪46,500</b></div><div><small>Premium</small><b class="positive">+55.9%</b></div><div><small>Liquidity</small><b>Very High</b></div></div></div>
 </div></section>
 <section><div class="wrap metrics"><div class="metric"><b>16</b><span>מותגים סחירים</span></div><div class="metric"><b>4,000+</b><span>References מתוכננים</span></div><div class="metric"><b>Daily</b><span>עדכון שוק מתוכנן</span></div><div class="metric"><b>7 Days</b><span>ניסיון חינם</span></div></div></section>
 ${marketSection()}
 ${brandsSection()}
 ${newsSection()}
 <div class="demo-note">MVP · המחירים כרגע להמחשה בלבד</div>`;
 bindHome();
}

function marketSection(filter=''){
 const rows=watches.filter(w => `${w.brand} ${w.model} ${w.ref}`.toLowerCase().includes(filter.toLowerCase())).map(w=>`<tr data-ref="${w.ref}"><td><b>${w.brand}</b><div class="ref">${w.ref}</div></td><td>${w.model}</td><td class="price">${fmt(w.market)}</td><td class="price">${fmt(w.retail)}</td><td class="${w.change>=0?'positive':'negative'}">${w.change>=0?'▲':'▼'} ${Math.abs(w.change)}%</td><td><span class="status-pill ${w.status==='Discontinued'?'disc':''}">${w.status}</span></td></tr>`).join('');
 return `<section class="section" id="market"><div class="wrap"><div class="section-title"><div><div class="eyebrow">MARKET</div><h2>מחירי שוק מובילים</h2></div><p>נתוני MVP להמחשת המוצר</p></div><div class="table-card"><table class="market-table"><thead><tr><th>מותג / Reference</th><th>דגם</th><th>שווי שוק</th><th>Retail</th><th>12 חודשים</th><th>סטטוס</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>`;
}

function brandsSection(){ return `<section class="section" id="brands"><div class="wrap"><div class="section-title"><div><div class="eyebrow">BRANDS</div><h2>המותגים שאנחנו מכסים</h2></div><p>רק מותגים עם שוק משני פעיל</p></div><div class="brand-grid">${brands.map(b=>`<div class="brand-tile" data-brand="${b[0]}"><div><b>${b[0]}</b><small>${b[1]} references*</small></div></div>`).join('')}</div></div></section>`; }

function newsSection(){ return `<section class="section" id="news"><div class="wrap"><div class="section-title"><div><div class="eyebrow">WATCH NEWS</div><h2>חדשות שמשפיעות על המחיר</h2></div><p>בהמשך: איסוף וסיכום אוטומטי</p></div><div class="news-grid"><article class="news-card"><small>ROLEX</small><h3>מה קורה למחיר אחרי Discontinuation?</h3><p>עמודי דגם יקשרו בין אירועי קולקציה לבין שינויי מחיר בשוק המשני.</p></article><article class="news-card"><small>MARKET</small><h3>הדגמים הסחירים ביותר השבוע</h3><p>נפח מודעות, זמן בשוק ופערי מחיר בין ישראל לעולם.</p></article><article class="news-card"><small>COLLECTORS</small><h3>Reference חדש או דור קודם?</h3><p>השוואה בין דורות, Retail, שוק ופרמיה לאורך זמן.</p></article></div></div></section>`; }

function modelPage(ref){
 const w=watches.find(x=>x.ref.toLowerCase()===ref.toLowerCase()) || watches[0];
 const premium = w.retail ? (((w.market/w.retail)-1)*100).toFixed(1) : null;
 app.innerHTML=`<section class="model-header"><div class="wrap"><div class="breadcrumb"><a href="#home">ראשי</a> ← ${w.brand} ← ${w.model}</div><div class="model-grid"><div class="watch-visual"><div class="watch-placeholder"><span>${w.brand}<br>${w.ref}</span></div></div><div class="model-info"><div class="eyebrow">${w.status.toUpperCase()} · ${w.brand.toUpperCase()}</div><h1>${w.model}</h1><div class="sub">Reference ${w.ref} · ${w.year}</div><div class="price-panel"><div class="price-box"><small>שווי שוק מוערך</small><b>${fmt(w.market)}</b></div><div class="price-box"><small>Retail / MSRP</small><b>${fmt(w.retail)}</b></div><div class="price-box"><small>12 חודשים</small><b class="${w.change>=0?'positive':'negative'}">${w.change>=0?'+':''}${w.change}%</b></div></div><div class="chart-card"><div class="chart-toolbar"><b>Market Price History</b><div class="periods"><button>1M</button><button>6M</button><button class="active">1Y</button><button>5Y</button></div></div><div class="big-chart">${chartSvg(w.change>=0)}</div></div><div class="details-grid"><div class="detail"><small>סטטוס</small><b>${w.status}</b></div><div class="detail"><small>קוטר</small><b>${w.size}</b></div><div class="detail"><small>חומר</small><b>${w.material}</b></div><div class="detail"><small>סחירות</small><b>${w.liquidity}</b></div></div>${premium?`<div class="premium-lock"><div><h3>Premium מעל Retail: <span class="positive">+${premium}%</span></h3><p>פתח היסטוריית מחיר מלאה, מחיר ישראל מול העולם והתראות מחיר.</p></div><button class="primary-btn" data-open-pricing>התחל 7 ימים חינם</button></div>`:`<div class="premium-lock"><div><h3>דגם Discontinued</h3><p>פתח מחיר ביום הפסקת הייצור, גרף מאז Discontinuation ועסקאות אחרונות.</p></div><button class="primary-btn" data-open-pricing>התחל 7 ימים חינם</button></div>`}</div></div></div></section><div class="demo-note">MVP · המחירים כרגע להמחשה בלבד</div>`;
 bindGlobal();
}

function bindHome(){
 bindGlobal();
 document.querySelectorAll('[data-ref]').forEach(r=>r.addEventListener('click',()=>location.hash='watch/'+r.dataset.ref));
 document.querySelectorAll('[data-brand]').forEach(el=>el.addEventListener('click',()=>{ const term=el.dataset.brand; app.innerHTML=`${marketSection(term)}${brandsSection()}<div class="demo-note">סינון לפי ${term}</div>`; bindHome(); window.scrollTo(0,0); }));
 const form=document.getElementById('searchForm'); if(form) form.addEventListener('submit',e=>{e.preventDefault(); const q=document.getElementById('searchInput').value.trim(); const exact=watches.find(w=>w.ref.toLowerCase()===q.toLowerCase()); if(exact) location.hash='watch/'+exact.ref; else { app.innerHTML=`${marketSection(q)}${brandsSection()}<div class="demo-note">תוצאות חיפוש: ${q || 'הכל'}</div>`; bindHome(); window.scrollTo(0,0);} });
}
function bindGlobal(){
 document.querySelectorAll('[data-open-pricing]').forEach(b=>b.addEventListener('click',()=>document.getElementById('pricingModal').hidden=false));
 document.querySelectorAll('[data-close-pricing]').forEach(b=>b.addEventListener('click',()=>document.getElementById('pricingModal').hidden=true));
}
function router(){ const h=location.hash.replace('#','')||'home'; if(h.startsWith('watch/')) modelPage(decodeURIComponent(h.split('/')[1])); else home(); }
window.addEventListener('hashchange',router); bindGlobal(); router();
