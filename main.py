from flask import Flask, jsonify, request
from flask_cors import CORS
import requests, os

app = Flask(__name__)
CORS(app)

ARES_BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest"

@app.route("/api/search", methods=["POST"])
def search():
    body = request.json or {}
    nace_codes = body.get("czNace", ["55", "56"])
    obec = body.get("obec", "")
    pocet = int(body.get("pocet", 100))
    start = int(body.get("start", 0))

    payload = {"czNace": nace_codes, "pocet": pocet, "start": start}
    if obec:
        payload["sidlo"] = {"nazevObce": obec}

    try:
        r = requests.post(
            f"{ARES_BASE}/ekonomicke-subjekty/vyhledat",
            json=payload,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        subjekty = data.get("ekonomickeSubjekty", [])
        total = data.get("pocetCelkem", len(subjekty))

        results = []
        for s in subjekty:
            sidlo = s.get("sidlo") or {}
            ulice = sidlo.get("nazevUlice", "")
            cd = sidlo.get("cisloDomovni", "")
            co = sidlo.get("cisloOrientacni", "")
            psc = sidlo.get("psc", "")
            obec_n = sidlo.get("nazevObce", "")
            okres = sidlo.get("nazevOkresu", "")
            kraj = sidlo.get("nazevKraje", "")
            cislo = str(cd) if cd else ""
            if co:
                cislo += f"/{co}"
            addr_parts = [f"{ulice} {cislo}".strip(), str(psc) if psc else "", obec_n]
            addr = ", ".join(p for p in addr_parts if p)
            nace_list = s.get("czNace", [])
            results.append({
                "ico": s.get("ico", ""),
                "name": s.get("obchodniJmeno", ""),
                "nace": nace_list[0] if nace_list else "",
                "naceAll": nace_list,
                "date": s.get("datumVzniku", ""),
                "updated": s.get("datumAktualizace", ""),
                "addr": addr,
                "ulice": ulice,
                "obec": obec_n,
                "okres": okres,
                "kraj": kraj,
                "psc": str(psc) if psc else "",
                "dic": s.get("dic", ""),
            })

        return jsonify({"ok": True, "total": total, "data": results})

    except requests.RequestException as e:
        return jsonify({"ok": False, "error": str(e)}), 502


@app.route("/api/detail/<ico>", methods=["GET"])
def detail(ico):
    try:
        r = requests.get(
            f"{ARES_BASE}/ekonomicke-subjekty/{ico}",
            headers={"Accept": "application/json"},
            timeout=15,
        )
        r.raise_for_status()
        base = r.json()

        rzp = {}
        try:
            r2 = requests.get(
                f"{ARES_BASE}/ekonomicke-subjekty-rzp/{ico}",
                headers={"Accept": "application/json"},
                timeout=15,
            )
            if r2.status_code == 200:
                rzp_data = r2.json()
                zaznamy = rzp_data.get("zaznamy", [])
                if zaznamy:
                    z = zaznamy[0]
                    osoby = z.get("angazovaneOsoby", [])
                    provozovny = []
                    for zivnost in z.get("zivnosti", []):
                        for p in zivnost.get("provozovny", []):
                            s = p.get("sidloProvozovny") or {}
                            paddr = ", ".join(filter(None, [
                                f"{s.get('nazevUlice', '')} {s.get('cisloDomovni', '')}".strip(),
                                s.get("nazevObce", ""),
                            ]))
                            provozovny.append({
                                "nazev": p.get("nazev", ""),
                                "addr": paddr,
                                "od": p.get("platnostOd", ""),
                                "do": p.get("platnostDo", ""),
                            })
                    rzp = {
                        "osoby": [
                            {
                                "jmeno": f"{o.get('jmeno', '')} {o.get('prijmeni', '')}".strip(),
                                "funkce": o.get("typAngazma", ""),
                                "od": o.get("platnostOd", ""),
                            }
                            for o in osoby
                        ],
                        "provozovny": provozovny,
                    }
        except Exception:
            pass

        return jsonify({"ok": True, "base": base, "rzp": rzp})

    except requests.RequestException as e:
        return jsonify({"ok": False, "error": str(e)}), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", port=port, debug=False)
