from flask import Flask, jsonify, request
from flask_cors import CORS
import requests, os

app = Flask(__name__)
CORS(app)

H = {"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0"}
BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest"

@app.route("/ping")
def ping():
    return jsonify({"ok": True, "v": "3"})

@app.route("/proxy", methods=["POST"])
def proxy():
    b = request.json or {}
    url = b.get("url")
    payload = b.get("payload")
    if not url:
        return jsonify({"ok": False, "error": "no url"}), 400
    try:
        r = requests.post(url, json=payload, headers=H, timeout=30)
        try:
            data = r.json()
        except Exception:
            data = None
        return jsonify({"ok": r.ok, "status": r.status_code, "data": data, "raw": r.text[:1000] if not r.ok else None})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 502

@app.route("/api/detail/<ico>")
def detail(ico):
    try:
        r = requests.get(f"{BASE}/ekonomicke-subjekty/{ico}", headers=H, timeout=15)
        r.raise_for_status()
        base = r.json()
        rzp = {}
        try:
            r2 = requests.get(f"{BASE}/ekonomicke-subjekty-rzp/{ico}", headers=H, timeout=15)
            if r2.status_code == 200:
                zaznamy = r2.json().get("zaznamy", [])
                if zaznamy:
                    z = zaznamy[0]
                    osoby = z.get("angazovaneOsoby", [])
                    provozovny = []
                    for zivnost in z.get("zivnosti", []):
                        for p in zivnost.get("provozovny", []):
                            s = p.get("sidloProvozovny") or {}
                            parts = [(s.get("nazevUlice", "") + " " + str(s.get("cisloDomovni", ""))).strip(), s.get("nazevObce", "")]
                            provozovny.append({"nazev": p.get("nazev", ""), "addr": ", ".join(x for x in parts if x), "od": p.get("platnostOd", "")})
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
