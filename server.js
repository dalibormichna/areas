const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.type('html').send(HTML));
app.get('/ping', (req, res) => res.json({ ok: true, v: '5-embedded' }));

app.post('/api/search', async (req, res) => {
  try {
    const { czNace = ['56'], obec = '', pocet = 100 } = req.body || {};
    const count = Math.min(Number(pocet) || 100, 500);
    const seen = new Set();
    const results = [];
    let total = 0;
    for (const nace of czNace) {
      const payload = { czNace: [nace], pocet: count, start: 0 };
      if (obec) payload.sidlo = { nazevObce: obec };
      const r = await aresRequest('POST', SEARCH_PATH, payload);
      if (r.status !== 200) return res.status(502).json({ ok: false, error: `ARES ${r.status}`, raw: r.raw });
      const subjekty = r.json.ekonomickeSubjekty || [];
      total += r.json.pocetCelkem || subjekty.length;
      for (const s of subjekty) {
        if (!seen.has(s.ico)) { seen.add(s.ico); results.push(buildResult(s)); }
      }
    }
    res.json({ ok: true, total, data: results });
  } catch (e) { res.status(502).json({ ok: false, error: e.message }); }
});

app.get('/api/detail/:ico', async (req, res) => {
  try {
    const { ico } = req.params;
    const r = await aresRequest('GET', DETAIL_PATH + ico, null);
    if (r.status !== 200) return res.status(502).json({ ok: false, error: `ARES ${r.status}` });
    let rzp = {};
    try {
      const r2 = await aresRequest('GET', RZP_PATH + ico, null);
      if (r2.status === 200 && r2.json) {
        const zaznamy = r2.json.zaznamy || [];
        if (zaznamy.length) {
          const z = zaznamy[0];
          const osoby = (z.angazovaneOsoby || []).map(o => ({
            jmeno: ((o.jmeno || '') + ' ' + (o.prijmeni || '')).trim(),
            funkce: o.typAngazma || '', od: o.platnostOd || ''
          }));
          const provozovny = [];
          for (const zivnost of z.zivnosti || []) {
            for (const p of zivnost.provozovny || []) {
              const s = p.sidloProvozovny || {};
              const parts = [((s.nazevUlice || '') + ' ' + (s.cisloDomovni || '')).trim(), s.nazevObce || ''];
              provozovny.push({ nazev: p.nazev || '', addr: parts.filter(Boolean).join(', '), od: p.platnostOd || '' });
            }
          }
          rzp = { osoby, provozovny };
        }
      }
    } catch (_) {}
    res.json({ ok: true, base: r.json, rzp });
  } catch (e) { res.status(502).json({ ok: false, error: e.message }); }
});

const ARES = 'ares.gov.cz';
const SEARCH_PATH = '/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat';
const DETAIL_PATH = '/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/';
const RZP_PATH = '/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty-rzp/';

const HTML = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ARES Tracker — Restaurace & Hotely</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0a0c0f; --s1:#121518; --s2:#181c21; --s3:#1e2329;
  --border:#252b34; --border2:#2e3744;
  --accent:#f0a500; --a2:#e05a00; --green:#22c55e; --blue:#3b82f6;
  --red:#ef4444; --text:#dde3ec; --muted:#6b7a8f; --mono:'IBM Plex Mono',monospace; --sans:'Syne',sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;font-size:14px;}

/* Grid bg */
body::before{content:'';position:fixed;inset:0;
  background-image:linear-gradient(rgba(240,165,0,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(240,165,0,.025) 1px,transparent 1px);
  background-size:48px 48px;pointer-events:none;z-index:0;}

header{
  position:relative;z-index:2;padding:24px 32px 18px;
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:16px;flex-wrap:wrap;
  background:rgba(10,12,15,.8);backdrop-filter:blur(8px);
}
.logo{font-size:1.6rem;font-weight:800;letter-spacing:-.04em;
  background:linear-gradient(120deg,var(--accent),var(--a2));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.logo-sub{font-family:var(--mono);font-size:.58rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-top:2px;}
.tag{font-family:var(--mono);font-size:.6rem;padding:3px 9px;border-radius:20px;
  background:rgba(34,197,94,.1);color:var(--green);border:1px solid rgba(34,197,94,.25);margin-left:auto;}

.layout{display:grid;grid-template-columns:280px 1fr;min-height:calc(100vh - 60px);position:relative;z-index:1;}

/* SIDEBAR */
aside{
  background:var(--s1);border-right:1px solid var(--border);
  padding:20px 16px;display:flex;flex-direction:column;gap:14px;
  position:sticky;top:0;height:calc(100vh - 60px);overflow-y:auto;
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
.btn-outline:disabled{opacity:.35;cursor:not-allowed;}

.info-box{background:var(--s2);border:1px solid var(--border);border-radius:8px;
  padding:11px 12px;font-family:var(--mono);font-size:.63rem;color:var(--muted);line-height:1.65;}
.info-box b{color:var(--accent);}
.info-box .no-phone{color:var(--red);font-size:.6rem;margin-top:6px;display:block;}

/* MAIN */
main{padding:20px 24px;overflow:hidden;}

.topbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.search-input{
  flex:1;min-width:200px;background:var(--s2);border:1px solid var(--border2);
  border-radius:7px;color:var(--text);font-family:var(--mono);font-size:.75rem;
  padding:8px 13px;outline:none;
}
.search-input:focus{border-color:var(--accent);}
.search-input::placeholder{color:var(--muted);}
.btn-sm{
  background:var(--s2);border:1px solid var(--border2);color:var(--text);
  border-radius:6px;padding:8px 14px;font-family:var(--sans);font-weight:600;
  font-size:.72rem;cursor:pointer;transition:border-color .15s,color .15s;white-space:nowrap;
}
.btn-sm:hover{border-color:var(--accent);color:var(--accent);}

/* Stats */
.stats{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.stat{background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;flex:1;min-width:90px;}
.stat .n{font-size:1.4rem;font-weight:800;letter-spacing:-.04em;color:var(--accent);}
.stat .l{font-family:var(--mono);font-size:.57rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-top:2px;}

/* Table */
.table-wrap{background:var(--s1);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
table{width:100%;border-collapse:collapse;}
thead th{
  background:var(--s2);padding:9px 11px;text-align:left;
  font-family:var(--mono);font-size:.57rem;text-transform:uppercase;letter-spacing:.1em;
  color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap;
  cursor:pointer;user-select:none;transition:color .15s;
}
thead th:hover{color:var(--accent);}
thead th.sorted{color:var(--accent);}
tbody tr{border-bottom:1px solid var(--border);transition:background .1s;cursor:pointer;}
tbody tr:hover{background:rgba(240,165,0,.04);}
tbody tr:last-child{border-bottom:none;}
tbody tr.selected{background:rgba(240,165,0,.07)!important;}
td{padding:9px 11px;vertical-align:middle;font-size:.78rem;}
.td-name{font-weight:600;max-width:220px;}
.td-name small{display:block;font-family:var(--mono);font-size:.62rem;color:var(--muted);font-weight:400;margin-top:2px;}
.td-ico{font-family:var(--mono);font-size:.72rem;color:var(--accent);}
.td-date{font-family:var(--mono);font-size:.68rem;}
.td-addr{font-size:.72rem;color:var(--muted);max-width:200px;line-height:1.4;}
.badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:.6rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;}
.bh{background:rgba(59,130,246,.12);color:#60a5fa;border:1px solid rgba(59,130,246,.25);}
.br{background:rgba(240,165,0,.12);color:var(--accent);border:1px solid rgba(240,165,0,.25);}
.bp{background:rgba(34,197,94,.12);color:var(--green);border:1px solid rgba(34,197,94,.25);}
.bo{background:rgba(107,122,143,.12);color:var(--muted);border:1px solid rgba(107,122,143,.25);}
.new-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:5px;vertical-align:middle;}
.date-new{color:var(--green);}

/* Pagination */
.pgn{display:flex;align-items:center;gap:6px;padding:10px 12px;border-top:1px solid var(--border);flex-wrap:wrap;}
.pgn span{font-family:var(--mono);font-size:.65rem;color:var(--muted);flex:1;}
.pb{background:var(--s2);border:1px solid var(--border);color:var(--text);border-radius:5px;
  padding:4px 10px;cursor:pointer;font-family:var(--mono);font-size:.68rem;}
.pb:hover{border-color:var(--accent);}.pb.act{background:rgba(240,165,0,.12);border-color:var(--accent);color:var(--accent);}

/* State boxes */
.state{text-align:center;padding:56px 20px;}
.state .icon{font-size:2rem;margin-bottom:10px;}
.state h3{font-weight:700;margin-bottom:6px;}
.state p{font-family:var(--mono);font-size:.68rem;color:var(--muted);max-width:380px;margin:0 auto;line-height:1.6;}
.spinner{display:inline-block;width:26px;height:26px;border:2.5px solid var(--border2);
  border-top-color:var(--accent);border-radius:50%;animation:sp .6s linear infinite;margin-bottom:10px;}
@keyframes sp{to{transform:rotate(360deg)}}
.log{font-family:var(--mono);font-size:.65rem;color:var(--muted);margin-top:8px;line-height:1.7;}
.log b{color:var(--accent);}

/* Detail panel */
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
.dp-close:hover{border-color:var(--accent);color:var(--accent);}
.dp-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:14px;}
.dp-section h4{font-family:var(--mono);font-size:.57rem;text-transform:uppercase;letter-spacing:.1em;
  color:var(--muted);margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);}
.dp-row{display:flex;gap:8px;margin-bottom:6px;font-size:.75rem;}
.dp-row .k{color:var(--muted);min-width:90px;font-family:var(--mono);font-size:.65rem;}
.dp-row .v{color:var(--text);font-weight:500;flex:1;word-break:break-all;}
.dp-row .v a{color:var(--accent);text-decoration:none;}
.dp-row .v a:hover{text-decoration:underline;}
.dp-note{font-family:var(--mono);font-size:.62rem;color:var(--muted);background:var(--s2);
  border:1px solid var(--border);border-radius:6px;padding:9px 11px;line-height:1.6;}
.dp-note b{color:var(--red);}
.dp-spinner{text-align:center;padding:20px;font-family:var(--mono);font-size:.68rem;color:var(--muted);}
.dp-btn{width:100%;text-align:center;background:rgba(240,165,0,.08);border:1px solid rgba(240,165,0,.25);
  color:var(--accent);border-radius:6px;padding:8px;font-family:var(--mono);font-size:.7rem;
  cursor:pointer;text-decoration:none;display:block;}
.dp-btn:hover{background:rgba(240,165,0,.15);}
.person-card{background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:9px 11px;margin-bottom:6px;font-size:.73rem;}
.person-card .pn{font-weight:600;}
.person-card .pt{font-family:var(--mono);font-size:.6rem;color:var(--muted);}
.prov-card{background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:9px 11px;margin-bottom:6px;font-size:.72rem;}
.prov-card .pa{color:var(--muted);}

@media(max-width:900px){
  .layout{grid-template-columns:1fr;}
  aside{position:static;height:auto;}
  .detail-panel{width:100%;}
}
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

<!-- SIDEBAR -->
<aside>
  <div>
    <div class="section-label">Typ podniku</div>
    <div class="field">
      <select id="selType">
        <option value="55,56">Vše (ubytování + stravování)</option>
        <option value="56">Stravování — restaurace, bary (56xx)</option>
        <option value="5610">Restaurace a pohostinství (5610)</option>
        <option value="55">Ubytování — hotely, penziony (55xx)</option>
        <option value="5510">Hotely a podobná zařízení (5510)</option>
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
    <div class="section-label">Filtr vzniku</div>
    <div class="field">
      <label>Vzniklé v posledních</label>
      <select id="selPeriod">
        <option value="0">— všechny —</option>
        <option value="1">1 měsíc</option>
        <option value="2">2 měsíce</option>
        <option value="3">3 měsíce</option>
        <option value="6">6 měsíců</option>
        <option value="12">12 měsíců</option>
        <option value="24">24 měsíců</option>
      </select>
    </div>
  </div>

  <div>
    <div class="section-label">Počet výsledků z ARES</div>
    <div class="field">
      <select id="selCount">
        <option value="50">50</option>
        <option value="100" selected>100</option>
        <option value="200">200</option>
        <option value="500">500</option>
      </select>
    </div>
  </div>

  <button class="btn" id="btnFetch" onclick="fetchData()">🔍 Načíst z ARES</button>
  <button class="btn-outline" id="btnExport" onclick="exportCSV()" disabled>⬇ Export CSV</button>

  <div class="info-box">
    <b>Co dostaneš z ARES:</b><br>
    ✓ IČO · obchodní jméno<br>
    ✓ Adresa sídla (ulice, obec, PSČ, kraj)<br>
    ✓ Datum vzniku<br>
    ✓ NACE kód (obor)<br>
    ✓ DIČ (pokud přiděleno)<br>
    ✓ Odpovědné osoby (přes RŽP)<br>
    ✓ Provozovny (přes RŽP)<br>
    <span class="no-phone">✗ Telefon v ARES není — viz detail pro návod</span>
  </div>
</aside>

<!-- MAIN -->
<main>
  <div class="topbar">
    <input class="search-input" id="searchInput" placeholder="Hledat v načtených datech (název, IČO, adresa)…" oninput="applyFilters()">
    <button class="btn-sm" onclick="clearSearch()">✕ Vymazat</button>
  </div>

  <div class="stats" id="statsBar" style="display:none">
    <div class="stat"><div class="n" id="sShown">0</div><div class="l">Zobrazeno</div></div>
    <div class="stat"><div class="n" id="sTotal">0</div><div class="l">Načteno z ARES</div></div>
    <div class="stat"><div class="n" id="sNew">0</div><div class="l">Nové (filtr)</div></div>
    <div class="stat"><div class="n" id="sRest">0</div><div class="l">Restaurace</div></div>
    <div class="stat"><div class="n" id="sHotel">0</div><div class="l">Hotely/Ubyt.</div></div>
  </div>

  <div class="table-wrap">
    <div id="stateBox" class="state">
      <div class="icon">🏨</div>
      <h3>Připraveno</h3>
      <p>Nastavte filtry vlevo a klikněte "Načíst z ARES".<br>
         <b style="color:var(--accent)">Vyžaduje lokální server</b> — spusť <code>python main.py</code></p>
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
          <th onclick="srt('nace')">NACE</th>
        </tr></thead>
        <tbody id="tBody"></tbody>
      </table>
      <div class="pgn" id="pgn"></div>
    </div>
  </div>
</main>
</div>

<!-- DETAIL PANEL -->
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

// NACE: 2-digit prefix codes - ARES uses prefix matching
// "55" matches all accommodation (55xxx), "56" matches all food service (56xxx)
const NACE_MAP = {
  '55,56': ['55','56'],
  '55':    ['55'],
  '56':    ['56'],
  '5510':  ['55'],
  '5610':  ['56'],
};

// --- Helpers ---
const NM={'55':'Ubytování','5510':'Hotel','5520':'Kemp/Chata','5590':'Ostatní ubyt.','56':'Stravování','5610':'Restaurace/Bar','5621':'Catering','5629':'Stravování','5630':'Bar/Nápoje'};
const nm=c=>c?(NM[c]||NM[c.slice(0,4)]||NM[c.slice(0,2)]||(c.startsWith('55')?'Ubytování':c.startsWith('56')?'Stravování':c)):'—';
const gt=n=>!n?'other':n.startsWith('5510')?'hotel':(n.startsWith('55')||n==='55')?'pension':(n.startsWith('56')||n==='56')?'rest':'other';
const bdg=t=>{const m={hotel:['bh','Hotel'],pension:['bp','Penzion'],rest:['br','Restaurace'],other:['bo','Jiné']};const[c,l]=m[t]||m.other;return\`<span class="badge \${c}">\${l}</span>\`;};
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt=d=>d?new Date(d).toLocaleDateString('cs-CZ'):'—';
const cutoff=m=>{if(!m)return null;const d=new Date();d.setMonth(d.getMonth()-m);return d;};

// --- Server check ---
async function checkServer(){
  try{
    const r=await fetch(\`\${SERVER}/ping\`);
    const j=await r.json();
    if(r.ok&&j.ok){
      document.getElementById('serverStatus').textContent=\`● Server online (\${j.v||'ok'})\`;
      document.getElementById('serverStatus').style.cssText='background:rgba(34,197,94,.1);color:#22c55e;border:1px solid rgba(34,197,94,.25);font-family:var(--mono);font-size:.6rem;padding:3px 9px;border-radius:20px;margin-left:auto;';
    } else throw new Error();
  }catch{
    document.getElementById('serverStatus').textContent='✗ Server offline';
    document.getElementById('serverStatus').style.cssText='background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.25);font-family:var(--mono);font-size:.6rem;padding:3px 9px;border-radius:20px;margin-left:auto;';
  }
}
checkServer();

// --- Fetch data ---
async function fetchData(){
  const btn=document.getElementById('btnFetch');
  btn.disabled=true; btn.textContent='⏳ Načítám…';
  closeDetail();

  const tv=document.getElementById('selType').value;
  const obec=document.getElementById('inpObec').value.trim();
  const cnt=parseInt(document.getElementById('selCount').value);
  const naceCodes=NACE_MAP[tv]||[tv];

  showSt('loading',\`Volám ARES API…<br><b>NACE kódy: \${naceCodes.join(', ')}</b>\${obec?' | Obec: <b>'+obec+'</b>':''}<br>Max výsledků: \${cnt}\`);

  try{
    const body={czNace:naceCodes,pocet:cnt};
    if(obec) body.obec=obec;

    const r=await fetch(\`\${SERVER}/api/search\`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });

    if(!r.ok){
      const txt=await r.text();
      throw new Error(\`Server \${r.status}: \${txt.slice(0,200)}\`);
    }

    const res=await r.json();
    if(!res.ok) throw new Error(res.error||'Neznama chyba');
    if(!res.data||!res.data.length){
      showSt('error',\`ARES vrátil 0 výsledků pro NACE: \${naceCodes.join(', ')}\${obec?' v obci: '+obec:''}<br><small>Zkus jiný typ nebo bez filtru města</small>\`);
      btn.disabled=false; btn.textContent='🔍 Načíst z ARES';
      return;
    }

    all=res.data;
    document.getElementById('btnExport').disabled=false;
    pg=0;
    applyFilters();

  }catch(e){
    console.error(e);
    showSt('error',\`Chyba: \${e.message}\`);
  }

  btn.disabled=false; btn.textContent='🔍 Načíst z ARES';
}

// --- Filters ---
function applyFilters(){
  const q=(document.getElementById('searchInput').value||'').toLowerCase();
  const months=parseInt(document.getElementById('selPeriod').value||'0');
  const co=cutoff(months);

  fil=all.filter(d=>{
    if(co&&d.date){if(new Date(d.date)<co)return false;}
    else if(co&&!d.date)return false;
    if(q&&!(d.name.toLowerCase().includes(q)||d.ico.includes(q)||d.addr.toLowerCase().includes(q)||d.obec.toLowerCase().includes(q)))return false;
    return true;
  });
  pg=0;
  updateStats();
  doSort(sk,true);
}

function clearSearch(){document.getElementById('searchInput').value='';applyFilters();}

function updateStats(){
  const months=parseInt(document.getElementById('selPeriod').value||'0');
  const co=cutoff(months);
  document.getElementById('sShown').textContent=fil.length;
  document.getElementById('sTotal').textContent=all.length;
  document.getElementById('sNew').textContent=co?fil.filter(d=>d.date&&new Date(d.date)>=co).length:'—';
  document.getElementById('sRest').textContent=fil.filter(d=>d.nace?.startsWith('56')).length;
  document.getElementById('sHotel').textContent=fil.filter(d=>d.nace?.startsWith('55')).length;
  document.getElementById('statsBar').style.display='flex';
}

// --- Sort & render ---
function srt(k){if(sk===k)sd*=-1;else{sk=k;sd=k==='date'?-1:1;}doSort(k,true);}
function doSort(k){
  const ago=new Date();ago.setMonth(ago.getMonth()-6);
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
    const ds=fmt(d.date);
    const sel=d.ico===selIco?'selected':'';
    return\`<tr class="\${sel}" onclick="openDetail('\${d.ico}')">
      <td class="td-name">\${isNew?'<span class="new-dot"></span>':''}\${esc(d.name)}<small>\${esc(d.dic?'DIČ: '+d.dic:'')}</small></td>
      <td class="td-ico">\${esc(d.ico)}</td>
      <td>\${bdg(t)}</td>
      <td class="td-date \${isNew?'date-new':''}">\${ds}</td>
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
function gp(p){pg=p;renderTable();document.querySelector('main').scrollTop=0;}

// --- Detail panel ---
async function openDetail(ico){
  selIco=ico;
  renderTable();
  const d=all.find(x=>x.ico===ico);
  if(!d)return;
  document.getElementById('dpName').textContent=d.name;
  document.getElementById('detailPanel').classList.add('open');
  document.getElementById('dpBody').innerHTML=\`<div class="dp-spinner"><div class="spinner" style="margin:0 auto 8px"></div><br>Načítám detail…</div>\`;

  try{
    const r=await fetch(\`\${SERVER}/api/detail/\${ico}\`);
    const res=await r.json();
    renderDetail(d, res);
  }catch(e){
    renderDetail(d, null);
  }
}

function renderDetail(d, res){
  const rzp = res?.rzp || {};
  const osoby = rzp.osoby || [];
  const provozovny = rzp.provozovny || [];

  let html = `
  <div class="dp-section">
    <h4>Základní údaje</h4>
    <div class="dp-row"><span class="k">IČO</span><span class="v"><b style="color:var(--accent)">\${esc(d.ico)}</b></span></div>
    \${d.dic ? \`<div class="dp-row"><span class="k">DIČ</span><span class="v">\${esc(d.dic)}</span></div>\` : ''}
    <div class="dp-row"><span class="k">NACE</span><span class="v">\${esc(d.nace)} — \${nm(d.nace)}</span></div>
    <div class="dp-row"><span class="k">Vznik</span><span class="v">\${fmt(d.date)}</span></div>
  </div>

  <div class="dp-section">
    <h4>Adresa sídla</h4>
    <div class="dp-row"><span class="k">Adresa</span><span class="v">\${esc(d.addr)}</span></div>
  </div>

  <div class="dp-section">
    <h4>Odpovědné osoby (z RŽP)</h4>
    \${osoby.length ? osoby.map(o => \`
      <div class="person-card">
        <div class="pn">\${esc(o.jmeno)}</div>
        <div class="pt">\${esc(o.funkce)}</div>
      </div>\`).join('') : '<div style="font-size:.65rem;color:var(--muted)">Nenalezeno</div>'}
  </div>

  <a class="dp-btn" href="https://ares.gov.cz/ekonomicke-subjekty-v-be/detail?ico=\${d.ico}" target="_blank">↗ Otevřít v ARES</a>
  <a class="dp-btn" style="margin-top:6px" href="https://www.google.com/search?q=\${encodeURIComponent(d.name + ' ' + d.obec)}" target="_blank">↗ Hledat na Google</a>
  <a class="dp-btn" style="margin-top:6px" href="https://www.google.com/maps/search/\${encodeURIComponent(d.name + ' ' + d.addr)}" target="_blank">↗ Google Maps</a>\`;

  document.getElementById('dpBody').innerHTML = html;
}

function closeDetail(){
  selIco=null;
  document.getElementById('detailPanel').classList.remove('open');
  renderTable();
}

// --- State ---
function showSt(type,msg){
  document.getElementById('tblWrap').style.display='none';
  const b=document.getElementById('stateBox');
  b.style.display='block';
  if(type==='loading')b.innerHTML=\`<div class="spinner"></div><h3>Načítám z ARES…</h3><div class="log">\${msg}</div>\`;
  else if(type==='error')b.innerHTML=\`<div class="icon">⚠️</div><h3>Chyba</h3><div class="log">\${msg}</div>\`;
  else if(type==='empty')b.innerHTML=\`<div class="icon">🔍</div><h3>Žádné výsledky pro tento filtr</h3><p>Zkuste delší časové období nebo jiné město.</p>\`;
  else b.innerHTML=\`<div class="icon">🏨</div><h3>Připraveno</h3><p>Nastavte filtry vlevo a klikněte Načíst z ARES.</p>\`;
}

// --- Export CSV ---
function exportCSV(){
  const h=['Název','IČO','DIČ','Typ','Datum vzniku','Adresa','Obec','Okres','Kraj','PSČ','NACE','ARES odkaz','Google'];
  const rows=fil.map(d=>[
    d.name,d.ico,d.dic||'',gt(d.nace),
    d.date?new Date(d.date).toLocaleDateString('cs-CZ'):'',
    d.addr,d.obec,d.okres,d.kraj,d.psc,d.nace,
    \`https://ares.gov.cz/ekonomicke-subjekty-v-be/detail?ico=\${d.ico}\`,
    \`https://www.google.com/search?q=\${encodeURIComponent(d.name+' '+d.obec)}\`
  ]);
  const csv=[h,...rows].map(r=>r.map(v=>\`"\${String(v||'').replace(/"/g,'""')}"\`).join(',')).join('\\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download=\`ares-podniky-\${new Date().toISOString().slice(0,10)}.csv\`;
  a.click();
}

// Keyboard
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail();});
</script>
</body>
</html>
`;

function aresRequest(method, path, payload) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const opts = {
      hostname: ARES,
      path: path,
      method: method,
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json', 
        'User-Agent': 'AresTracker/1.0 (moje-appka)' // ARES občas blokuje prázdné User-Agent
      }
    };

    const req = https.request(opts, res => {
      let data = []; // Lepší používat pole pro buffery
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data).toString();
        try { 
          resolve({ status: res.statusCode, json: JSON.parse(buffer) }); 
        } catch (e) { 
          resolve({ status: res.statusCode, json: null, raw: buffer }); 
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(body); // TADY to chybělo nebo bylo špatně implementováno
    }
    req.end();
  });
}

function buildResult(s) {
  const sidlo = s.sidlo || {};
  const ulice = sidlo.nazevUlice || '';
  const cd = sidlo.cisloDomovni || '';
  const co = sidlo.cisloOrientacni || '';
  const psc = sidlo.psc || '';
  const obec = sidlo.nazevObce || '';
  let cislo = cd ? String(cd) : '';
  if (co) cislo += '/' + co;
  const addr = [((ulice + ' ' + cislo).trim()), psc ? String(psc) : '', obec].filter(Boolean).join(', ');
  return {
    ico: s.ico || '', name: s.obchodniJmeno || '',
    nace: (s.czNace || [])[0] || '',
    date: s.datumVzniku || '', updated: s.datumAktualizace || '',
    addr, ulice, obec,
    okres: sidlo.nazevOkresu || '', kraj: sidlo.nazevKraje || '',
    psc: psc ? String(psc) : '', dic: s.dic || '',
  };
}



const port = process.env.PORT || 8080;
app.listen(port, () => console.log('ARES v5 running on port ' + port));
