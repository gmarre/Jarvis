r"""
Lecture et ecriture du contenu pedagogique, decoupe en petits fichiers.

Pourquoi decouper. Le contenu vise le programme complet, du CP a la Terminale :
600 a 800 competences et 5 000 a 10 000 exercices, soit un exercises.json de
6 a 12 Mo. Un fichier de cette taille ne se relit plus dans un diff, ne tient
pas dans le contexte d'un agent, et provoque des conflits des que plusieurs
agents travaillent en parallele (etape 1 : quatre redacteurs a la fois).

Disposition, sous `Specifications DAG, Exos, Mindcards/content/` :

    dag/_metadata.json            metadonnees du DAG (compteurs recalcules)
    dag/<domaine>.json            competences d'un domaine, triees par id
    exercices/_metadata.json      metadonnees de la banque d'exercices
    exercices/<domaine>/<id>.json exercices d'une competence, D puis E puis M
    cartes/_metadata.json         metadonnees des cartes mentales
    cartes/<id>.json              une carte par fichier

`charger()` rend les trois structures dans la forme historique (un dict
`{"metadata", "skills"}`, `{"metadata", "exercises"}`, `{"metadata",
"mindmaps"}`) : les controles et les fusions n'ont pas a connaitre le decoupage.
`ecrire()` fait l'inverse, recalcule les compteurs et supprime les fichiers
devenus orphelins. `exporter_app()` assemble les trois fichiers que
l'application importe, en attendant que le contenu soit servi par la base.

Usage en ligne de commande :
    python scripts/contenu.py export-app     recopie le contenu dans l'application
    python scripts/contenu.py stats          compte competences, exercices, cartes
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "Spécifications DAG, Exos, Mindcards" / "content"
APP_CONTENT = ROOT / "Math_Edu_Application" / "src" / "content"

ORDRE_NIVEAUX = {"decouverte": 0, "entrainement": 1, "maitrise": 2}


class ContenuInvalide(Exception):
    """Un fichier du contenu est illisible : le message nomme le fichier."""


def _lire(chemin: Path):
    try:
        return json.loads(chemin.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        rel = chemin.relative_to(chemin.parents[2]) if len(chemin.parents) > 2 else chemin
        raise ContenuInvalide(f"{rel} : JSON invalide ligne {exc.lineno}, colonne {exc.colno} - {exc.msg}") from exc


def _ecrire_json(chemin: Path, data) -> None:
    chemin.parent.mkdir(parents=True, exist_ok=True)
    texte = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    # On ne reecrit pas un fichier inchange : les dates de modification et les
    # diffs restent limites a ce qui a reellement bouge.
    if not chemin.is_file() or chemin.read_text(encoding="utf-8") != texte:
        chemin.write_text(texte, encoding="utf-8")


def _tri_exercices(exos: list[dict]) -> list[dict]:
    return sorted(exos, key=lambda e: (e["skill_id"], ORDRE_NIVEAUX.get(e["level"], 9), e["id"]))


def charger(racine: Path = CONTENT) -> tuple[dict, dict, dict]:
    """Rend (dag, exercices, cartes) dans la forme historique des trois fichiers."""
    racine = Path(racine)
    if not (racine / "dag" / "_metadata.json").is_file():
        raise ContenuInvalide(f"Contenu decoupe introuvable sous {racine}")

    skills: list[dict] = []
    for f in sorted((racine / "dag").glob("*.json")):
        if f.name != "_metadata.json":
            skills.extend(_lire(f))
    skills.sort(key=lambda s: s["id"])
    dag = {"metadata": _lire(racine / "dag" / "_metadata.json"), "skills": skills}

    exos: list[dict] = []
    for f in sorted((racine / "exercices").glob("*/*.json")):
        exos.extend(_lire(f))
    exercices = {"metadata": _lire(racine / "exercices" / "_metadata.json"), "exercises": _tri_exercices(exos)}

    cartes_l = [_lire(f) for f in sorted((racine / "cartes").glob("*.json")) if f.name != "_metadata.json"]
    cartes = {"metadata": _lire(racine / "cartes" / "_metadata.json"), "mindmaps": cartes_l}

    return dag, exercices, cartes


def recalculer_compteurs(dag: dict, exercices: dict, cartes: dict) -> None:
    """Les compteurs des metadonnees se deduisent du contenu, jamais a la main."""
    meta = dag["metadata"]
    meta["total_skills"] = len(dag["skills"])
    noms = {d["id"]: d["name"] for d in meta.get("domains", [])}
    for s in dag["skills"]:
        noms.setdefault(s["domain"], s["domain_name"])
    presents = {s["domain"] for s in dag["skills"]}
    meta["domains"] = [
        {"id": d, "name": noms[d], "count": sum(1 for s in dag["skills"] if s["domain"] == d)}
        for d in sorted(presents)
    ]
    exercices["metadata"]["total_exercises"] = len(exercices["exercises"])
    cartes["metadata"]["total_mindmaps"] = len(cartes["mindmaps"])


def ecrire(dag: dict, exercices: dict, cartes: dict, racine: Path = CONTENT) -> None:
    """Ecrit le contenu decoupe, et supprime les fichiers qui ne correspondent plus a rien."""
    racine = Path(racine)
    recalculer_compteurs(dag, exercices, cartes)
    attendus: set[Path] = set()

    def poser(chemin: Path, data) -> None:
        _ecrire_json(chemin, data)
        attendus.add(chemin.resolve())

    poser(racine / "dag" / "_metadata.json", dag["metadata"])
    par_domaine: dict[str, list[dict]] = {}
    for s in sorted(dag["skills"], key=lambda s: s["id"]):
        par_domaine.setdefault(s["domain"], []).append(s)
    for domaine, liste in par_domaine.items():
        poser(racine / "dag" / f"{domaine}.json", liste)

    poser(racine / "exercices" / "_metadata.json", exercices["metadata"])
    par_comp: dict[str, list[dict]] = {}
    for e in _tri_exercices(exercices["exercises"]):
        par_comp.setdefault(e["skill_id"], []).append(e)
    for sid, liste in par_comp.items():
        poser(racine / "exercices" / sid[0] / f"{sid}.json", liste)

    poser(racine / "cartes" / "_metadata.json", cartes["metadata"])
    for carte in cartes["mindmaps"]:
        poser(racine / "cartes" / f"{carte['id']}.json", carte)

    # Orphelins : une competence fusionnee ailleurs, une carte retiree. Seuls les
    # .json des trois dossiers geres sont concernes.
    for dossier, motif in (("dag", "*.json"), ("exercices", "*/*.json"), ("exercices", "*.json"), ("cartes", "*.json")):
        for f in (racine / dossier).glob(motif):
            if f.resolve() not in attendus:
                f.unlink()
    for d in (racine / "exercices").glob("*"):
        if d.is_dir() and not any(d.iterdir()):
            d.rmdir()


def ecrire_et_valider(dag: dict, exercices: dict, cartes: dict, racine: Path = CONTENT) -> tuple[bool, str]:
    """Ecrit le contenu, lance validate_content.py, et restaure tout si la validation echoue.

    Rend (reussi, sortie du validateur). Une fusion qui ne passe pas la
    validation ne laisse aucune trace, y compris quand le validateur ne peut pas
    se lancer.
    """
    import shutil
    import subprocess
    import tempfile

    racine = Path(racine)
    with tempfile.TemporaryDirectory() as tmp:
        sauvegarde = Path(tmp) / "content"
        shutil.copytree(racine, sauvegarde)

        def restaurer() -> None:
            shutil.rmtree(racine)
            shutil.copytree(sauvegarde, racine)

        try:
            ecrire(dag, exercices, cartes, racine)
            r = subprocess.run(
                [sys.executable, str(ROOT / "scripts" / "validate_content.py")],
                capture_output=True, text=True, encoding="utf-8", errors="replace",
                env={**__import__("os").environ, "PYTHONIOENCODING": "utf-8", "MATH_EDU_CONTENT_DIR": str(racine)},
            )
        except Exception as exc:  # validateur introuvable, disque plein...
            restaurer()
            return False, f"Validation impossible : {exc}"
        if r.returncode != 0:
            restaurer()
            return False, r.stdout
        return True, r.stdout


def exporter_app(dag: dict, exercices: dict, cartes: dict, dest: Path = APP_CONTENT) -> None:
    """Les trois fichiers assembles que l'application importe."""
    recalculer_compteurs(dag, exercices, cartes)
    _ecrire_json(Path(dest) / "skills_dag.json", dag)
    _ecrire_json(Path(dest) / "exercises.json", exercices)
    _ecrire_json(Path(dest) / "mindmaps.json", cartes)


def main() -> int:
    commande = sys.argv[1] if len(sys.argv) > 1 else ""
    if commande == "export-app":
        exporter_app(*charger())
        print(f"Contenu exporte vers {APP_CONTENT}")
        return 0
    if commande == "stats":
        dag, exos, cartes = charger()
        print(f"{len(dag['skills'])} competences, {len(exos['exercises'])} exercices, {len(cartes['mindmaps'])} cartes")
        for d in dag["metadata"]["domains"]:
            print(f"  {d['id']} {d['name']} : {d['count']}")
        return 0
    print(__doc__)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
