r"""
Valide un lot AVANT sa fusion, dans une copie temporaire du contenu.

Plusieurs agents preparent des lots en parallele : aucun ne peut ecrire dans la
banque, mais chacun doit passer le validateur complet sur son travail. Ce script
copie le contenu, y applique en memoire les competences, exercices et cartes
proposes, puis lance validate_content.py sur la copie. La banque n'est jamais
modifiee.

Seules les lignes qui concernent les identifiants du lot sont affichees, plus
toute erreur : les avertissements deja connus de la banque ne noient pas le
resultat.

Usage :
    python .\scripts\check_lot.py [--skills f.json] [--links f.json] [--exercises f.json ...] [--mindmaps f.json]

  --skills     tableau de competences (format skills_dag.schema.json)
  --links      prerequis a ajouter a des competences existantes, format de merge_dag.py
  --exercises  tableau d'exercices, ou objet {"exercises": [...]}
  --mindmaps   tableau de cartes (format mindmaps.schema.json)
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import contenu  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
ORDRE = {"decouverte": 0, "entrainement": 1, "maitrise": 2}


def fichiers(option: str) -> list[Path]:
    """Tous les fichiers qui suivent une option, jusqu'a la suivante."""
    out, actif = [], False
    for a in sys.argv[1:]:
        if a.startswith("--"):
            actif = a == option
        elif actif:
            out.append(Path(a))
    return out


def lire(p: Path):
    data = json.loads(p.read_text(encoding="utf-8"))
    return data["exercises"] if isinstance(data, dict) and "exercises" in data else data


def main() -> int:
    skills_in = [s for f in fichiers("--skills") for s in lire(f)]
    exos_in = [e for f in fichiers("--exercises") for e in lire(f)]
    mm_in = [m for f in fichiers("--mindmaps") for m in lire(f)]
    liens_in = [lien for f in fichiers("--links") for lien in lire(f)]
    if not (skills_in or exos_in or mm_in or liens_in):
        print(__doc__)
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        dag, exos, mm = contenu.charger()

        dag["skills"].extend(skills_in)
        skills = {s["id"]: s for s in dag["skills"]}
        for lien in liens_in:
            cible = skills.get(lien["skill"])
            if cible is not None and lien["add_prerequisite"] not in cible["prerequisites"]:
                cible["prerequisites"].append(lien["add_prerequisite"])
        exos["exercises"].extend(exos_in)
        exos["exercises"].sort(key=lambda e: (e["skill_id"], ORDRE.get(e["level"], 9), e["id"]))
        par_comp: dict[str, list[str]] = {}
        for e in exos["exercises"]:
            par_comp.setdefault(e["skill_id"], []).append(e["id"])
        for s in dag["skills"]:
            if s["id"] in par_comp:
                s["exercise_ids"] = par_comp[s["id"]]
        mm["mindmaps"].extend(mm_in)
        for carte in mm_in:
            for sid in carte["skill_ids"]:
                if sid in skills:
                    skills[sid]["mindmap_id"] = carte["id"]

        # Les compteurs des metadonnees sont recalcules par l'ecriture.
        contenu.ecrire(dag, exos, mm, tmp)

        env = dict(os.environ, MATH_EDU_CONTENT_DIR=str(tmp), PYTHONIOENCODING="utf-8")
        r = subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_content.py")],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)

    ids = {s["id"] for s in skills_in} | {e["id"] for e in exos_in} | {e["skill_id"] for e in exos_in}
    ids |= {m["id"] for m in mm_in}
    motif = re.compile("|".join(re.escape(i) for i in sorted(ids, key=len, reverse=True))) if ids else None

    sortie = r.stdout.splitlines()
    if "--tout" in sys.argv:
        print(r.stdout)
        return r.returncode
    dans_erreurs = False
    for ligne in sortie:
        if re.match(r"^\d+ erreur", ligne):
            dans_erreurs = True
        elif re.match(r"^\d+ avertissement", ligne):
            dans_erreurs = False
        if dans_erreurs or (motif and motif.search(ligne)) or "Validation" in ligne:
            print(ligne)
    print(f"\n(lot : {len(skills_in)} competence(s), {len(exos_in)} exercice(s), {len(mm_in)} carte(s))")
    return r.returncode


if __name__ == "__main__":
    raise SystemExit(main())
