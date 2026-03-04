from flask import Flask, jsonify, request
from flask_cors import CORS
import requests, os

app = Flask(__name__)
CORS(app)

ARES_SEARCH = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat"
ARES_BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest"
HEADERS = {"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0"}

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
    nace_input = body.get("czNace", ["55", "56"])
    obec = body.get("obec", "")
    pocet = min(int(body.get("pocet", 100)), 500)

    # ARES vyhledava podle prefixu - zkusime vicero payloadu
    all_results = []
    total = 0

    for nace in nace_input:
        payload = {
            "czNace": [nace],
            "pocet": pocet,
            "start": 0,
            "razeni": ["-datumVzniku"]
        }
        if obec:
            payload["sidlo"] = {"nazevObce": obec}

        r = requests.post(ARES_SEARCH, json=payload, headers=HEADERS, timeout=30)

        if not r.ok:
            # zkus bez razeni
            payload2 = {"czNace": [nace], "pocet": pocet, "start": 0}
            if obec:
                payload2["sidlo"] = {"nazevObce": obec}
            r = requests.post(ARES_SEARCH, json=payload2, headers=HEADERS, timeout=30)

        if not r.ok:
            return jsonify({"ok": False, "error": f"ARES {r.status_code}: {r.text[:300]}"}), 502

        data = r.json()
        subjekty = data.get("ekonomickeSubjekty", [])
        total += data.get("pocetCelkem", len(subjekty))
        all_results.extend(build_results(subjekty))

    return jsonify({"ok": True, "total": total, "data": all_results})


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


@app.route("/api/debug")
def debug():
    results = {}
    for payload in [
        {"czNace": ["56"], "pocet": 3, "start": 0},
        {"czNace": ["5610"], "pocet": 3, "start": 0},
        {"czNace": ["56110"], "pocet": 3, "start": 0},
    ]:
        r = requests.post(ARES_SEARCH, json=payload, headers=HEADERS, timeout=15)
        key = payload["czNace"][0]
        results[key] = {"status": r.status_code, "body": r.text[:300]}
    return jsonify(results)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", port=port, debug=False)
