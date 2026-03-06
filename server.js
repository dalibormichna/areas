// Cloudflare Worker — ARES proxy
// Vlož tento kód na https://workers.cloudflare.com → Create Worker → Deploy

export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/ping') {
      return Response.json({ ok: true, v: 'cf-worker' }, { headers: corsHeaders });
    }

    // Search
    if (url.pathname === '/api/search' && request.method === 'POST') {
      const body = await request.json();
      const { czNace = ['56'], obec = '', pocet = 100 } = body;
      const count = Math.min(Number(pocet) || 100, 500);

      const seen = new Set();
      const results = [];
      let total = 0;

      for (const nace of czNace) {
        const payload = { czNace: [nace], pocet: count, start: 0 };
        if (obec) payload.sidlo = { nazevObce: obec };

        const r = await fetch('https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!r.ok) {
          return Response.json({ ok: false, error: `ARES ${r.status}`, raw: await r.text() }, { headers: corsHeaders });
        }

        const data = await r.json();
        total += data.pocetCelkem || 0;

        for (const s of data.ekonomickeSubjekty || []) {
          if (!seen.has(s.ico)) {
            seen.add(s.ico);
            const sidlo = s.sidlo || {};
            const ulice = sidlo.nazevUlice || '';
            const cd = sidlo.cisloDomovni || '';
            const co = sidlo.cisloOrientacni || '';
            const psc = sidlo.psc || '';
            const obec_n = sidlo.nazevObce || '';
            let cislo = cd ? String(cd) : '';
            if (co) cislo += '/' + co;
            const addr = [((ulice + ' ' + cislo).trim()), psc ? String(psc) : '', obec_n].filter(Boolean).join(', ');
            results.push({
              ico: s.ico || '',
              name: s.obchodniJmeno || '',
              nace: (s.czNace || [])[0] || '',
              date: s.datumVzniku || '',
              updated: s.datumAktualizace || '',
              addr, ulice, obec: obec_n,
              okres: sidlo.nazevOkresu || '',
              kraj: sidlo.nazevKraje || '',
              psc: psc ? String(psc) : '',
              dic: s.dic || '',
            });
          }
        }
      }

      return Response.json({ ok: true, total, data: results }, { headers: corsHeaders });
    }

    // Detail
    const detailMatch = url.pathname.match(/^\/api\/detail\/(\d+)$/);
    if (detailMatch) {
      const ico = detailMatch[1];
      const base_url = `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`;
      const r = await fetch(base_url, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) return Response.json({ ok: false, error: `ARES ${r.status}` }, { headers: corsHeaders });
      const base = await r.json();

      let rzp = {};
      try {
        const r2 = await fetch(`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty-rzp/${ico}`, {
          headers: { 'Accept': 'application/json' }
        });
        if (r2.ok) {
          const rzpData = await r2.json();
          const zaznamy = rzpData.zaznamy || [];
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

      return Response.json({ ok: true, base, rzp }, { headers: corsHeaders });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
};
