r"""
Fusionne un lot de super exercices (sprint 2, point 7) dans le contenu.

Le lot est un tableau JSON de super exercices au format de
schemas/super.schema.json. Les figures eventuelles (`image`: "figures/<nom>")
sont deja dans content/figures/ ou dans le dossier passe par --figures.

Refuse de fusionner si un identifiant existe deja (sauf --remplacer), si une
competence du lot est absente du DAG, ou si la validation echoue apres fusion :
dans ce cas rien n'est ecrit. Sans --apply, la fusion est simulee sur une copie
du contenu et validee : c'est le controle que lance le redacteur.

Usage :
    python .\scripts\merge_super.py _travail\super_C.json [--figures dossier] [--remplacer] [--apply]
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import contenu  # noqa: E402


def valider(racine: Path) -> tuple[bool, str]:
    r = subprocess.run(
        [sys.executable, str(contenu.ROOT / "scripts" / "validate_content.py")],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
        env={**os.environ, "PYTHONIOENCODING": "utf-8", "MATH_EDU_CONTENT_DIR": str(racine)},
    )
    return r.returncode == 0, r.stdout


def main() -> int:
    args = sys.argv[1:]
    figures_dir = None
    if "--figures" in args:
        i = args.index("--figures")
        figures_dir = Path(args[i + 1])
        del args[i:i + 2]
    fichiers = [a for a in args if not a.startswith("--")]
    if not fichiers:
        print(__doc__)
        return 1
    appliquer = "--apply" in sys.argv
    remplacer = "--remplacer" in sys.argv

    dag, _, _ = contenu.charger()
    competences = {s["id"] for s in dag["skills"]}
    sup = contenu.charger_super()
    existantes = {d["id"]: i for i, d in enumerate(sup["super"])}

    lot: list[dict] = []
    for f in fichiers:
        lot.extend(json.loads(Path(f).read_text(encoding="utf-8")))

    for d in lot:
        if d.get("skill_id") not in competences:
            print(f"Competence absente du DAG, fusion annulee : {d.get('id')} ({d.get('skill_id')})", file=sys.stderr)
            return 1
        if d["id"] in existantes:
            if not remplacer:
                print(f"Super exercice deja present, fusion annulee : {d['id']} (--remplacer pour le remplacer)", file=sys.stderr)
                return 1
            sup["super"][existantes[d["id"]]] = d
        else:
            sup["super"].append(d)

    par_comp: dict[str, int] = {}
    for d in lot:
        par_comp[d["skill_id"]] = par_comp.get(d["skill_id"], 0) + 1
    print(f"{len(lot)} super exercice(s) pour {len(par_comp)} competence(s)")

    def copier_figures(cible: Path) -> int:
        if not figures_dir:
            return 0
        n = 0
        for f in figures_dir.glob("*.json"):
            shutil.copy(f, cible / "figures" / f.name)
            n += 1
        return n

    # Toujours valider sur une copie d'abord : une fusion refusee ne laisse rien.
    with tempfile.TemporaryDirectory() as tmp:
        copie = Path(tmp) / "content"
        shutil.copytree(contenu.CONTENT, copie)
        copier_figures(copie)
        contenu.ecrire_super(json.loads(json.dumps(sup)), copie)
        ok, sortie = valider(copie)
    lignes = [l for l in sortie.splitlines() if "uper" in l or "Notation" in l or "REUSSIE" in l or "ECHOUEE" in l or l.strip().startswith("x ")]
    print("\n".join(lignes[-40:]))
    if not ok:
        print("\nValidation ECHOUEE : rien n'est ecrit.")
        return 1

    if not appliquer:
        print("\nSimulation. Relancer avec --apply.")
        return 0

    n = copier_figures(contenu.CONTENT)
    contenu.ecrire_super(sup)
    print(f"\n{n} figure(s) copiee(s). Fusion ecrite, validation reussie.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
