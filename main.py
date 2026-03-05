from flask import Flask, jsonify, request
from flask_cors import CORS
import requests, os

app = Flask(__name__)
CORS(app)

ARES_SEARCH = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat"
ARES_BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest"
HEADERS = {"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0"}

# Mapovani vseobecnych kodu na konkretni NACE kody
NACE_MAP = {
    "55": ["5510", "5520", "5530", "5590"],
    "56": ["5610", "5621", "5629", "5630"],
    "5510": ["5510"],
    "5610": ["5610"],
    "55,56": ["5510", "5520", "5530", "5590", "5610", "5621", "5629", "5630"],
}

def build_results(subjekty):
    results = []
    for s in subjekty:
        sidlo = s.get("sidlo") or {}
        ulice = sidlo.get("nazevUlice", "")
        cd = sidlo.get("cisloDomovni", "")
        co = sidlo.get("cisloOrientacni", "")
        psc = sidlo.get("psc", "")
        obec_n = sidlo.get("nazevObce", "")
        cislo = str(cd) if cd else ""
        if co:
            cislo += "/" + str(co)
        addr = ", ".join(p for p in [(ulice + " " + cislo).strip(), str(psc) if psc else "", obec_n] if p)
        nace_list = s.get("czNace", [])
        results.append({
            "ico": s.get("ico", ""),
            "name": s.get("obchodniJmeno", ""),
            "nace": nace_list[0] if nace_list else "",
            "date": s.get("datumVzniku", ""),
            "updated": s.get("datumAktualizace", ""),
            "addr": addr,
            "ulice": ulice,
            "obec": obec_n,
            "okres": sidlo.get("nazevOkresu", ""),
            "kraj": sidlo.get("nazevKraje", ""),
            "psc": str(psc) if psc else "",
            "dic": s.get("dic", ""),
        })
    return results

@app.route("/api/search", methods=["POST"])
def search():
    body = request.json or {}
    nace_input = body.get("czNace", ["5610"])
    obec = body.get("obec", "").strip()
    pocet = min(int(body.get("pocet", 100)), 500)

    # Rozbal vseobecne kody na konkretni
    nace_codes = []
    for n in nace_input:
        expanded = NACE_MAP.get(n)
        if expanded:
            nace_codes.extend(expanded)
        else:
            nace_codes.append(n)
    # Odstran duplicity
    nace_codes = list(dict.fromkeys(nace_codes))

    all_results = []
    total = 0

    for nace in nace_codes:
        payload = {"czNace": [nace], "pocet": pocet, "start": 0}

        # Filtr mesta - zkus nazevObce
        if obec:
            payload["sidlo"] = {"nazevObce": obec}

        r = requests.post(ARES_SEARCH, json=payload, headers=HEADERS, timeout=30)

        if not r.ok:
            # Zkus bez filtru mesta - mozna nazevObce nefunguje
            if obec:
                payload2 = {"czNace": [nace], "pocet": pocet, "start": 0}
                r = requests.post(ARES_SEARCH, json=payload2, headers=HEADERS, timeout=30)
                if r.ok:
                    data = r.json()
                    subjekty = data.get("ekonomickeSubjekty", [])
                    # Filtruj manualne
                    subjekty = [s for s in subjekty if obec.lower() in (s.get("sidlo") or {}).get("nazevObce", "").lower()]
                    total += len(subjekty)
                    all_results.extend(build_results(subjekty))
                    continue
            return jsonify({"ok": False, "error": f"ARES {r.status_code}: {r.text[:300]}"}), 502

        data = r.json()
        subjekty = data.get("ekonomickeSubjekty", [])

        # Pokud ARES ignoroval filtr mesta, filtruj manualne
        if obec and subjekty:
            subjekty = [s for s in subjekty
                       if obec.lower() in (s.get("sidlo") or {}).get("nazevObce", "").lower()]

        total += data.get("pocetCelkem", len(subjekty))
        all_results.extend(build_results(subjekty))

    # Odstran duplicity podle ICO
    seen = set()
    unique = []
    for r in all_results:
        if r["ico"] not in seen:
            seen.add(r["ico"])
            unique.append(r)

    return jsonify({"ok": True, "total": total, "data": unique})


@app.route("/api/detail/<ico>")
def detail(ico):
    try:
        r = requests.get(f"{ARES_BASE}/ekonomicke-subjekty/{ico}", headers=HEADERS, timeout=15)
        r.raise_for_status()
        base = r.json()
        rzp = {}
        try:
            r2 = requests.get(f"{ARES_BASE}/ekonomicke-subjekty-rzp/{ico}", headers=HEADERS, timeout=15)
            if r2.status_code == 200:
                zaznamy = r2.json().get("zaznamy", [])
                if zaznamy:
                    z = zaznamy[0]
                    osoby = z.get("angazovaneOsoby", [])
                    provozovny = []
                    for zivnost in z.get("zivnosti", []):
                        for p in zivnost.get("provozovny", []):
                            s = p.get("sidloProvozovny") or {}
                            paddr = ", ".join(filter(None, [(s.get("nazevUlice", "") + " " + str(s.get("cisloDomovni", ""))).strip(), s.get("nazevObce", "")]))
                            provozovny.append({"nazev": p.get("nazev", ""), "addr": paddr, "od": p.get("platnostOd", "")})
                    rzp = {
                        "osoby": [{"jmeno": (o.get("jmeno", "") + " " + o.get("prijmeni", "")).strip(), "funkce": o.get("typAngazma", ""), "od": o.get("platnostOd", "")} for o in osoby],
                        "provozovny": provozovny,
                    }
        except Exception:
            pass
        return jsonify({"ok": True, "base": base, "rzp": rzp})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", port=port, debug=False)
