r"""
Construit la fiche de relecture humaine du contenu MATH EDUCATION.

Objectif : permettre à Marius de juger VITE si les exercices sont au bon
niveau. Pour chaque compétence, la fiche donne d'abord l'objectif et les
bornes officielles du niveau, puis les exercices sous forme compacte, avec
les nombres et dénominateurs réellement employés mis en évidence.

Le LaTeX est converti en notation lisible ($\frac{3}{4}$ devient 3/4), parce
qu'une fiche de relecture pleine de commandes LaTeX ne se lit pas vite.

Usage :
    . .\tools\activate.ps1
    python .\scripts\build_review_sheet.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SPEC_DIR = PROJECT_ROOT / "Spécifications DAG, Exos, Mindcards"
CONTENT_DIR = SPEC_DIR / "content"
OUT = SPEC_DIR / "RELECTURE.md"

NIVEAUX = ["CP", "CE1", "CE2", "CM1", "CM2", "6e", "5e", "4e", "3e", "2nde", "1ere", "Terminale"]

# Bornes officielles, reprises de validate_content.py (mêmes citations).
MAX_ENTIER = {"CP": 100, "CE1": 1000, "CE2": 10000, "CM1": 999999, "CM2": 999999999}
DEN_AUTORISES = {"CE1": {2, 3, 4, 5, 6, 8, 10}}
MAX_DEN = {"CE2": 12, "CM1": 20, "CM2": 60}
FRAC_MAX_UN = {"CE1", "CE2"}

LIBELLE_NIVEAU = {"decouverte": "Découverte", "entrainement": "Entraînement", "maitrise": "Maîtrise"}
CODE_NIVEAU = {"decouverte": "D", "entrainement": "E", "maitrise": "M"}
ORDRE_NIVEAU = {"decouverte": 0, "entrainement": 1, "maitrise": 2}


# --------------------------------------------------------------------------
#  Rendre le LaTeX lisible
# --------------------------------------------------------------------------
def lisible(t: str) -> str:
    if not t:
        return ""
    t = t.replace("\\,", " ")
    t = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"\1/\2", t)
    t = re.sub(r"\\d?frac\{([^{}]*)\}\{([^{}]*)\}", r"\1/\2", t)
    remplacements = {
        "\\times": "×", "\\div": "÷", "\\ldots": "…", "\\dots": "…",
        "\\leq": "≤", "\\geq": "≥", "\\neq": "≠", "\\approx": "≈",
        "\\;": " ", "\\ ": " ", "\\%": "%",
    }
    for a, b in remplacements.items():
        t = t.replace(a, b)
    t = t.replace("$", "")
    t = t.replace("**", "")           # le gras alourdit la lecture en tableau
    t = re.sub(r"\s*\n\s*", " ", t)   # tout sur une ligne pour tenir dans une cellule
    t = re.sub(r"\s{2,}", " ", t)
    return t.strip()


def cellule(t: str, largeur: int = 0) -> str:
    t = lisible(t).replace("|", "/")
    if largeur and len(t) > largeur:
        t = t[: largeur - 1] + "…"
    return t


# --------------------------------------------------------------------------
#  Extraction des nombres réellement employés
# --------------------------------------------------------------------------
_ESPACES = re.compile(r"(?<=\d)(?:\\,|[\s\u00a0\u202f])(?=\d)")
_FRAC_TEX = re.compile(r"\\frac\{(\d+)\}\{(\d+)\}")
_FRAC_PLATE = re.compile(r"(?<![\d/])(\d+)\s*/\s*(\d+)(?![\d/])")
_ENTIER = re.compile(r"\d+")


def nombres_de(ex: dict) -> tuple[set[int], set[int], bool]:
    """(entiers, dénominateurs, une fraction dépasse-t-elle 1) pour l'énoncé et la réponse."""
    textes = [ex["statement"], str(ex["answer"].get("value", ""))]
    entiers: set[int] = set()
    dens: set[int] = set()
    sup_un = False
    for t in textes:
        t = _ESPACES.sub("", t)
        for a, b in _FRAC_TEX.findall(t) + _FRAC_PLATE.findall(t):
            dens.add(int(b))
            if int(a) > int(b):
                sup_un = True
        sans_frac = _FRAC_PLATE.sub(" ", _FRAC_TEX.sub(" ", t))
        entiers.update(int(m) for m in _ENTIER.findall(sans_frac))
    return entiers, dens, sup_un


def bornes_texte(niveau: str) -> str:
    parts = []
    if niveau in MAX_ENTIER:
        parts.append(f"entiers ≤ {MAX_ENTIER[niveau]:,}".replace(",", " "))
    if niveau in DEN_AUTORISES:
        parts.append("dénominateurs " + ", ".join(str(d) for d in sorted(DEN_AUTORISES[niveau])))
    elif niveau in MAX_DEN:
        parts.append(f"dénominateurs ≤ {MAX_DEN[niveau]}")
    if niveau in FRAC_MAX_UN:
        parts.append("fractions ≤ 1")
    return " · ".join(parts) if parts else "pas de borne particulière"


def alertes(ex: dict, niveau: str) -> list[str]:
    """Signaux à vérifier en priorité, calculés sur l'énoncé et la réponse."""
    entiers, dens, sup_un = nombres_de(ex)
    out = []
    plafond = MAX_ENTIER.get(niveau)
    if plafond:
        hors = sorted(n for n in entiers if n > plafond)
        if hors:
            out.append(f"entier hors niveau : {', '.join(str(n) for n in hors)}")
    if niveau in DEN_AUTORISES:
        hors = sorted(d for d in dens if d not in DEN_AUTORISES[niveau])
        if hors:
            out.append(f"dénominateur hors liste : {', '.join(str(d) for d in hors)}")
    elif niveau in MAX_DEN:
        hors = sorted(d for d in dens if d > MAX_DEN[niveau])
        if hors:
            out.append(f"dénominateur trop grand : {', '.join(str(d) for d in hors)}")
    if sup_un and niveau in FRAC_MAX_UN:
        out.append("fraction supérieure à 1")
    return out


# --------------------------------------------------------------------------
def main() -> int:
    dag = json.loads((CONTENT_DIR / "skills_dag_v2.json").read_text(encoding="utf-8"))
    exos = json.loads((CONTENT_DIR / "exercises.json").read_text(encoding="utf-8"))

    skills = {s["id"]: s for s in dag["skills"]}
    par_comp: dict[str, list[dict]] = {}
    for e in exos["exercises"]:
        par_comp.setdefault(e["skill_id"], []).append(e)
    for lst in par_comp.values():
        lst.sort(key=lambda e: (ORDRE_NIVEAU[e["level"]], e["id"]))

    # Ordre de lecture : par niveau scolaire croissant, puis par domaine, puis par id.
    avec_contenu = [s for s in dag["skills"] if par_comp.get(s["id"])]
    avec_contenu.sort(key=lambda s: (NIVEAUX.index(s["school_level"]), s["domain"], s["id"]))

    L: list[str] = []
    A = L.append

    total_ex = sum(len(par_comp[s["id"]]) for s in avec_contenu)
    total_alertes = sum(
        1 for s in avec_contenu for e in par_comp[s["id"]] if alertes(e, s["school_level"])
    )

    A("# Fiche de relecture du contenu")
    A("")
    A(f"> {len(avec_contenu)} compétences, {total_ex} exercices. "
      f"Généré depuis `content/`, à ne pas éditer à la main.")
    A("")
    A("**Comment lire cette fiche.** Chaque compétence commence par son objectif et par les "
      "**bornes officielles de son niveau** : c'est la première chose à vérifier. Sous chaque "
      "exercice, la colonne *Nombres* montre ce qui est réellement employé dans l'énoncé et la "
      "réponse, pour juger d'un coup d'œil si c'est au niveau. Les corrigés sont repliés.")
    A("")
    if total_alertes:
        A(f"⚠ **{total_alertes} exercice(s) portent un signal automatique.** Ils sont marqués "
          "et regroupés dans la section « À vérifier en priorité ».")
    else:
        A("✅ Aucun exercice ne dépasse les bornes de son niveau.")
    A("")

    # ---- sommaire ----
    A("## Vue d'ensemble")
    A("")
    A("| Compétence | Niveau | Exos | D/E/M | Signal |")
    A("|---|---|---:|---|---|")
    for s in avec_contenu:
        lst = par_comp[s["id"]]
        d = sum(1 for e in lst if e["level"] == "decouverte")
        en = sum(1 for e in lst if e["level"] == "entrainement")
        m = sum(1 for e in lst if e["level"] == "maitrise")
        nb_al = sum(1 for e in lst if alertes(e, s["school_level"]))
        signal = f"⚠ {nb_al}" if nb_al else ""
        A(f"| `{s['id']}` {cellule(s['label'], 44)} | {s['school_level']} | {len(lst)} "
          f"| {d}/{en}/{m} | {signal} |")
    A("")

    # ---- priorités ----
    prioritaires = [
        (s, e) for s in avec_contenu for e in par_comp[s["id"]] if alertes(e, s["school_level"])
    ]
    if prioritaires:
        A("## À vérifier en priorité")
        A("")
        A("Signalés automatiquement parce qu'ils sortent des bornes du programme pour leur niveau. "
          "Un distracteur peut légitimement sortir du champ ; un énoncé ou une réponse, non.")
        A("")
        for s, e in prioritaires:
            A(f"- **`{e['id']}`** ({s['school_level']}, {cellule(s['label'], 40)}) — "
              f"{' ; '.join(alertes(e, s['school_level']))}")
            A(f"  <br>{cellule(e['statement'], 160)}")
        A("")

    # ---- détail ----
    A("---")
    A("")
    A("## Détail par compétence")
    A("")

    niveau_courant = None
    for s in avec_contenu:
        if s["school_level"] != niveau_courant:
            niveau_courant = s["school_level"]
            A(f"# ── {niveau_courant} ──")
            A("")

        lst = par_comp[s["id"]]
        A(f"### `{s['id']}` · {s['label']}")
        A("")
        A(f"**Objectif** {s['description']}  ")
        prereq = ", ".join(
            f"{p} ({skills[p]['school_level']})" for p in s["prerequisites"] if p in skills
        ) or "aucun"
        A(f"**Niveau** {s['school_level']} · difficulté {s['difficulty']}/9 · "
          f"seuil {s['mastery_threshold']['required']} sur {s['mastery_threshold']['out_of']}  ")
        A(f"**Prérequis** {prereq}  ")
        A(f"**Bornes du niveau** {bornes_texte(s['school_level'])}  ")
        A(f"**Test de positionnement** {cellule(s['validation_test'])}")
        A("")
        for ref in s.get("programme_ref", []):
            A(f"> « {ref['quote']} »  ")
            A(f"> — *{ref['source']}*")
            A("")
        if not s.get("programme_ref"):
            A("> ⚠ *Aucune citation de programme sur cette compétence : le niveau n'est pas sourcé.*")
            A("")

        A("| | Type | Énoncé | Réponse | Nombres |")
        A("|---|---|---|---|---|")
        for e in lst:
            ent, dens, _ = nombres_de(e)
            desc = []
            if ent:
                bornes = sorted(ent)
                desc.append(f"{bornes[0]}–{bornes[-1]}" if len(bornes) > 1 else str(bornes[0]))
            if dens:
                desc.append("dén. " + ", ".join(str(d) for d in sorted(dens)))
            marque = " ⚠" if alertes(e, s["school_level"]) else ""
            rep = e["answer"].get("value")
            if e["type"] == "qcm":
                choix = {c["key"]: c["text"] for c in e.get("choices", [])}
                rep = f"{rep}) {cellule(choix.get(str(rep), ''), 30)}"
            elif isinstance(rep, bool):
                rep = "vrai" if rep else "faux"
            A(f"| **{CODE_NIVEAU[e['level']]}**{marque} | {e['type']} "
              f"| {cellule(e['statement'], 150)} | {cellule(str(rep), 40)} | {' · '.join(desc)} |")
        A("")

        A("<details><summary>Corrigés, indices et distracteurs</summary>")
        A("")
        for e in lst:
            A(f"**`{e['id']}`** — {LIBELLE_NIVEAU[e['level']]}")
            A("")
            A(f"*Énoncé.* {cellule(e['statement'])}")
            A("")
            if e["type"] == "qcm":
                for c in e.get("choices", []):
                    bonne = " ✅" if str(e["answer"]["value"]) == c["key"] else ""
                    A(f"- **{c['key']}.** {cellule(c['text'])}{bonne}")
                    if c.get("misconception"):
                        A(f"  <br>*Erreur visée :* {cellule(c['misconception'])}")
                A("")
            A("*Corrigé.*")
            for i, step in enumerate(e["solution_steps"], 1):
                A(f"{i}. {cellule(step)}")
            A("")
            if e.get("hint"):
                A(f"*Indice.* {cellule(e['hint'])}")
                A("")
            if e["answer"].get("accepted"):
                A(f"*Aussi accepté.* {', '.join(str(a) for a in e['answer']['accepted'])}")
                A("")
            if e.get("programme_ref"):
                A(f"*Programme.* {e['programme_ref']}")
                A("")
            A("---")
            A("")
        A("</details>")
        A("")

    # ---- compétences sans contenu ----
    sans = [s for s in dag["skills"] if not par_comp.get(s["id"])]
    if sans:
        A("---")
        A("")
        A("## Compétences sans exercice")
        A("")
        for s in sans:
            A(f"- `{s['id']}` {s['label']} ({s['school_level']})")
        A("")

    OUT.write_text("\n".join(L), encoding="utf-8")
    print(f"{OUT.name} : {len(avec_contenu)} compétences, {total_ex} exercices, "
          f"{total_alertes} signal(aux).")
    print(f"-> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
