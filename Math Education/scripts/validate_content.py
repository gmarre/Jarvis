r"""
Validation du contenu pedagogique MATH EDUCATION.

C'est le script exige par la roadmap v2.0 :
  - section 2.2 : validation des 3 schemas JSON du contrat d'interface ;
  - Jalon 1, section 1.1 : "un script Python (networkx) qui detecte cycles,
    noeuds orphelins, prerequis inexistants et incoherences de niveau (un noeud
    CE1 qui depend d'un noeud de 3e, par exemple). A lancer a chaque
    modification du DAG."

A lancer sur chaque livraison de contenu, avant toute PR.

Usage :
    . .\tools\activate.ps1
    python .\scripts\validate_content.py

Codes de sortie : 0 si tout passe, 1 si au moins une erreur bloquante.
Les avertissements n'empechent pas la sortie 0 : ils signalent ce qui reste a
faire (competence sans exercice, sans carte mentale, contenu non relu).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import networkx as nx
from jsonschema import Draft202012Validator

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SPEC_DIR = PROJECT_ROOT / "Spécifications DAG, Exos, Mindcards"
SCHEMA_DIR = SPEC_DIR / "schemas"
CONTENT_DIR = SPEC_DIR / "content"

# Ordre scolaire : sert a detecter qu'une competence depend d'une competence
# enseignee plus tard, ce qui rendrait le noeud inatteignable pour l'eleve.
LEVEL_ORDER = [
    "CP", "CE1", "CE2", "CM1", "CM2",
    "6e", "5e", "4e", "3e",
    "2nde", "1ere", "Terminale",
]
LEVEL_RANK = {lvl: i for i, lvl in enumerate(LEVEL_ORDER)}

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def load_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        err(f"{path.name} : JSON invalide ligne {exc.lineno}, colonne {exc.colno} - {exc.msg}")
        return None


def validate_schema(data: dict, schema_path: Path, label: str) -> None:
    schema = load_json(schema_path)
    if schema is None:
        err(f"Schema introuvable ou illisible : {schema_path}")
        return
    validator = Draft202012Validator(schema)
    found = 0
    for issue in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
        location = "/".join(str(p) for p in issue.path) or "(racine)"
        err(f"{label} : {location} - {issue.message}")
        found += 1
        if found >= 20:
            err(f"{label} : ... erreurs de schema suivantes tronquees")
            break


def check_dag(dag: dict, exercises: dict | None, mindmaps: dict | None) -> None:
    skills = dag["skills"]
    by_id = {s["id"]: s for s in skills}

    # --- doublons ---
    if len(by_id) != len(skills):
        seen: set[str] = set()
        for s in skills:
            if s["id"] in seen:
                err(f"DAG : competence en double - {s['id']}")
            seen.add(s["id"])

    # --- coherence des compteurs de metadata ---
    meta = dag["metadata"]
    if meta["total_skills"] != len(skills):
        err(f"DAG : metadata.total_skills = {meta['total_skills']} mais {len(skills)} competences presentes")
    counts: dict[str, int] = {}
    for s in skills:
        counts[s["domain"]] = counts.get(s["domain"], 0) + 1
    for d in meta["domains"]:
        if counts.get(d["id"], 0) != d["count"]:
            err(f"DAG : domaine {d['id']} annonce {d['count']} competences, {counts.get(d['id'], 0)} presentes")

    # --- prerequis inexistants ---
    graph = nx.DiGraph()
    for s in skills:
        graph.add_node(s["id"])
    for s in skills:
        for p in s["prerequisites"]:
            if p not in by_id:
                err(f"DAG : {s['id']} a pour prerequis {p}, qui n'existe pas dans ce fichier")
            else:
                graph.add_edge(p, s["id"])

    # --- acyclicite ---
    if not nx.is_directed_acyclic_graph(graph):
        for cycle in nx.simple_cycles(graph):
            err(f"DAG : cycle detecte - {' -> '.join(cycle)} -> {cycle[0]}")
    else:
        print(f"  acyclicite            OK  ({graph.number_of_nodes()} noeuds, {graph.number_of_edges()} aretes)")

    # --- incoherences de niveau ---
    level_issues = 0
    for s in skills:
        rank = LEVEL_RANK.get(s["school_level"])
        if rank is None:
            err(f"DAG : {s['id']} a un niveau inconnu '{s['school_level']}'")
            continue
        for p in s["prerequisites"]:
            parent = by_id.get(p)
            if not parent:
                continue
            prank = LEVEL_RANK.get(parent["school_level"])
            if prank is not None and prank > rank:
                err(
                    f"DAG : {s['id']} ({s['school_level']}) depend de {p} ({parent['school_level']}), "
                    f"enseigne plus tard - la competence serait inatteignable"
                )
                level_issues += 1
    if level_issues == 0:
        print("  coherence des niveaux OK")

    # --- noeuds orphelins (ni prerequis, ni consequence) ---
    for node in graph.nodes:
        if graph.in_degree(node) == 0 and graph.out_degree(node) == 0:
            warn(f"DAG : {node} est isole (aucun prerequis, aucune competence ne s'appuie dessus)")

    # --- seuils de maitrise ---
    for s in skills:
        mt = s["mastery_threshold"]
        if mt["required"] > mt["out_of"]:
            err(f"DAG : {s['id']} a un seuil impossible ({mt['required']} sur {mt['out_of']})")

    # --- references croisees vers les exercices ---
    if exercises is not None:
        ex_by_id = {e["id"]: e for e in exercises["exercises"]}
        for s in skills:
            for ex_id in s["exercise_ids"]:
                if ex_id not in ex_by_id:
                    err(f"DAG : {s['id']} reference l'exercice {ex_id}, absent de exercises.json")
                elif ex_by_id[ex_id]["skill_id"] != s["id"]:
                    err(
                        f"Exercices : {ex_id} est rattache a {s['id']} dans le DAG "
                        f"mais declare skill_id={ex_by_id[ex_id]['skill_id']}"
                    )
            if not s["exercise_ids"]:
                warn(f"DAG : {s['id']} n'a aucun exercice")

        for e in exercises["exercises"]:
            if e["skill_id"] not in by_id:
                err(f"Exercices : {e['id']} porte sur {e['skill_id']}, competence absente du DAG")
            # l'identifiant doit refleter la competence et le niveau annonces
            expected_letter = {"decouverte": "D", "entrainement": "E", "maitrise": "M"}[e["level"]]
            parts = e["id"].split("-")
            if parts[1] != e["skill_id"]:
                err(f"Exercices : {e['id']} ne correspond pas a skill_id={e['skill_id']}")
            if parts[2] != expected_letter:
                err(f"Exercices : {e['id']} annonce le niveau '{e['level']}' ({expected_letter} attendu dans l'id)")

        # doublons d'identifiants
        if len(ex_by_id) != len(exercises["exercises"]):
            err("Exercices : au moins un identifiant est en double")
        if exercises["metadata"]["total_exercises"] != len(exercises["exercises"]):
            err(
                f"Exercices : metadata.total_exercises = {exercises['metadata']['total_exercises']} "
                f"mais {len(exercises['exercises'])} exercices presents"
            )

        # un QCM doit designer une proposition existante
        for e in exercises["exercises"]:
            if e["type"] == "qcm":
                keys = {c["key"] for c in e.get("choices", [])}
                if str(e["answer"]["value"]) not in keys:
                    err(f"Exercices : {e['id']} a pour reponse '{e['answer']['value']}', absente des propositions")

    # --- references croisees vers les cartes mentales ---
    if mindmaps is not None:
        mm_by_id = {m["id"]: m for m in mindmaps["mindmaps"]}
        for s in skills:
            mid = s["mindmap_id"]
            if mid is None:
                warn(f"DAG : {s['id']} n'a pas de carte mentale")
            elif mid not in mm_by_id:
                err(f"DAG : {s['id']} reference la carte {mid}, absente de mindmaps.json")

        for m in mindmaps["mindmaps"]:
            for sid in m["skill_ids"]:
                if sid not in by_id:
                    err(f"Cartes : {m['id']} couvre {sid}, competence absente du DAG")
            # Markmap attend un seul titre de niveau 1
            h1 = [ln for ln in m["markdown"].splitlines() if ln.startswith("# ")]
            if len(h1) != 1:
                err(f"Cartes : {m['id']} contient {len(h1)} titres de niveau 1, un seul est attendu")
        if mindmaps["metadata"]["total_mindmaps"] != len(mindmaps["mindmaps"]):
            err(
                f"Cartes : metadata.total_mindmaps = {mindmaps['metadata']['total_mindmaps']} "
                f"mais {len(mindmaps['mindmaps'])} cartes presentes"
            )

    # --- etat de relecture (regle d'or roadmap section 9) ---
    if exercises is not None:
        not_validated = [e["id"] for e in exercises["exercises"] if e["review_status"] != "valide"]
        if not_validated:
            warn(
                f"Exercices : {len(not_validated)} exercice(s) pas encore en etat 'valide'. "
                "Aucun ne doit partir en production sans relecture humaine de Marius."
            )


def main() -> int:
    print("Validation du contenu MATH EDUCATION\n")

    dag_path = CONTENT_DIR / "skills_dag_v2.json"
    ex_path = CONTENT_DIR / "exercises.json"
    mm_path = CONTENT_DIR / "mindmaps.json"

    dag = load_json(dag_path)
    exercises = load_json(ex_path)
    mindmaps = load_json(mm_path)

    if dag is None:
        print(f"Fichier DAG introuvable : {dag_path}", file=sys.stderr)
        return 1

    print("Schemas JSON")
    validate_schema(dag, SCHEMA_DIR / "skills_dag.schema.json", "DAG")
    print("  skills_dag            controle")
    if exercises is not None:
        validate_schema(exercises, SCHEMA_DIR / "exercises.schema.json", "Exercices")
        print("  exercises             controle")
    else:
        warn(f"exercises.json absent ({ex_path.name}) : controles d'exercices ignores")
    if mindmaps is not None:
        validate_schema(mindmaps, SCHEMA_DIR / "mindmaps.schema.json", "Cartes")
        print("  mindmaps              controle")
    else:
        warn(f"mindmaps.json absent ({mm_path.name}) : controles de cartes ignores")

    print("\nGraphe")
    check_dag(dag, exercises, mindmaps)

    print()
    if warnings:
        print(f"{len(warnings)} avertissement(s) :")
        for w in warnings:
            print(f"  ! {w}")
        print()
    if errors:
        print(f"{len(errors)} ERREUR(S) :")
        for e in errors:
            print(f"  x {e}")
        print("\nValidation ECHOUEE.")
        return 1

    print("Validation REUSSIE.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
