const path = require('path');
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

function aresRequest(method, path, payload) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const opts = {
      hostname: ARES,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      }
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);

    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, json: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
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
  const nace = (s.czNace || [])[0] || '';
  return {
    ico: s.ico || '',
    name: s.obchodniJmeno || '',
    nace,
    date: s.datumVzniku || '',
    updated: s.datumAktualizace || '',
    addr,
    ulice,
    obec,
    okres: sidlo.nazevOkresu || '',
    kraj: sidlo.nazevKraje || '',
    psc: psc ? String(psc) : '',
    dic: s.dic || '',
  };
}

// Serve frontend
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Health check
app.get('/ping', (req, res) => res.json({ ok: true, v: '4-node' }));

// Search endpoint
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

      if (r.status !== 200) {
        return res.status(502).json({ ok: false, error: `ARES ${r.status}`, raw: r.raw });
      }

      const subjekty = r.json.ekonomickeSubjekty || [];
      total += r.json.pocetCelkem || subjekty.length;

      for (const s of subjekty) {
        if (!seen.has(s.ico)) {
          seen.add(s.ico);
          results.push(buildResult(s));
        }
      }
    }

    res.json({ ok: true, total, data: results });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

// Detail endpoint
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
            funkce: o.typAngazma || '',
            od: o.platnostOd || ''
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
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

const port = process.env.PORT || 5050;
app.listen(port, () => console.log('ARES server v4-node running on port ' + port));
