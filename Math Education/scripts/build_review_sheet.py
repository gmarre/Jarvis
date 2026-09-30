r"""
Construit la fiche de relecture du contenu MATH EDUCATION.

Deux sorties :
  RELECTURE.md         synthese, lecture en une dizaine de minutes. Objectif :
                       juger le FOND et la COORDINATION, pas relire chaque
                       exercice. Parcours ordonne, chapitres, une ligne par
                       exercice.
  RELECTURE_DETAIL.md  tout le contenu, enonces complets, corriges, distracteurs.
                       Pour creuser une competence precise.

Usage :
    python .\scripts\build_review_sheet.py            (les deux fichiers)
"""

from __future__ import annotations

import json
import re
import statistics as st
from pathlib import Path

import networkx as nx

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "Spécifications DAG, Exos, Mindcards"
CONTENT = SPEC / "content"

NIVEAUX = ["CP", "CE1", "CE2", "CM1", "CM2", "6e", "5e", "4e", "3e", "2nde", "1ere", "Terminale"]
RANG = {n: i for i, n in enumerate(NIVEAUX)}
ORDRE = {"decouverte": 0, "entrainement": 1, "maitrise": 2}
CODE = {"decouverte": "D", "entrainement": "E", "maitrise": "M"}

# Charge de lecture jugee raisonnable, par niveau (mots dans l'enonce).
PLAFOND_MOTS = {"CP": 15, "CE1": 20, "CE2": 25, "CM1": 30, "CM2": 30}


# --------------------------------------------------------------------------
def lisible(t: str) -> str:
    """LaTeX vers notation lisible : une fiche pleine de \\frac ne se lit pas."""
    if not t:
        return ""
    t = t.replace("\\,", " ")
    t = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"\1/\2", t)
    for a, b in {"\\times": "×", "\\div": "÷", "\\ldots": "…", "\\dots": "…",
                 "\\leq": "≤", "\\geq": "≥", "\\neq": "≠", "\\;": " ", "\\%": "%"}.items():
        t = t.replace(a, b)
    t = t.replace("$", "").replace("**", "").replace("`", "")
    t = re.sub(r"\s*\n\s*", " ", t)
    return re.sub(r"\s{2,}", " ", t).strip()


def court(t: str, n: int) -> str:
    t = lisible(t).replace("|", "/")
    return t if len(t) <= n else t[: n - 1] + "…"


def mots(t: str) -> int:
    return len(re.findall(r"\S+", re.sub(r"\$[^$]*\$", " X ", t)))


def reponse(e: dict) -> str:
    v = e["answer"].get("value")
    if isinstance(v, bool):
        return "vrai" if v else "faux"
    if e["type"] == "qcm":
        txt = {c["key"]: c["text"] for c in e.get("choices", [])}.get(str(v), "")
        return court(f"{v}) {txt}", 34)
    return court(str(v), 24)


# --------------------------------------------------------------------------
def main() -> int:
    dag = json.loads((CONTENT / "skills_dag_v2.json").read_text(encoding="utf-8"))
    exos = json.loads((CONTENT / "exercises.json").read_text(encoding="utf-8"))
    cartes = json.loads((CONTENT / "mindmaps.json").read_text(encoding="utf-8"))

    S = {s["id"]: s for s in dag["skills"]}
    par: dict[str, list[dict]] = {}
    for e in exos["exercises"]:
        par.setdefault(e["skill_id"], []).append(e)
    for v in par.values():
        v.sort(key=lambda e: (ORDRE[e["level"]], e["id"]))

    # Ordre reel de progression : tri topologique, departage par niveau puis difficulte.
    G = nx.DiGraph()
    for s in dag["skills"]:
        G.add_node(s["id"])
        for p in s["prerequisites"]:
            if p in S:
                G.add_edge(p, s["id"])
    parcours = list(nx.lexicographical_topological_sort(
        G, key=lambda i: (RANG[S[i]["school_level"]], S[i]["difficulty"], i)))
    avec = [i for i in parcours if par.get(i)]

    # ---------------- anomalies de coordination ----------------
    anomalies: dict[str, list[str]] = {}

    def note(sid, txt):
        anomalies.setdefault(sid, []).append(txt)

    for s in dag["skills"]:
        for p in s["prerequisites"]:
            if p in S and S[p]["difficulty"] > s["difficulty"]:
                note(s["id"], f"difficulté en baisse depuis {p}")
    for sid in avec:
        s, lst = S[sid], par[sid]
        m = st.mean(mots(e["statement"]) for e in lst)
        plaf = PLAFOND_MOTS.get(s["school_level"])
        if plaf and m > plaf:
            note(sid, f"énoncés trop longs pour le niveau ({m:.0f} mots, plafond {plaf})")
        d = [e for e in lst if e["level"] == "decouverte"]
        mm = [e for e in lst if e["level"] == "maitrise"]
        if d and mm:
            md = st.mean(x["estimated_duration_s"] for x in d)
            mmm = st.mean(x["estimated_duration_s"] for x in mm)
            if mmm <= md:
                note(sid, "maîtrise pas plus exigeante que découverte")
        if not s.get("programme_ref"):
            note(sid, "niveau non sourcé (aucune citation de programme)")

    # ================= FICHE SYNTHESE =================
    L = []
    A = L.append
    total = sum(len(par[i]) for i in avec)
    A("# Fiche de relecture — synthèse")
    A("")
    A(f"> {len(avec)} compétences, {total} exercices. Généré depuis `content/`, ne pas éditer à la main.  ")
    A("> Objectif : juger le **fond** et la **coordination**. Le détail complet, énoncés et corrigés, "
      "est dans `RELECTURE_DETAIL.md`.")
    A("")
    if anomalies:
        A(f"⚠ **{len(anomalies)} compétence(s) à regarder**, signalées dans la colonne *Signal* et détaillées en §3.")
    else:
        A("✅ Aucune anomalie de coordination détectée.")
    A("")

    # --- 1. parcours ---
    A("## 1. Le parcours, dans l'ordre où l'élève le suit")
    A("")
    A("C'est la lecture qui compte pour juger la coordination : la difficulté doit monter, jamais redescendre.")
    A("")
    A("| # | Compétence | Niv. | Diff. | Exos | Mots/énoncé | Signal |")
    A("|--:|---|---|--:|--:|--:|---|")
    for n, sid in enumerate(avec, 1):
        s, lst = S[sid], par[sid]
        m = st.mean(mots(e["statement"]) for e in lst)
        A(f"| {n} | `{sid}` {court(s['label'], 40)} | {s['school_level']} | {s['difficulty']} "
          f"| {len(lst)} | {m:.0f} | {'⚠' if sid in anomalies else ''} |")
    sans = [s["id"] for s in dag["skills"] if not par.get(s["id"])]
    if sans:
        A("")
        A(f"**Sans exercice ({len(sans)})** : {', '.join(f'`{i}` {S[i][chr(108)+chr(97)+chr(98)+chr(101)+chr(108)]}' for i in sans)}")
    A("")

    # --- 2. chapitres ---
    A("## 2. Par chapitre")
    A("")
    A("Le chapitre est l'unité qu'un exercice bilan validerait.")
    A("")
    for c in sorted(cartes["mindmaps"], key=lambda c: min(RANG[n] for n in c["school_levels"])):
        sk = [i for i in avec if i in c["skill_ids"]]
        if not sk:
            continue
        nb = sum(len(par[i]) for i in sk)
        A(f"### `{c['id']}` · {c['title']}")
        A("")
        A(f"{len(sk)} compétences, {nb} exercices, niveaux {', '.join(c['school_levels'])}.")
        A("")
        A("| Compétence | Ce que l'élève doit savoir faire | Exos |")
        A("|---|---|--:|")
        for i in sk:
            A(f"| `{i}` {court(S[i]['label'], 34)} | {court(S[i]['description'], 74)} | {len(par[i])} |")
        A("")

    # --- 3. anomalies ---
    if anomalies:
        A("## 3. Ce qui mérite ton oeil")
        A("")
        for sid, lst in sorted(anomalies.items(), key=lambda kv: parcours.index(kv[0])):
            A(f"- **`{sid}` {S[sid]['label']}** ({S[sid]['school_level']}) — {' ; '.join(lst)}")
        A("")

    # --- 4. detail resserre ---
    A("## 4. Les exercices, une ligne chacun")
    A("")
    niveau = None
    for sid in avec:
        s, lst = S[sid], par[sid]
        if s["school_level"] != niveau:
            niveau = s["school_level"]
            A(f"### ── {niveau} ──")
            A("")
        sig = "  ⚠" if sid in anomalies else ""
        A(f"**`{sid}` · {s['label']}** — diff. {s['difficulty']}, seuil "
          f"{s['mastery_threshold']['required']}/{s['mastery_threshold']['out_of']}{sig}  ")
        A(f"*{s['description']}*")
        if s.get("programme_ref"):
            A(f"> « {court(s['programme_ref'][0]['quote'], 150)} »")
        A("")
        A("| | Type | Demandé | Réponse |")
        A("|---|---|---|---|")
        for e in lst:
            A(f"| {CODE[e['level']]} | {e['type'][:4]} | {court(e['statement'], 92)} | {reponse(e)} |")
        A("")

    (SPEC / "RELECTURE.md").write_text("\n".join(L), encoding="utf-8")

    # ================= FICHE DETAIL =================
    D = []
    B = D.append
    B("# Fiche de relecture — détail complet")
    B("")
    B("> Énoncés, corrigés, indices et distracteurs. Pour creuser une compétence précise. "
      "La vue d'ensemble est dans `RELECTURE.md`.")
    B("")
    for sid in avec:
        s, lst = S[sid], par[sid]
        B(f"## `{sid}` · {s['label']} — {s['school_level']}, difficulté {s['difficulty']}")
        B("")
        B(f"*{s['description']}*")
        B("")
        for ref in s.get("programme_ref", []):
            B(f"> « {ref['quote']} » — *{ref['source']}*")
        B("")
        for e in lst:
            B(f"**{e['id']}** — {e['level']}, {e['type']}, {e['estimated_duration_s']} s")
            B("")
            B(f"{lisible(e['statement'])}")
            B("")
            if e["type"] == "qcm":
                for c in e.get("choices", []):
                    ok = " ✅" if str(e["answer"]["value"]) == c["key"] else ""
                    B(f"- **{c['key']}.** {lisible(c['text'])}{ok}")
                    if c.get("misconception"):
                        B(f"  <br>*Erreur visée :* {lisible(c['misconception'])}")
            else:
                B(f"**Réponse :** {lisible(str(e['answer'].get('value')))}")
            B("")
            B("*Corrigé.* " + " ".join(f"({i}) {lisible(x)}" for i, x in enumerate(e["solution_steps"], 1)))
            B("")
            if e.get("hint"):
                B(f"*Indice.* {lisible(e['hint'])}")
                B("")
        B("---")
        B("")
    (SPEC / "RELECTURE_DETAIL.md").write_text("\n".join(D), encoding="utf-8")

    print(f"RELECTURE.md        {len(avec)} compétences, {total} exercices, "
          f"{len(anomalies)} anomalie(s) de coordination")
    print(f"RELECTURE_DETAIL.md {len('\n'.join(D)) // 1000} ko")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
