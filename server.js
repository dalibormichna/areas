const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const ARES = 'ares.gov.cz';
const SEARCH_PATH = '/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat';
const DETAIL_PATH = '/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/';
const RZP_PATH = '/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty-rzp/';

const HTML = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ARES Tracker — Gastro & Ubytování</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#f4f6f9; --s1:#ffffff; --s2:#f0f2f5; --s3:#e8eaed;
  --border:#dde1e7; --border2:#c8cdd5;
  --accent:#1d6ae5; --a2:#0f4bb5; --green:#16a34a; --blue:#1d6ae5;
  --red:#dc2626; --text:#1a1f2e; --muted:#6b7280; --mono:'IBM Plex Mono',monospace; --sans:'Inter',sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;font-size:14px;}
header{
  position:relative;z-index:2;padding:16px 28px;
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:16px;flex-wrap:wrap;
  background:var(--s1);box-shadow:0 1px 3px rgba(0,0,0,.06);
}
.logo{font-size:1.3rem;font-weight:700;letter-spacing:-.03em;color:var(--accent);}
.logo-sub{font-family:var(--mono);font-size:.55rem;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-top:1px;}
.tag{font-family:var(--mono);font-size:.6rem;padding:3px 9px;border-radius:20px;
  background:rgba(22,163,74,.1);color:var(--green);border:1px solid rgba(22,163,74,.3);margin-left:auto;}
.layout{display:grid;grid-template-columns:260px 1fr;min-height:calc(100vh - 57px);}
aside{
  background:var(--s1);border-right:1px solid var(--border);
  padding:18px 14px;display:flex;flex-direction:column;gap:12px;
  position:sticky;top:0;height:calc(100vh - 57px);overflow-y:auto;
}
.section-label{font-size:.6rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;
  color:var(--muted);margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid var(--border);}
.field label{display:block;font-size:.65rem;font-weight:500;color:var(--muted);margin-bottom:3px;}
.field input,.field select{
  width:100%;background:var(--s2);border:1px solid var(--border2);border-radius:6px;
  color:var(--text);font-family:var(--sans);font-size:.78rem;padding:7px 10px;
  outline:none;transition:border-color .15s;}
.field input:focus,.field select:focus{border-color:var(--accent);}
.field input::placeholder{color:var(--muted);}
.btn{
  width:100%;background:var(--accent);color:#fff;border:none;border-radius:7px;padding:10px;
  font-family:var(--sans);font-weight:600;font-size:.82rem;cursor:pointer;transition:background .15s;
}
.btn:hover{background:var(--a2);}.btn:disabled{opacity:.5;cursor:not-allowed;}
.btn-outline{
  width:100%;background:transparent;border:1px solid var(--border2);
  color:var(--muted);border-radius:7px;padding:8px;font-family:var(--sans);font-weight:500;font-size:.75rem;cursor:pointer;
  transition:border-color .15s,color .15s;
}
.btn-outline:hover{border-color:var(--accent);color:var(--accent);}
.btn-outline:disabled{opacity:.4;cursor:not-allowed;}
.info-box{background:var(--s2);border:1px solid var(--border);border-radius:7px;
  padding:10px 11px;font-size:.63rem;color:var(--muted);line-height:1.65;}
.info-box b{color:var(--accent);}
main{padding:18px 22px;overflow:hidden;}
.topbar{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.search-input{
  flex:1;min-width:200px;background:var(--s1);border:1px solid var(--border2);
  border-radius:7px;color:var(--text);font-size:.78rem;padding:8px 13px;outline:none;
}
.search-input:focus{border-color:var(--accent);}
.search-input::placeholder{color:var(--muted);}
.btn-sm{
  background:var(--s1);border:1px solid var(--border2);color:var(--muted);
  border-radius:6px;padding:7px 13px;font-size:.72rem;font-weight:500;cursor:pointer;
  transition:border-color .15s,color .15s;white-space:nowrap;
}
.btn-sm:hover{border-color:var(--accent);color:var(--accent);}
.stats{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.stat{background:var(--s1);border:1px solid var(--border);border-radius:8px;padding:9px 13px;flex:1;min-width:80px;}
.stat .n{font-size:1.3rem;font-weight:700;letter-spacing:-.03em;color:var(--accent);}
.stat .l{font-size:.57rem;font-weight:500;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-top:1px;}
.table-wrap{background:var(--s1);border:1px solid var(--border);border-radius:9px;overflow:hidden;}
table{width:100%;border-collapse:collapse;}
thead th{
  background:var(--s2);padding:8px 10px;text-align:left;
  font-size:.6rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;
  color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap;
  cursor:pointer;user-select:none;transition:color .15s;
}
thead th:hover{color:var(--accent);}
tbody tr{border-bottom:1px solid var(--border);transition:background .1s;cursor:pointer;}
tbody tr:hover{background:rgba(29,106,229,.03);}
tbody tr:last-child{border-bottom:none;}
tbody tr.selected{background:rgba(29,106,229,.06)!important;}
td{padding:8px 10px;vertical-align:middle;font-size:.78rem;}
.td-name{font-weight:600;max-width:220px;}
.td-name small{display:block;font-family:var(--mono);font-size:.6rem;color:var(--muted);font-weight:400;margin-top:1px;}
.td-ico{font-family:var(--mono);font-size:.7rem;color:var(--accent);}
.td-date{font-family:var(--mono);font-size:.68rem;}
.td-addr{font-size:.72rem;color:var(--muted);max-width:200px;line-height:1.4;}
.badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:.58rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.bh{background:rgba(29,106,229,.1);color:#1d6ae5;border:1px solid rgba(29,106,229,.25);}
.br{background:rgba(234,88,12,.1);color:#ea580c;border:1px solid rgba(234,88,12,.25);}
.bp{background:rgba(22,163,74,.1);color:#16a34a;border:1px solid rgba(22,163,74,.25);}
.bj{background:rgba(107,114,128,.1);color:#6b7280;border:1px solid rgba(107,114,128,.25);}
.new-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:5px;vertical-align:middle;}
.date-new{color:var(--green);font-weight:600;}
.pgn{display:flex;align-items:center;gap:5px;padding:9px 11px;border-top:1px solid var(--border);flex-wrap:wrap;background:var(--s2);}
.pgn span{font-family:var(--mono);font-size:.62rem;color:var(--muted);flex:1;}
.pb{background:var(--s1);border:1px solid var(--border);color:var(--text);border-radius:5px;
  padding:4px 9px;cursor:pointer;font-family:var(--mono);font-size:.65rem;}
.pb:hover{border-color:var(--accent);color:var(--accent);}.pb.act{background:var(--accent);border-color:var(--accent);color:#fff;}
.state{text-align:center;padding:56px 20px;}
.state .icon{font-size:2rem;margin-bottom:10px;}
.state h3{font-weight:600;margin-bottom:6px;color:var(--text);}
.state p{font-size:.72rem;color:var(--muted);max-width:360px;margin:0 auto;line-height:1.6;}
.spinner{display:inline-block;width:24px;height:24px;border:2.5px solid var(--border2);
  border-top-color:var(--accent);border-radius:50%;animation:sp .6s linear infinite;margin-bottom:10px;}
@keyframes sp{to{transform:rotate(360deg)}}
.log{font-family:var(--mono);font-size:.65rem;color:var(--muted);margin-top:8px;line-height:1.7;}
.log b{color:var(--accent);}
.detail-panel{
  position:fixed;right:0;top:0;bottom:0;width:360px;
  background:var(--s1);border-left:1px solid var(--border);
  z-index:100;transform:translateX(100%);
  transition:transform .25s cubic-bezier(.4,0,.2,1);
  display:flex;flex-direction:column;box-shadow:-4px 0 16px rgba(0,0,0,.08);
}
.detail-panel.open{transform:translateX(0);}
.dp-header{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:10px;background:var(--s2);}
.dp-name{font-weight:700;font-size:.95rem;line-height:1.3;flex:1;color:var(--text);}
.dp-close{background:var(--s1);border:1px solid var(--border);color:var(--muted);border-radius:6px;
  padding:4px 10px;cursor:pointer;font-size:.72rem;}
.dp-body{flex:1;overflow-y:auto;padding:0;}
.dp-section{padding:14px 18px;border-bottom:1px solid var(--border);}
.dp-section h4{font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px;}
.dp-row{display:flex;gap:8px;margin-bottom:6px;font-size:.78rem;}
.dp-row .k{color:var(--muted);min-width:90px;font-size:.72rem;}
.dp-row .v{color:var(--text);font-weight:500;flex:1;}
.person-card{background:var(--s2);border-radius:6px;padding:8px 11px;margin-bottom:6px;}
.person-card .pn{font-weight:600;font-size:.82rem;}
.person-card .pt{font-size:.68rem;color:var(--muted);margin-top:2px;}
.dp-btn{display:block;background:var(--s2);border:1px solid var(--border);color:var(--accent);
  border-radius:6px;padding:9px 14px;text-decoration:none;font-size:.75rem;font-weight:500;
  margin:10px 18px 0;transition:background .15s;}
.dp-btn:hover{background:var(--s3);}
.dp-spinner{text-align:center;padding:40px 20px;color:var(--muted);font-size:.75rem;}
.no-phone{color:var(--red);font-size:.6rem;margin-top:5px;display:block;}
</style>
</head>
<body>
<header>
  <div>
    <div class="logo">ARES TRACKER</div>
    <div class="logo-sub">Gastro · Ubytování · ČR</div>
  </div>
  <span class="tag" id="serverStatus">⚙ Připojuji…</span>
</header>
<div class="layout">
<aside>
  <div>
    <div class="section-label">Typ podniku</div>
    <div class="field">
      <select id="selType">
        <option value="55,56">Vše (gastro + ubytování)</option>
        <option value="56" selected>Vše stravování (56xx)</option>
        <option value="5610">Restaurace, hospody, kantýny (5610)</option>
        <option value="5629">Školní jídelny, vývařovny (5629)</option>
        <option value="5621">Catering (5621)</option>
        <option value="5630">Bary, kavárny (5630)</option>
        <option value="55">Vše ubytování (55xx)</option>
        <option value="5510">Hotely (5510)</option>
        <option value="5520">Penziony, rekreace (5520)</option>
      </select>
    </div>
  </div>
  <div>
    <div class="section-label">Lokalita</div>
    <div class="field">
      <label>Město / obec</label>
      <input type="text" id="inpObec" placeholder="Praha, Brno, Ostrava…">
    </div>
  </div>
  <div>
    <div class="section-label">Počet výsledků</div>
    <div class="field">
      <select id="selCount">
        <option value="100" selected>100</option>
        <option value="200">200</option>
        <option value="500">500</option>
      </select>
    </div>
  </div>
  <button class="btn" id="btnFetch" onclick="fetchData()">🔍 Načíst z ARES</button>
  <button class="btn-outline" id="btnExport" onclick="exportCSV()" disabled>⬇ Export CSV</button>
  <div class="info-box">
    <b>Data z ARES:</b><br>
    ✓ IČO, název, adresa<br>
    ✓ Datum vzniku záznamu<br>
    ✓ NACE kód (obor)<br>
    ✓ Kraj, okres<br>
    <span class="no-phone">✗ Telefon v ARES není</span>
  </div>
</aside>
<main>
  <div class="topbar">
    <input class="search-input" id="searchInput" placeholder="Hledat v načtených datech…" oninput="applyFilters()">
    <select id="selPeriod" onchange="applyFilters()" style="background:var(--s1);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;font-size:.75rem;color:var(--text);outline:none;">
      <option value="0">— všechny —</option>
      <option value="3">Vznik: posl. 3 měs.</option>
      <option value="6">Vznik: posl. 6 měs.</option>
      <option value="12">Vznik: posl. 1 rok</option>
      <option value="24">Vznik: posl. 2 roky</option>
      <option value="36">Vznik: posl. 3 roky</option>
    </select>
    <button class="btn-sm" onclick="clearFilters()">✕ Reset</button>
  </div>
  <div class="stats" id="statsBar" style="display:none">
    <div class="stat"><div class="n" id="sShown">0</div><div class="l">Zobrazeno</div></div>
    <div class="stat"><div class="n" id="sTotal">0</div><div class="l">Načteno</div></div>
    <div class="stat"><div class="n" id="sRest">0</div><div class="l">Stravování</div></div>
    <div class="stat"><div class="n" id="sHotel">0</div><div class="l">Ubytování</div></div>
  </div>
  <div class="table-wrap">
    <div id="stateBox" class="state">
      <div class="icon">🍽️</div>
      <h3>Připraveno</h3>
      <p>Vyberte typ podniku a klikněte Načíst z ARES.</p>
    </div>
    <div id="tblWrap" style="display:none">
      <table>
        <thead><tr>
          <th onclick="srt('name')">Název ↕</th>
          <th onclick="srt('ico')">IČO</th>
          <th onclick="srt('type')">Typ</th>
          <th onclick="srt('date')">Vznik ↕</th>
          <th>Adresa</th>
          <th>Kraj</th>
          <th>NACE</th>
        </tr></thead>
        <tbody id="tBody"></tbody>
      </table>
      <div class="pgn" id="pgn"></div>
    </div>
  </div>
</main>
</div>
<div class="detail-panel" id="detailPanel">
  <div class="dp-header">
    <div class="dp-name" id="dpName">—</div>
    <button class="dp-close" onclick="closeDetail()">✕ Zavřít</button>
  </div>
  <div class="dp-body" id="dpBody"></div>
</div>
<script>
const SERVER = '';
let all=[], fil=[], sk='date', sd=-1, pg=0, selIco=null;
const PS=30;

const NM={
  '5610':'Restaurace/Hospoda','5621':'Catering','5629':'Jídelna/Vývařovna',
  '5630':'Bar/Kavárna','5510':'Hotel','5520':'Penzion/Rekreace',
  '5530':'Kemp','5590':'Ostatní ubyt.','56':'Stravování','55':'Ubytování'
};
const nm=c=>{if(!c)return'—';const k4=c.slice(0,4);const k2=c.slice(0,2);return NM[c]||NM[k4]||NM[k2]||c;};
const gt=n=>{if(!n)return'other';const k=n.slice(0,4);if(['5510','5520','5530','5590'].includes(k))return'hotel';if(k==='5610'||k==='5630')return'rest';if(k==='5629')return'jidelna';return'other';};
const bdg=t=>{
  const m={hotel:['bh','Hotel'],rest:['br','Restaurace'],jidelna:['bp','Jídelna'],other:['bj','Jiné']};
  const[c,l]=m[t]||m.other;return \`<span class="badge \${c}">\${l}</span>\`;
};
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt=d=>d?new Date(d).toLocaleDateString('cs-CZ'):'—';

async function checkServer(){
  try{
    const r=await fetch('/ping');
    const j=await r.json();
    if(r.ok&&j.ok){
      document.getElementById('serverStatus').textContent=\`● Online (\${j.v||'ok'})\`;
      document.getElementById('serverStatus').style.cssText='background:rgba(22,163,74,.1);color:#16a34a;border:1px solid rgba(22,163,74,.3);font-size:.6rem;padding:3px 9px;border-radius:20px;margin-left:auto;';
    } else throw new Error();
  }catch{
    document.getElementById('serverStatus').textContent='✗ Offline';
    document.getElementById('serverStatus').style.cssText='background:rgba(220,38,38,.1);color:#dc2626;border:1px solid rgba(220,38,38,.3);font-size:.6rem;padding:3px 9px;border-radius:20px;margin-left:auto;';
  }
}
checkServer();

async function fetchData(){
  const btn=document.getElementById('btnFetch');
  btn.disabled=true; btn.textContent='⏳ Načítám…';
  closeDetail();
  const tv=document.getElementById('selType').value;
  const obec=document.getElementById('inpObec').value.trim();
  const cnt=parseInt(document.getElementById('selCount').value);
  showSt('loading',\`NACE: <b>\${tv}</b>\${obec?' | Obec: <b>'+obec+'</b>':''} | Max: \${cnt}\`);
  try{
    const r=await fetch('/api/search',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({czNace:[tv],obec,pocet:cnt})
    });
    const res=await r.json();
    if(!res.ok)throw new Error(res.error||'Chyba serveru');
    all=res.data||[];
    document.getElementById('btnExport').disabled=false;
    pg=0; applyFilters();
  }catch(e){
    showSt('error',e.message);
  }
  btn.disabled=false; btn.textContent='🔍 Načíst z ARES';
}

function applyFilters(){
  const q=(document.getElementById('searchInput').value||'').toLowerCase();
  const months=parseInt(document.getElementById('selPeriod').value||'0');
  const cutoff=months?new Date(Date.now()-months*30.5*24*60*60*1000):null;
  fil=all.filter(d=>{
    if(q&&!(d.name.toLowerCase().includes(q)||d.ico.includes(q)||d.addr.toLowerCase().includes(q)))return false;
    if(cutoff&&d.date&&new Date(d.date)<cutoff)return false;
    return true;
  });
  pg=0; updateStats(); doSort(sk,true);
}

function clearFilters(){
  document.getElementById('searchInput').value='';
  document.getElementById('selPeriod').value='0';
  applyFilters();
}

function updateStats(){
  document.getElementById('sShown').textContent=fil.length;
  document.getElementById('sTotal').textContent=all.length;
  document.getElementById('sRest').textContent=fil.filter(d=>d.nace&&d.nace.startsWith('56')).length;
  document.getElementById('sHotel').textContent=fil.filter(d=>d.nace&&d.nace.startsWith('55')).length;
  document.getElementById('statsBar').style.display='flex';
}

function srt(k){if(sk===k)sd*=-1;else{sk=k;sd=k==='date'?-1:1;}doSort(k,true);}
function doSort(k){
  fil.sort((a,b)=>{
    const va=k==='date'?(a.date||''):k==='type'?gt(a.nace):k==='name'?a.name.toLowerCase():(a[k]||'');
    const vb=k==='date'?(b.date||''):k==='type'?gt(b.nace):k==='name'?b.name.toLowerCase():(b[k]||'');
    return va<vb?-sd:va>vb?sd:0;
  });
  renderTable();
}

function renderTable(){
  if(!fil.length){showSt(all.length?'empty':'ready');return;}
  document.getElementById('stateBox').style.display='none';
  document.getElementById('tblWrap').style.display='block';
  const ago=new Date();ago.setMonth(ago.getMonth()-6);
  const sl=fil.slice(pg*PS,(pg+1)*PS);
  document.getElementById('tBody').innerHTML=sl.map(d=>{
    const t=gt(d.nace);
    const isNew=d.date&&new Date(d.date)>=ago;
    const sel=d.ico===selIco?'selected':'';
    return \`<tr class="\${sel}" onclick="openDetail('\${d.ico}')">
      <td class="td-name">\${isNew?'<span class="new-dot"></span>':''}\${esc(d.name)}<small>\${esc(d.dic?'DIČ: '+d.dic:'')}</small></td>
      <td class="td-ico">\${esc(d.ico)}</td>
      <td>\${bdg(t)}</td>
      <td class="td-date \${isNew?'date-new':''}">\${fmt(d.date)}</td>
      <td class="td-addr">\${esc(d.addr)}</td>
      <td style="font-size:.7rem;color:var(--muted)">\${esc(d.kraj)}</td>
      <td style="font-family:var(--mono);font-size:.65rem;color:var(--muted)">\${nm(d.nace)}</td>
    </tr>\`;
  }).join('');
  renderPgn();
}

function renderPgn(){
  const tot=Math.ceil(fil.length/PS);
  if(tot<=1){document.getElementById('pgn').innerHTML='';return;}
  let h=\`<span>\${fil.length} výsledků · strana \${pg+1} z \${tot}</span>\`;
  if(pg>0)h+=\`<button class="pb" onclick="gp(\${pg-1})">‹</button>\`;
  for(let i=Math.max(0,pg-2);i<Math.min(tot,pg+3);i++)h+=\`<button class="pb \${i===pg?'act':''}" onclick="gp(\${i})">\${i+1}</button>\`;
  if(pg<tot-1)h+=\`<button class="pb" onclick="gp(\${pg+1})">›</button>\`;
  document.getElementById('pgn').innerHTML=h;
}
function gp(p){pg=p;renderTable();window.scrollTo(0,0);}

async function openDetail(ico){
  selIco=ico; renderTable();
  const d=all.find(x=>x.ico===ico);
  if(!d)return;
  document.getElementById('dpName').textContent=d.name;
  document.getElementById('detailPanel').classList.add('open');
  document.getElementById('dpBody').innerHTML=\`<div class="dp-spinner"><div class="spinner" style="margin:0 auto 8px"></div>Načítám detail…</div>\`;
  try{
    const r=await fetch(\`/api/detail/\${ico}\`);
    const res=await r.json();
    renderDetail(d,res);
  }catch(e){ renderDetail(d,null); }
}

function renderDetail(d,res){
  const rzp=res?.rzp||{};
  const osoby=rzp.osoby||[];
  document.getElementById('dpBody').innerHTML=\`
  <div class="dp-section">
    <h4>Základní údaje</h4>
    <div class="dp-row"><span class="k">IČO</span><span class="v"><b style="color:var(--accent)">\${esc(d.ico)}</b></span></div>
    \${d.dic?\`<div class="dp-row"><span class="k">DIČ</span><span class="v">\${esc(d.dic)}</span></div>\`:''}
    <div class="dp-row"><span class="k">NACE</span><span class="v">\${esc(d.nace)} — \${nm(d.nace)}</span></div>
    <div class="dp-row"><span class="k">Vznik</span><span class="v">\${fmt(d.date)}</span></div>
  </div>
  <div class="dp-section">
    <h4>Adresa sídla</h4>
    <div class="dp-row"><span class="k">Adresa</span><span class="v">\${esc(d.addr)}</span></div>
    \${d.okres?\`<div class="dp-row"><span class="k">Okres</span><span class="v">\${esc(d.okres)}</span></div>\`:''}
    \${d.kraj?\`<div class="dp-row"><span class="k">Kraj</span><span class="v">\${esc(d.kraj)}</span></div>\`:''}
  </div>
  <div class="dp-section">
    <h4>Odpovědné osoby (RŽP)</h4>
    \${osoby.length?osoby.map(o=>\`<div class="person-card"><div class="pn">\${esc(o.jmeno)||'—'}</div><div class="pt">\${esc(o.funkce)}</div></div>\`).join(''):'<div style="font-size:.7rem;color:var(--muted)">Žádné osoby nenalezeny</div>'}
  </div>
  <a class="dp-btn" href="https://ares.gov.cz/ekonomicke-subjekty-v-be/detail?ico=\${d.ico}" target="_blank">↗ Otevřít v ARES</a>
  <a class="dp-btn" style="margin-top:6px" href="https://www.google.com/search?q=\${encodeURIComponent(d.name+' '+d.obec)}" target="_blank">↗ Google</a>
  <a class="dp-btn" style="margin-top:6px" href="https://maps.google.com/?q=\${encodeURIComponent(d.name+' '+d.addr)}" target="_blank">↗ Mapy</a>\`;
}

function closeDetail(){
  selIco=null;
  document.getElementById('detailPanel').classList.remove('open');
  renderTable();
}

function showSt(type,msg){
  document.getElementById('tblWrap').style.display='none';
  const b=document.getElementById('stateBox');
  b.style.display='block';
  if(type==='loading')b.innerHTML=\`<div class="spinner"></div><h3>Načítám z ARES…</h3><div class="log">\${msg}</div>\`;
  else if(type==='error')b.innerHTML=\`<div class="icon">⚠️</div><h3>Chyba</h3><div class="log">\${msg}</div>\`;
  else if(type==='empty')b.innerHTML=\`<div class="icon">🔍</div><h3>Žádné výsledky</h3><p>Zkus jiný filtr nebo delší časové období.</p>\`;
  else b.innerHTML=\`<div class="icon">🍽️</div><h3>Připraveno</h3><p>Vyberte typ a klikněte Načíst z ARES.</p>\`;
}

function exportCSV(){
  const h=['Název','IČO','DIČ','Typ','Datum vzniku','Adresa','Obec','Okres','Kraj','PSČ','NACE','ARES'];
  const rows=fil.map(d=>[
    d.name,d.ico,d.dic||'',nm(d.nace),
    d.date?new Date(d.date).toLocaleDateString('cs-CZ'):'',
    d.addr,d.obec,d.okres,d.kraj,d.psc,d.nace,
    \`https://ares.gov.cz/ekonomicke-subjekty-v-be/detail?ico=\${d.ico}\`
  ]);
  const csv=[h,...rows].map(r=>r.map(v=>\`"\${String(v||'').replace(/"/g,'""')}"\`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download=\`ares-gastro-\${new Date().toISOString().slice(0,10)}.csv\`;
  a.click();
}

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail();});
</script>
</body>
</html>`;

function aresRequest(method, path, payload) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const opts = {
      hostname: ARES, path, method,
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, json: null, raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body); // Klíčová oprava pro POST
    req.end();
  });
}

function buildResult(s) {
  const sidlo = s.sidlo || {};
  const addr = [sidlo.nazevUlice, sidlo.cisloDomovni, sidlo.nazevObce].filter(Boolean).join(', ');
  return {
    ico: s.ico || '', name: s.obchodniJmeno || '',
    nace: (s.czNace || [])[0] || '',
    date: s.datumVzniku || '', addr, obec: sidlo.nazevObce || ''
  };
}

app.get('/', (req, res) => res.send(HTML));
app.get('/ping', (req, res) => res.json({ ok: true, v: '5-fixed' }));

app.post('/api/search', async (req, res) => {
  // Complete CZ-NACE gastro/ubytovani mapping
  const NACE_MAP = {
    '56':    ['5610','5621','5629','5630'],
    '5610':  ['5610'],
    '5621':  ['5621'],
    '5629':  ['5629'],
    '5630':  ['5630'],
    '55':    ['5510','5520','5530','5590'],
    '5510':  ['5510'],
    '5520':  ['5520'],
    '55,56': ['5610','5621','5629','5630','5510','5520','5530','5590'],
  };
  try {
    const { czNace = ['56'], obec = '', pocet = 100 } = req.body;
    const inputKey = Array.isArray(czNace) ? czNace.join(',') : String(czNace);
    const naceArr = NACE_MAP[inputKey] || NACE_MAP[czNace[0]] || [inputKey];
    const maxCount = Math.min(Number(pocet)||100, 500);
    const obecFilter = obec ? obec.trim().toLowerCase() : '';
    const seen = new Set();
    const results = [];
    for (const nace of naceArr) {
      const fetchCount = obecFilter ? 500 : maxCount;
      const payload = { czNace: [nace], pocet: fetchCount, start: 0 };
      const r = await aresRequest('POST', SEARCH_PATH, payload);
      if (r.status !== 200) { console.log('ARES err nace='+nace, r.status, r.raw&&r.raw.slice(0,100)); continue; }
      for (const s of (r.json && r.json.ekonomickeSubjekty) || []) {
        if (seen.has(s.ico)) continue;
        const result = buildResult(s);
        if (obecFilter) {
          const match = result.obec.toLowerCase().includes(obecFilter) ||
                        result.addr.toLowerCase().includes(obecFilter);
          if (!match) continue;
        }
        seen.add(s.ico);
        results.push(result);
        if (!obecFilter && results.length >= maxCount) break;
      }
    }
    res.json({ ok: true, total: results.length, data: results });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/detail/:ico', async (req, res) => {
  try {
    const { ico } = req.params;
    const r = await aresRequest('GET', DETAIL_PATH + ico, null);
    const r2 = await aresRequest('GET', RZP_PATH + ico, null);
    let osoby = [];
    if(r2.json && r2.json.zaznamy && r2.json.zaznamy[0]) {
      osoby = (r2.json.zaznamy[0].angazovaneOsoby || []).map(o => ({
        jmeno: (o.jmeno + ' ' + o.prijmeni).trim(), funkce: o.typAngazma
      }));
    }
    res.json({ ok: true, rzp: { osoby } });
  } catch (e) { res.status(500).json({ ok: false }); }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log('Server running on port ' + port));