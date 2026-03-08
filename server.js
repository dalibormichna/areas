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
  --bg:#f0f2f5; --s1:#ffffff; --s2:#f5f7fa; --s3:#ebedf0;
  --border:#d8dce3; --border2:#c4c9d4;
  --accent:#2563eb; --a2:#1d4ed8; --green:#16a34a; --blue:#2563eb;
  --red:#dc2626; --text:#111827; --muted:#6b7280; --mono:'IBM Plex Mono',monospace; --sans:'Inter',sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;font-size:14px;}

header{
  position:relative;z-index:2;padding:16px 28px;
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:16px;flex-wrap:wrap;
  background:var(--s1);box-shadow:0 1px 4px rgba(0,0,0,.07);
}
.logo{font-size:1.25rem;font-weight:700;letter-spacing:-.02em;color:var(--accent);}
.logo-sub{font-family:var(--mono);font-size:.55rem;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-top:2px;}
.tag{font-family:var(--mono);font-size:.6rem;padding:3px 9px;border-radius:20px;
  background:rgba(22,163,74,.1);color:var(--green);border:1px solid rgba(22,163,74,.3);margin-left:auto;}

.layout{display:grid;grid-template-columns:280px 1fr;min-height:calc(100vh - 57px);}

aside{
  background:var(--s1);border-right:1px solid var(--border);
  padding:20px 16px;display:flex;flex-direction:column;gap:14px;
  position:sticky;top:0;height:calc(100vh - 57px);overflow-y:auto;
}
.section-label{font-family:var(--mono);font-size:.58rem;text-transform:uppercase;letter-spacing:.12em;
  color:var(--muted);margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid var(--border);}

.field label{display:block;font-family:var(--mono);font-size:.6rem;text-transform:uppercase;
  letter-spacing:.09em;color:var(--muted);margin-bottom:4px;}
.field input,.field select{
  width:100%;background:var(--s2);border:1px solid var(--border2);border-radius:6px;
  color:var(--text);font-family:var(--mono);font-size:.75rem;padding:7px 10px;
  outline:none;-webkit-appearance:none;transition:border-color .15s;}
.field input:focus,.field select:focus{border-color:var(--accent);}
.field input::placeholder{color:var(--muted);}

.btn{
  width:100%;background:linear-gradient(135deg,var(--accent),var(--a2));
  color:#000;border:none;border-radius:7px;padding:10px;
  font-family:var(--sans);font-weight:700;font-size:.82rem;
  cursor:pointer;transition:opacity .15s;letter-spacing:.02em;
}
.btn:hover{opacity:.88;}.btn:disabled{opacity:.4;cursor:not-allowed;}
.btn-outline{
  width:100%;background:transparent;border:1px solid var(--border2);
  color:var(--muted);border-radius:7px;padding:8px;
  font-family:var(--sans);font-weight:600;font-size:.75rem;cursor:pointer;
  transition:border-color .15s,color .15s;
}
.btn-outline:hover{border-color:var(--accent);color:var(--accent);}

.info-box{background:var(--s2);border:1px solid var(--border);border-radius:8px;
  padding:11px 12px;font-family:var(--mono);font-size:.63rem;color:var(--muted);line-height:1.65;}
.info-box b{color:var(--accent);}
.info-box .no-phone{color:var(--red);font-size:.6rem;margin-top:6px;display:block;}

main{padding:20px 24px;overflow:hidden;}

.topbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.search-input{
  flex:1;min-width:200px;background:var(--s2);border:1px solid var(--border2);
  border-radius:7px;color:var(--text);font-family:var(--mono);font-size:.75rem;
  padding:8px 13px;outline:none;
}
.search-input:focus{border-color:var(--accent);}
.sort-select{
  background:var(--s2);border:1px solid var(--border2);border-radius:7px;
  color:var(--text);font-family:var(--mono);font-size:.72rem;padding:8px 10px;
  outline:none;-webkit-appearance:none;cursor:pointer;white-space:nowrap;
}
.sort-select:focus{border-color:var(--accent);}

.stats{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.stat{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;flex:1;min-width:90px;}
.stat .n{font-size:1.4rem;font-weight:800;letter-spacing:-.04em;color:var(--accent);}
.stat .l{font-family:var(--mono);font-size:.57rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-top:2px;}

.table-wrap{background:var(--s1);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
table{width:100%;border-collapse:collapse;}
thead th{
  background:var(--s2);padding:9px 11px;text-align:left;
  font-family:var(--mono);font-size:.57rem;text-transform:uppercase;letter-spacing:.1em;
  color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap;
  cursor:pointer;
}
tbody tr{border-bottom:1px solid var(--border);transition:background .1s;cursor:pointer;}
tbody tr:hover{background:rgba(37,99,235,0.04);}
tbody tr.selected{background:rgba(37,99,235,0.07)!important;}
td{padding:9px 11px;vertical-align:middle;font-size:.78rem;}
.td-name{font-weight:600;max-width:220px;}
.td-name small{display:block;font-family:var(--mono);font-size:.62rem;color:var(--muted);font-weight:400;margin-top:2px;}
.td-ico{font-family:var(--mono);font-size:.72rem;color:var(--accent);}
.td-addr{font-size:.72rem;color:var(--muted);max-width:200px;line-height:1.4;}

.badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:.6rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.bh{background:rgba(37,99,235,.1);color:#1d4ed8;border:1px solid rgba(37,99,235,.25);}
.br{background:rgba(37,99,235,.08);color:var(--accent);border:1px solid rgba(37,99,235,.2);}
.bp{background:rgba(22,163,74,.1);color:var(--green);border:1px solid rgba(22,163,74,.25);}
.bc{background:rgba(124,58,237,.1);color:#7c3aed;border:1px solid rgba(124,58,237,.25);}
.bo{background:rgba(107,114,128,.1);color:var(--muted);border:1px solid rgba(107,114,128,.2);}
.new-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:5px;vertical-align:middle;}

.pgn{display:flex;align-items:center;gap:6px;padding:10px 12px;border-top:1px solid var(--border);flex-wrap:wrap;}
.pgn span{font-family:var(--mono);font-size:.65rem;color:var(--muted);flex:1;}
.pb{background:var(--s2);border:1px solid var(--border);color:var(--text);border-radius:5px;
  padding:4px 10px;cursor:pointer;font-family:var(--mono);font-size:.68rem;}
.pb.act{background:rgba(37,99,235,.1);border-color:var(--accent);color:var(--accent);}

.state{text-align:center;padding:56px 20px;}
.spinner{display:inline-block;width:26px;height:26px;border:2.5px solid var(--border2);
  border-top-color:var(--accent);border-radius:50%;animation:sp .6s linear infinite;margin-bottom:10px;}
@keyframes sp{to{transform:rotate(360deg)}}

.detail-panel{
  position:fixed;right:0;top:0;bottom:0;width:360px;
  background:var(--s1);border-left:1px solid var(--border);
  z-index:100;padding:0;transform:translateX(100%);
  transition:transform .25s cubic-bezier(.4,0,.2,1);
  display:flex;flex-direction:column;
}
.detail-panel.open{transform:translateX(0);}
.dp-header{padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:10px;}
.dp-name{font-weight:700;font-size:1rem;line-height:1.3;flex:1;}
.dp-close{background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;
  padding:4px 10px;cursor:pointer;font-size:.75rem;font-family:var(--mono);}
.dp-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:14px;}
.dp-section h4{font-family:var(--mono);font-size:.57rem;text-transform:uppercase;letter-spacing:.1em;
  color:var(--muted);margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);}
.dp-row{display:flex;gap:8px;margin-bottom:6px;font-size:.75rem;}
.dp-row .k{color:var(--muted);min-width:90px;font-family:var(--mono);font-size:.65rem;}
.dp-row .v{color:var(--text);font-weight:500;flex:1;word-break:break-all;}
.dp-row .v a{color:var(--accent);text-decoration:none;}
.dp-note{font-family:var(--mono);font-size:.62rem;color:var(--muted);background:var(--s2);
  border:1px solid var(--border);border-radius:6px;padding:9px 11px;line-height:1.6;}
.dp-note b{color:var(--red);}
.dp-btn{width:100%;text-align:center;background:rgba(37,99,235,0.06);border:1px solid rgba(37,99,235,.25);
  color:var(--accent);border-radius:6px;padding:8px;font-family:var(--mono);font-size:.7rem;
  cursor:pointer;text-decoration:none;display:block;}
.person-card,.prov-card{background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:9px 11px;margin-bottom:6px;font-size:.73rem;}
.person-card .pt{font-family:var(--mono);font-size:.6rem;color:var(--muted);}

@media(max-width:900px){
  .layout{grid-template-columns:1fr;}
  aside{position:static;height:auto;}
  .detail-panel{width:100%;}
}
.ver{position:fixed;bottom:6px;right:10px;font-family:var(--mono);font-size:.55rem;color:var(--muted);opacity:.5;pointer-events:none;}
</style>
</head>
<body>

<header>
  <div>
    <div class="logo">ARES TRACKER</div>
    <div class="logo-sub">Restaurace · Hotely · Penziony — ČR</div>
  </div>
  <span class="tag" id="serverStatus">⚙ Připojuji…</span>
</header>

<div class="layout">
<aside>
  <div>
    <div class="section-label">Typ podniku</div>
    <div class="field">
      <select id="selType">
        <option value="gastro">Vše gastro + ubytování</option>
        <option value="56">Stravování vše (56xx)</option>
        <option value="5610">Restaurace / pohostinství</option>
        <option value="5629">Jídelny, závodní strav., vývařovny</option>
        <option value="5621">Catering / dodávka jídel</option>
        <option value="5630">Bary, kavárny, pivnice</option>
        <option value="55">Ubytování vše (55xx)</option>
        <option value="5510">Hotely ★★★+</option>
        <option value="5590">Penziony, hostely</option>
      </select>
    </div>
  </div>

  <div>
    <div class="section-label">Lokalita</div>
    <div class="field">
      <label>Město / obec</label>
      <input type="text" id="inpObec" placeholder="Praha, Brno…">
    </div>
  </div>

  <div>
    <div class="section-label">Filtr vzniku</div>
    <div class="field">
      <select id="selPeriod">
        <option value="0">— všechny —</option>
        <option value="6">6 měsíců</option>
        <option value="12">12 měsíců</option>
      </select>
    </div>
  </div>

  <button class="btn" id="btnFetch" onclick="fetchData()">🔍 Načíst z ARES</button>
  <button class="btn-outline" id="btnExport" onclick="exportCSV()" disabled>⬇ Export CSV</button>

  <div class="info-box">
    <b>ARES Data:</b><br>
    ✓ IČO & Sídlo<br>
    ✓ Provozovny (RŽP)<br>
    <span class="no-phone">✗ Telefon v ARES není</span>
  </div>
</aside>

<main>
  <div class="topbar">
    <input class="search-input" id="searchInput" placeholder="Hledat název, IČO, obec…" oninput="applyFilters()">
    <select class="sort-select" id="selSort" onchange="applyFilters()">
      <option value="date_desc">Vznik ↓ nejnovější</option>
      <option value="date_asc">Vznik ↑ nejstarší</option>
      <option value="name_asc">Název A→Z</option>
    </select>
  </div>

  <div class="stats" id="statsBar" style="display:none">
    <div class="stat"><div class="n" id="sShown">0</div><div class="l">Zobrazeno</div></div>
    <div class="stat"><div class="n" id="sTotal">0</div><div class="l">Celkem</div></div>
  </div>

  <div class="table-wrap">
    <div id="stateBox" class="state">
      <h3>Připraveno</h3>
      <p>Vyplňte lokalitu a načtěte data.</p>
    </div>
    <div id="tblWrap" style="display:none">
      <table>
        <thead><tr>
          <th>Název</th>
          <th>IČO</th>
          <th>Typ</th>
          <th onclick="toggleDateSort()" style="cursor:pointer" id="thDate">Vznik ↓</th>
          <th>Adresa</th>
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
    <button class="dp-close" onclick="closeDetail()">✕</button>
  </div>
  <div class="dp-body" id="dpBody"></div>
</div>

<div class="ver">v8</div>

<script>
let all=[], fil=[], pg=0, selIco=null;
const PS=30;

const NM={
  '5610':'Restaurace','5621':'Catering','5629':'Jídelna/Výv.',
  '5630':'Bar/Kavárna','5510':'Hotel','5520':'Kemp/Chata',
  '5530':'Kempy','5590':'Penzion/Hostel'
};
const nm=c=>c?(NM[c]||NM[c.slice(0,4)]||(c.startsWith('56')?'Stravování':c.startsWith('55')?'Ubytování':c)):'—';
const gt=n=>{
  if(!n) return 'other';
  if(n.startsWith('5510')) return 'hotel';
  if(n.startsWith('55'))   return 'pension';
  if(n==='5621')           return 'catering';
  if(n.startsWith('56'))   return 'rest';
  return 'other';
};
const bdg=t=>{
  const m={hotel:['bh','Hotel'],pension:['bp','Ubytování'],rest:['br','Restaurace'],catering:['bc','Catering'],other:['bo','Jiné']};
  const[c,l]=m[t]||m.other;
  return \`<span class="badge \${c}">\${l}</span>\`;
};
const fmt=d=>d?new Date(d).toLocaleDateString('cs-CZ'):'—';

async function checkServer(){
  try{
    const r=await fetch('/ping');
    if(r.ok) document.getElementById('serverStatus').textContent='● Online';
  }catch(e){document.getElementById('serverStatus').textContent='✗ Offline';}
}
checkServer();

async function fetchData(){
  const btn=document.getElementById('btnFetch');
  btn.disabled=true;
  btn.textContent='⏳ Načítám…';
  const obec=document.getElementById('inpObec').value;
  const tv=document.getElementById('selType').value;
  
  try{
    const r=await fetch('/api/search',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({czNace:tv,obec,pocet:500})
    });
    const res=await r.json();
    if(res.ok){
      all=res.data;
      document.getElementById('btnExport').disabled=false;
      applyFilters();
    } else {
      alert('Chyba: '+(res.error||'neznámá'));
    }
  }catch(e){alert('Chyba spojení: '+e.message);}
  btn.disabled=false;
  btn.textContent='🔍 Načíst z ARES';
}

function applyFilters(){
  const q=document.getElementById('searchInput').value.toLowerCase();
  const months=parseInt(document.getElementById('selPeriod').value||'0');
  const sort=document.getElementById('selSort').value;

  let list=all.filter(d=>{
    if(q && !(d.name.toLowerCase().includes(q)||d.ico.includes(q)||d.addr.toLowerCase().includes(q))) return false;
    if(months){
      if(!d.date) return false;
      const cutoff=new Date();
      cutoff.setMonth(cutoff.getMonth()-months);
      if(new Date(d.date)<cutoff) return false;
    }
    return true;
  });

  if(sort==='date_desc') list.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  else if(sort==='date_asc') list.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  else if(sort==='name_asc') list.sort((a,b)=>a.name.localeCompare(b.name,'cs'));

  // Update header arrow
  const th=document.getElementById('thDate');
  if(th){
    if(sort==='date_desc') th.textContent='Vznik ↓';
    else if(sort==='date_asc') th.textContent='Vznik ↑';
    else th.textContent='Vznik';
  }

  fil=list;
  pg=0;
  updateStats();
  renderTable();
}

function toggleDateSort(){
  const sel=document.getElementById('selSort');
  sel.value=(sel.value==='date_desc')?'date_asc':'date_desc';
  applyFilters();
}

function updateStats(){
  document.getElementById('sShown').textContent=fil.length;
  document.getElementById('sTotal').textContent=all.length;
  document.getElementById('statsBar').style.display='flex';
}

function renderTable(){
  document.getElementById('stateBox').style.display='none';
  document.getElementById('tblWrap').style.display='block';
  const sl=fil.slice(pg*PS,(pg+1)*PS);
  document.getElementById('tBody').innerHTML=sl.map(d=>\`
    <tr onclick="openDetail('\${d.ico}')">
      <td class="td-name">\${d.name}</td>
      <td class="td-ico">\${d.ico}</td>
      <td>\${bdg(gt(d.nace))}</td>
      <td>\${fmt(d.date)}</td>
      <td class="td-addr">\${d.addr}</td>
    </tr>\`).join('');
}

async function openDetail(ico){
  const d=all.find(x=>x.ico===ico);
  document.getElementById('dpName').textContent=d.name;
  document.getElementById('detailPanel').classList.add('open');
  document.getElementById('dpBody').innerHTML='Načítám...';
  try{
    const r=await fetch(\`/api/detail/\${ico}\`);
    const res=await r.json();
    renderDetail(d, res);
  }catch(e){}
}

function renderDetail(d, res){
  const rzp=res.rzp||{};
  const osoby=rzp.osoby||[];
  let h=\`
    <div class="dp-section">
      <h4>Základní údaje</h4>
      <div class="dp-row"><span class="k">IČO</span><span class="v">\${d.ico}</span></div>
      <div class="dp-row"><span class="k">Vznik</span><span class="v">\${fmt(d.date)}</span></div>
    </div>
    <div class="dp-section">
      <h4>Osoby</h4>
      \${osoby.map(o=>\`<div class="person-card">\${o.jmeno}<div class="pt">\${o.funkce}</div></div>\`).join('')}
    </div>
    <a class="dp-btn" href="https://www.google.com/search?q=\${encodeURIComponent(d.name+' '+d.obec)}" target="_blank">↗ Google</a>
    <a class="dp-btn" style="margin-top:6px" href="https://maps.google.com/?q=\${encodeURIComponent(d.name+' '+d.addr)}" target="_blank">↗ Mapy</a>
  \`;
  document.getElementById('dpBody').innerHTML=h;
}

function closeDetail(){document.getElementById('detailPanel').classList.remove('open');}
function exportCSV(){ /* implementace exportu */ }
</script>
</body>
</html>
`;

function aresRequest(method, path, payload) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const opts = { hostname: ARES, path, method, headers };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, json: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('ARES timeout')); });
    if (body) req.write(body);
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
app.get('/ping', (req, res) => res.json({ ok: true, v: '8' }));

// DEBUG - ukáže co reálně vrací ARES pro daný NACE kód
app.get('/api/debug/:nace', async (req, res) => {
  try {
    const payload = { czNace: [req.params.nace], pocet: 3, start: 0 };
    const r = await aresRequest('POST', SEARCH_PATH, payload);
    res.json({ status: r.status, payload, raw: r.raw || null, json: r.json });
  } catch(e) { res.json({ error: e.message }); }
});
app.post('/api/search', async (req, res) => {
  // ARES API přijímá jen 2-místné kódy (56, 55) — 4místné vrátí 0 výsledků.
  // Pole czNace2008 v odpovědi obsahuje kódy různých délek: "56", "5610", "25610", "85321" atd.
  // POZOR: "25610" je výroba keramiky, NE restaurace — nesmíme použít endsWith!
  // Správný filtr: kód musí být PŘESNĚ roven hledanému kódu (n === a),
  // nebo musí začínat prefixem skupiny (startsWith pro 2místné agregace).

  const QUERY_MAP = {
    'gastro': { query:['56','55'], accept2:['56','55'] },
    '56':     { query:['56'],      accept2:['56'] },
    '5610':   { query:['56'],      accept4:['5610'] },
    '5621':   { query:['56'],      accept4:['5621'] },
    '5629':   { query:['56'],      accept4:['5629'] },
    '5630':   { query:['56'],      accept4:['5630'] },
    '55':     { query:['55'],      accept2:['55'] },
    '5510':   { query:['55'],      accept4:['5510'] },
    '5590':   { query:['55'],      accept4:['5590'] },
    '5520':   { query:['55'],      accept4:['5520'] },
  };

  // Vrátí true pokud subjekt odpovídá NACE filtru
  function naceMatch(s, cfg) {
    const codes = [...(s.czNace2008 || []), ...(s.czNace || [])];
    // accept2: přijmout vše kde je kód přesně "56" nebo "55" (subjekt má gastro/ubytování jako hlavní nebo vedlejší obor)
    if (cfg.accept2) {
      return codes.some(c => cfg.accept2.includes(c));
    }
    // accept4: přijmout jen pokud kód je PŘESNĚ 4místný kód (ne 25610, ale 5610)
    if (cfg.accept4) {
      return codes.some(c => cfg.accept4.includes(c));
    }
    return true;
  }

  try {
    const { czNace = 'gastro', obec = '', pocet = 200 } = req.body;
    const inputKey = Array.isArray(czNace) ? czNace.join(',') : String(czNace);
    const cfg = QUERY_MAP[inputKey] || { query:['56'], accept2:['56'] };
    const maxCount = Math.min(Number(pocet)||200, 500);
    const obecFilter = obec ? obec.trim().toLowerCase() : '';

    const seen = new Set();
    const results = [];

    for (const qNace of cfg.query) {
      const fetchCount = obecFilter ? 1000 : 500;
      const payload = { czNace: [qNace], pocet: fetchCount, start: 0 };

      console.log('ARES request:', JSON.stringify(payload));
      const r = await aresRequest('POST', SEARCH_PATH, payload);
      console.log('ARES response: status=' + r.status + ' pocetCelkem=' + (r.json?.pocetCelkem) + ' returned=' + (r.json?.ekonomickeSubjekty?.length));

      if (r.status !== 200 || !r.json) {
        console.log('ARES error nace=' + qNace + ':', r.raw?.slice(0,300));
        continue;
      }

      const subjekty = r.json.ekonomickeSubjekty || [];
      for (const s of subjekty) {
        if (seen.has(s.ico)) continue;
        if (!naceMatch(s, cfg)) continue;

        const result = buildResult(s);

        if (obecFilter) {
          const match = result.obec.toLowerCase().includes(obecFilter) ||
                        result.addr.toLowerCase().includes(obecFilter);
          if (!match) continue;
        }

        seen.add(s.ico);
        results.push(result);
        if (results.length >= maxCount) break;
      }
      if (results.length >= maxCount) break;
    }

    res.json({ ok: true, total: results.length, data: results });
  } catch (e) {
    console.error('Search error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
})

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
