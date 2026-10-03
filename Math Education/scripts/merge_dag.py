r"""
Fusionne de nouvelles competences et/ou de nouvelles cartes mentales dans le
contenu. C'est le pendant de merge_lot.py, qui ne traite que les exercices.

Met a jour, dans le meme mouvement :
  - skills_dag_v2.json : ajout des competences, metadata.total_skills et
    metadata.domains (un domaine nouveau y est declare, sinon l'application ne
    l'afficherait pas) ;
  - mindmaps.json : ajout des cartes, et mindmap_id de chaque competence
    couverte dans le DAG.

Refuse de fusionner si un identifiant existe deja, ou si la validation echoue
apres fusion : dans ce cas rien n'est ecrit.

Ordre d'une etape : merge_dag.py --skills, puis merge_lot.py, puis
merge_dag.py --mindmaps (une carte reference des competences existantes).

Usage :
    python .\scripts\merge_dag.py --skills _travail\etape1_dag_B.json [--links liens.json] [--apply]
    python .\scripts\merge_dag.py --mindmaps _travail\etape1_mm_B.json [--apply]

  --links : [{"skill": "A026", "add_prerequisite": "B008", "raison": "..."}]
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "Spécifications DAG, Exos, Mindcards"
DAG = SPEC / "content" / "skills_dag_v2.json"
MM = SPEC / "content" / "mindmaps.json"
_PORTABLE = ROOT / "tools" / "python" / "python.exe"
PY = _PORTABLE if _PORTABLE.is_file() else Path(sys.executable)


def lire(chemin: Path):
    return json.loads(chemin.read_text(encoding="utf-8"))


def argument(nom: str) -> Path | None:
    if nom not in sys.argv:
        return None
    i = sys.argv.index(nom)
    return Path(sys.argv[i + 1]) if i + 1 < len(sys.argv) else None


def main() -> int:
    appliquer = "--apply" in sys.argv
    f_skills, f_mm = argument("--skills"), argument("--mindmaps")
    if not f_skills and not f_mm and not argument("--links"):
        print("Indiquer --skills, --links et/ou --mindmaps <fichier>.", file=sys.stderr)
        return 1

    dag, mm = lire(DAG), lire(MM)
    skills = {s["id"]: s for s in dag["skills"]}

    if f_skills:
        nouvelles = lire(f_skills)
        for s in nouvelles:
            if s["id"] in skills:
                print(f"Competence deja presente, fusion annulee : {s['id']}", file=sys.stderr)
                return 1
            skills[s["id"]] = s
        dag["skills"].extend(nouvelles)
        dag["skills"].sort(key=lambda s: s["id"])
        print(f"{len(nouvelles)} competence(s) ajoutee(s) : {', '.join(s['id'] for s in nouvelles)}")

    f_liens = argument("--links")
    if f_liens:
        # Ajout de prerequis a des competences existantes. Rien n'est retire :
        # retirer une arete se decide a la main, pas par lot.
        for lien in lire(f_liens):
            sid, prereq = lien["skill"], lien["add_prerequisite"]
            if sid not in skills or prereq not in skills:
                print(f"Lien {prereq} -> {sid} : competence inconnue, fusion annulee", file=sys.stderr)
                return 1
            if prereq not in skills[sid]["prerequisites"]:
                skills[sid]["prerequisites"].append(prereq)
                print(f"Prerequis ajoute : {sid} <- {prereq}  ({lien.get('raison', 'sans raison donnee')})")

    if f_mm:
        cartes = lire(f_mm)
        connues = {m["id"] for m in mm["mindmaps"]}
        for carte in cartes:
            if carte["id"] in connues:
                print(f"Carte deja presente, fusion annulee : {carte['id']}", file=sys.stderr)
                return 1
            for sid in carte["skill_ids"]:
                if sid not in skills:
                    print(f"{carte['id']} couvre {sid}, inconnue du DAG : fusion annulee", file=sys.stderr)
                    return 1
                if skills[sid]["mindmap_id"] not in (None, carte["id"]):
                    print(f"{sid} a deja la carte {skills[sid]['mindmap_id']} : fusion annulee", file=sys.stderr)
                    return 1
                skills[sid]["mindmap_id"] = carte["id"]
        mm["mindmaps"].extend(cartes)
        mm["metadata"]["total_mindmaps"] = len(mm["mindmaps"])
        print(f"{len(cartes)} carte(s) ajoutee(s) : {', '.join(c['id'] for c in cartes)}")

    # Compteurs : le validateur refuse un metadata qui ne correspond pas au contenu.
    meta = dag["metadata"]
    meta["total_skills"] = len(dag["skills"])
    noms = {d["id"]: d["name"] for d in meta["domains"]}
    for s in dag["skills"]:
        noms.setdefault(s["domain"], s["domain_name"])
    meta["domains"] = [
        {"id": d, "name": noms[d], "count": sum(1 for s in dag["skills"] if s["domain"] == d)}
        for d in sorted(noms)
        if any(s["domain"] == d for s in dag["skills"])
    ]
    print("Domaines :", ", ".join(f"{d['id']}={d['count']}" for d in meta["domains"]))

    if not appliquer:
        print("\nSimulation. Relancer avec --apply.")
        return 0

    sauv_d, sauv_m = DAG.read_text(encoding="utf-8"), MM.read_text(encoding="utf-8")
    DAG.write_text(json.dumps(dag, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    MM.write_text(json.dumps(mm, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def restaurer(raison: str) -> int:
        DAG.write_text(sauv_d, encoding="utf-8")
        MM.write_text(sauv_m, encoding="utf-8")
        print(f"\n{raison}, fusion annulee et fichiers restaures.")
        return 1

    try:
        r = subprocess.run([str(PY), str(ROOT / "scripts" / "validate_content.py")],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
    except OSError as cause:
        return restaurer(f"VALIDATION IMPOSSIBLE ({cause})")
    if r.returncode != 0:
        print(r.stdout[-3000:])
        return restaurer("VALIDATION ECHOUEE")

    print("\nFusion ecrite, validation reussie.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
