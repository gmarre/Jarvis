r"""
Fait passer des exercices (ou des cartes mentales) d'un etat de relecture a un autre.

Etats, dans l'ordre impose par la roadmap :
    brouillon -> relu_agent -> relu_humain -> valide

Rappel de la regle d'or (roadmap section 9) : aucun exercice ne part en
production sans DOUBLE validation, agent math-reviewer PUIS relecture humaine
de Marius. Le script refuse donc de sauter directement de "brouillon" a
"valide" sans l'option --force.

Le script met aussi a jour :
  - metadata.review_status du fichier, aligne sur l'etat le MOINS avance ;
  - la copie embarquee dans l'application (option --sync-app), pour eviter que
    l'app continue d'afficher une version perimee du contenu.

EXEMPLES
--------
Voir ce que ferait la commande, sans rien ecrire :
    python .\scripts\set_review_status.py --status relu_agent --all --dry-run

Valider toute une competence apres relecture :
    python .\scripts\set_review_status.py --status valide --skill C012

Valider quelques exercices nommes :
    python .\scripts\set_review_status.py --status valide EX-A001-D-01 EX-A001-E-01

Marquer tout le lot comme relu par l'agent, puis synchroniser l'app :
    python .\scripts\set_review_status.py --status relu_agent --all --sync-app

Voir l'etat d'avancement de la relecture :
    python .\scripts\set_review_status.py --stats
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SPEC_DIR = PROJECT_ROOT / "Spécifications DAG, Exos, Mindcards"
CONTENT_DIR = SPEC_DIR / "content"
APP_CONTENT_DIR = PROJECT_ROOT / "Math_Edu_Application" / "src" / "content"

ORDER = ["brouillon", "relu_agent", "relu_humain", "valide"]
RANK = {s: i for i, s in enumerate(ORDER)}

TARGETS = {
    "exercices": {
        "source": CONTENT_DIR / "exercises.json",
        "app": APP_CONTENT_DIR / "exercises.json",
        "key": "exercises",
    },
    "cartes": {
        "source": CONTENT_DIR / "mindmaps.json",
        "app": APP_CONTENT_DIR / "mindmaps.json",
        "key": "mindmaps",
    },
}


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save(path: Path, data: dict) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def show_stats() -> None:
    for label, cfg in TARGETS.items():
        if not cfg["source"].is_file():
            continue
        data = load(cfg["source"])
        items = data[cfg["key"]]
        counts = {s: 0 for s in ORDER}
        for it in items:
            counts[it["review_status"]] = counts.get(it["review_status"], 0) + 1

        print(f"\n{label.upper()} ({len(items)} au total)  -  etat global : {data['metadata'].get('review_status', '?')}")
        for s in ORDER:
            if counts[s]:
                barre = "#" * round(30 * counts[s] / len(items))
                print(f"  {s:<12} {counts[s]:>3}  {barre}")

        restants = [i["id"] for i in items if i["review_status"] != "valide"]
        if restants:
            print(f"  reste a valider : {len(restants)}")
            apercu = ", ".join(restants[:8])
            suite = " ..." if len(restants) > 8 else ""
            print(f"    {apercu}{suite}")
        else:
            print("  tout est valide.")


def main() -> int:
    p = argparse.ArgumentParser(
        description="Fait evoluer l'etat de relecture du contenu MATH EDUCATION.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("ids", nargs="*", help="Identifiants a modifier, ex. EX-C012-D-01")
    p.add_argument("--status", choices=ORDER, help="Nouvel etat")
    p.add_argument("--skill", help="Traiter tous les exercices d'une competence, ex. C012")
    p.add_argument("--all", action="store_true", help="Traiter tout le fichier")
    p.add_argument("--cartes", action="store_true", help="Agir sur mindmaps.json au lieu de exercises.json")
    p.add_argument("--sync-app", action="store_true", help="Recopier le resultat dans src/content de l'application")
    p.add_argument("--dry-run", action="store_true", help="Afficher ce qui serait fait, sans rien ecrire")
    p.add_argument("--force", action="store_true", help="Autoriser un saut d'etape (brouillon vers valide)")
    p.add_argument("--stats", action="store_true", help="Afficher l'avancement de la relecture et quitter")
    args = p.parse_args()

    if args.stats:
        show_stats()
        return 0

    if not args.status:
        p.error("--status est requis (sauf avec --stats)")
    if not (args.ids or args.skill or args.all):
        p.error("preciser des identifiants, ou --skill, ou --all")

    cfg = TARGETS["cartes" if args.cartes else "exercices"]
    source, key = cfg["source"], cfg["key"]
    if not source.is_file():
        print(f"Fichier introuvable : {source}", file=sys.stderr)
        return 1

    data = load(source)
    items = data[key]
    by_id = {it["id"]: it for it in items}

    # --- selection ---
    if args.all:
        cibles = list(items)
    elif args.skill:
        cibles = [it for it in items if it.get("skill_id") == args.skill]
        if not cibles:
            print(f"Aucun exercice pour la competence {args.skill}.", file=sys.stderr)
            return 1
    else:
        inconnus = [i for i in args.ids if i not in by_id]
        if inconnus:
            print(f"Identifiant(s) inconnu(s) : {', '.join(inconnus)}", file=sys.stderr)
            return 1
        cibles = [by_id[i] for i in args.ids]

    # --- controle des sauts d'etape ---
    nouveau = RANK[args.status]
    sauts = [
        it for it in cibles
        if nouveau - RANK[it["review_status"]] > 1 and nouveau > RANK[it["review_status"]]
    ]
    if sauts and not args.force:
        print(f"{len(sauts)} element(s) sauteraient une etape de relecture :", file=sys.stderr)
        for it in sauts[:10]:
            print(f"  {it['id']} : {it['review_status']} -> {args.status}", file=sys.stderr)
        print(
            "\nLa roadmap impose la double validation : relecture agent PUIS relecture humaine.\n"
            "Passer par --status relu_agent d'abord, ou utiliser --force en connaissance de cause.",
            file=sys.stderr,
        )
        return 1

    # --- application ---
    modifies = []
    for it in cibles:
        if it["review_status"] != args.status:
            modifies.append((it["id"], it["review_status"], args.status))
            if not args.dry_run:
                it["review_status"] = args.status

    if not modifies:
        print(f"Rien a faire : les {len(cibles)} element(s) vises sont deja en '{args.status}'.")
        return 0

    for eid, avant, apres in modifies:
        print(f"  {eid} : {avant} -> {apres}")

    # L'etat global du fichier ne peut pas etre plus avance que son element le moins avance.
    if not args.dry_run:
        global_status = ORDER[min(RANK[it["review_status"]] for it in items)]
        data["metadata"]["review_status"] = global_status
        save(source, data)
        print(f"\n{len(modifies)} element(s) modifie(s).")
        print(f"Etat global du fichier : {global_status}")

        if args.sync_app:
            app_path = cfg["app"]
            if app_path.is_file():
                shutil.copyfile(source, app_path)
                print(f"Copie synchronisee : {app_path.relative_to(PROJECT_ROOT)}")
            else:
                print(f"Copie applicative introuvable, rien a synchroniser : {app_path}")
        else:
            print(
                "\nRappel : la copie utilisee par l'application n'a PAS ete mise a jour.\n"
                "Relancer avec --sync-app, sinon l'app affichera l'ancienne version."
            )
    else:
        print(f"\n[simulation] {len(modifies)} element(s) seraient modifie(s). Rien n'a ete ecrit.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
