r"""
Fusionne un ou plusieurs lots d'exercices dans la banque.

Met a jour, dans le meme mouvement :
  - exercises.json (ajout des exercices, tri, compteur de metadata) ;
  - skills_dag_v2.json (champ exercise_ids de chaque competence concernee) ;
  - le mastery_threshold, recalcule d'apres le nombre reel d'exercices.

Refuse de fusionner si un identifiant existe deja, ou si la validation echoue
apres fusion : dans ce cas rien n'est ecrit.

Usage :
    python .\scripts\merge_lot.py _travail\lot_C_nouvelles.json ... [--apply]
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "Spécifications DAG, Exos, Mindcards"
EXOS = SPEC / "content" / "exercises.json"
DAG = SPEC / "content" / "skills_dag_v2.json"
PY = ROOT / "tools" / "python" / "python.exe"

ORDRE = {"decouverte": 0, "entrainement": 1, "maitrise": 2}


def seuil(n: int) -> dict:
    """Seuil de maitrise proportionne au nombre d'exercices disponibles.

    Cible roadmap : 3 sur 4 quand la banque est complete (15 par competence).
    En dessous, on garde la meme exigence relative sans rendre le seuil
    inatteignable.
    """
    if n >= 8:
        return {"required": 3, "out_of": 4}
    if n >= 4:
        return {"required": 3, "out_of": 4}
    return {"required": 2, "out_of": 3}


def main() -> int:
    appliquer = "--apply" in sys.argv
    lots = [Path(a) for a in sys.argv[1:] if not a.startswith("--")]
    if not lots:
        print("Indiquer au moins un fichier de lot.", file=sys.stderr)
        return 1

    exos = json.loads(EXOS.read_text(encoding="utf-8"))
    dag = json.loads(DAG.read_text(encoding="utf-8"))
    connus = {e["id"] for e in exos["exercises"]}
    skills = {s["id"]: s for s in dag["skills"]}

    ajoutes = []
    for lot in lots:
        if not lot.is_file():
            print(f"Introuvable : {lot}", file=sys.stderr)
            return 1
        for e in json.loads(lot.read_text(encoding="utf-8"))["exercises"]:
            if e["id"] in connus:
                print(f"Deja present, fusion annulee : {e['id']}", file=sys.stderr)
                return 1
            if e["skill_id"] not in skills:
                print(f"Competence inconnue, fusion annulee : {e['skill_id']}", file=sys.stderr)
                return 1
            connus.add(e["id"])
            ajoutes.append(e)
        print(f"  {lot.name} : {len(json.loads(lot.read_text(encoding='utf-8'))['exercises'])} exercice(s)")

    exos["exercises"].extend(ajoutes)
    exos["exercises"].sort(key=lambda e: (e["skill_id"], ORDRE[e["level"]], e["id"]))
    exos["metadata"]["total_exercises"] = len(exos["exercises"])

    # exercise_ids et seuils, recalcules pour toutes les competences
    par_comp: dict[str, list[str]] = {}
    for e in exos["exercises"]:
        par_comp.setdefault(e["skill_id"], []).append(e["id"])
    touchees = []
    for s in dag["skills"]:
        ids = par_comp.get(s["id"], [])
        if s["exercise_ids"] != ids:
            s["exercise_ids"] = ids
            touchees.append(s["id"])
        s["mastery_threshold"] = seuil(len(ids)) if ids else {"required": 2, "out_of": 3}

    print(f"\n{len(ajoutes)} exercice(s) ajoute(s), total {len(exos['exercises'])}.")
    print(f"Competences dont exercise_ids change : {', '.join(touchees) or 'aucune'}")

    if not appliquer:
        print("\nSimulation. Relancer avec --apply.")
        return 0

    sauv_e, sauv_d = EXOS.read_text(encoding="utf-8"), DAG.read_text(encoding="utf-8")
    EXOS.write_text(json.dumps(exos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    DAG.write_text(json.dumps(dag, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    r = subprocess.run([str(PY), str(ROOT / "scripts" / "validate_content.py")],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        EXOS.write_text(sauv_e, encoding="utf-8")
        DAG.write_text(sauv_d, encoding="utf-8")
        print("\nVALIDATION ECHOUEE, fusion annulee et fichiers restaures.\n")
        print(r.stdout[-3000:])
        return 1

    print("\nFusion ecrite, validation reussie.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
