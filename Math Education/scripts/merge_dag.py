r"""
Fusionne de nouvelles competences et/ou de nouvelles cartes mentales dans le
contenu. C'est le pendant de merge_lot.py, qui ne traite que les exercices.

Met a jour, dans le meme mouvement (contenu decoupe, voir contenu.py) :
  - le DAG : ajout des competences et des prerequis, metadata.total_skills et
    metadata.domains (un domaine nouveau y est declare, sinon l'application ne
    l'afficherait pas) ;
  - les cartes : ajout des cartes, et mindmap_id de chaque competence couverte.

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
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import contenu  # noqa: E402


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

    dag, exos, mm = contenu.charger()
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
        print(f"{len(cartes)} carte(s) ajoutee(s) : {', '.join(c['id'] for c in cartes)}")

    # Compteurs (total_skills, domains, total_mindmaps) : recalcules ici pour
    # l'affichage, et de nouveau a l'ecriture. Un domaine nouveau y est declare,
    # sinon l'application ne l'afficherait pas.
    contenu.recalculer_compteurs(dag, exos, mm)
    print("Domaines :", ", ".join(f"{d['id']}={d['count']}" for d in dag["metadata"]["domains"]))

    if not appliquer:
        print("\nSimulation. Relancer avec --apply.")
        return 0

    reussi, sortie = contenu.ecrire_et_valider(dag, exos, mm)
    if not reussi:
        print(sortie[-3000:])
        print("\nVALIDATION ECHOUEE, fusion annulee et fichiers restaures.")
        return 1
    print("\nFusion ecrite, validation reussie.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
