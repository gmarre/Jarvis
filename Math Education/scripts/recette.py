r"""
Reporte dans le contenu les verdicts de recette rendus dans l'application.

Pendant la recette, un relecteur parcourt l'application et accepte ou
invalide chaque exercice et chaque carte (table content_reviews, migration
0008). Ce script ramene ces verdicts dans Git, qui reste la source :

  - accepte  -> review_status "valide" ;
  - invalide -> review_status "brouillon", et le commentaire part dans
                `Specifications DAG, Exos, Mindcards/RECETTE.md`, la liste de
                reprise des agents (une section datee par report).

Seuls les verdicts pas encore reportes sont traites (traite_le vide). Un
verdict change dans l'application redevient a reporter. Si plusieurs
relecteurs ont juge le meme element, le verdict le plus recent l'emporte, et
le desaccord est signale.

Le contenu modifie est valide avant d'etre ecrit (contenu.ecrire_et_valider),
puis recopie dans l'application. Les verdicts ne sont marques reportes en base
qu'apres une ecriture reussie.

Cles lues dans Math_Edu_Application/.env.local, comme publier.py : la cle
service_role n'est jamais affichee.

Usage :
    python scripts/recette.py            simulation : ce qui serait reporte
    python scripts/recette.py --apply    reporte, puis rappelle les etapes suivantes
"""

from __future__ import annotations

import datetime as dt
import json
import sys
import urllib.error
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import contenu  # noqa: E402
from publier import appel, lire_env  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RECETTE_MD = ROOT / "Spécifications DAG, Exos, Mindcards" / "RECETTE.md"

STATUT = {"accepte": "valide", "invalide": "brouillon"}
ORDRE = ["brouillon", "relu_agent", "relu_humain", "valide"]

EN_TETE = """# Recette du contenu : liste de reprise

> Ecrit par `scripts/recette.py`, une section par report. Chaque element
> invalide pendant la recette de l'application y figure avec le commentaire du
> relecteur : c'est la consigne de correction pour les agents. Une fois corrige
> et relu, l'element repasse en `relu_agent` et sera de nouveau juge.
"""


def lire_verdicts(url: str, cle: str) -> list[dict]:
    requete = urllib.parse.urlencode({
        "select": "id,item_type,item_id,verdict,commentaire,reviewer_id,mis_a_jour_le",
        "traite_le": "is.null",
        "order": "mis_a_jour_le.asc",
    })
    _, _, corps = appel(url, cle, f"/rest/v1/content_reviews?{requete}", methode="GET",
                        entetes={"Range": "0-99999"})
    return json.loads(corps)


def marquer_traites(url: str, cle: str, ids: list[int]) -> None:
    maintenant = dt.datetime.now(dt.timezone.utc).isoformat()
    # Par paquets : la liste des ids part dans l'URL.
    for i in range(0, len(ids), 200):
        paquet = ",".join(str(x) for x in ids[i:i + 200])
        appel(url, cle, f"/rest/v1/content_reviews?id=in.({paquet})", {"traite_le": maintenant},
              methode="PATCH", entetes={"Prefer": "return=minimal"})


def dernier_par_element(verdicts: list[dict]) -> tuple[dict[tuple[str, str], dict], list[str]]:
    """Le verdict le plus recent par element, et les desaccords entre relecteurs."""
    retenus: dict[tuple[str, str], dict] = {}
    desaccords = []
    for v in verdicts:  # deja tries du plus ancien au plus recent
        cle = (v["item_type"], v["item_id"])
        precedent = retenus.get(cle)
        if precedent and precedent["verdict"] != v["verdict"] and precedent["reviewer_id"] != v["reviewer_id"]:
            desaccords.append(f"{v['item_id']} : {precedent['verdict']} puis {v['verdict']} (le plus recent l'emporte)")
        retenus[cle] = v
    return retenus, desaccords


def section_reprise(invalides: list[tuple[dict, dict]], date: str) -> str:
    lignes = [f"\n## Report du {date}\n", f"{len(invalides)} element(s) a reprendre.\n"]
    for element, v in invalides:
        if v["item_type"] == "exercise":
            lignes.append(f"\n### {element['id']} ({element['skill_id']}, {element['level']}, {element['type']})\n")
            # Une liste Markdown ne tolere pas de saut de ligne dans un item.
            enonce = " / ".join(l.strip() for l in element["statement"].splitlines() if l.strip())
            lignes.append(f"- Enonce : {enonce}")
            lignes.append(f"- Reponse attendue : {json.dumps(element['answer'], ensure_ascii=False)}")
        else:
            lignes.append(f"\n### {element['id']} (carte : {element['title']})\n")
        commentaire = " / ".join(l.strip() for l in v["commentaire"].splitlines() if l.strip())
        lignes.append(f"- **Commentaire du relecteur** : {commentaire}")
    return "\n".join(lignes) + "\n"


def main() -> int:
    appliquer = "--apply" in sys.argv

    env = lire_env()
    url, cle = env["VITE_SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]
    try:
        verdicts = lire_verdicts(url, cle)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        if "PGRST205" in detail:
            print("Table content_reviews introuvable : la migration 0008 est-elle appliquee ?")
        else:
            print(f"Lecture des verdicts REFUSEE ({exc.code}) : {detail[:500]}")
        return 1
    except urllib.error.URLError as exc:
        print(f"Base injoignable : {exc.reason}")
        return 1

    if not verdicts:
        print("Aucun verdict a reporter.")
        return 0

    retenus, desaccords = dernier_par_element(verdicts)
    dag, exos, cartes = contenu.charger()
    par_id = {
        "exercise": {e["id"]: e for e in exos["exercises"]},
        "mindmap": {m["id"]: m for m in cartes["mindmaps"]},
    }

    changements, disparus, invalides = [], [], []
    for (type_, id_), v in sorted(retenus.items(), key=lambda kv: kv[0][1]):
        element = par_id[type_].get(id_)
        if element is None:
            disparus.append(id_)
            continue
        nouveau = STATUT[v["verdict"]]
        if element["review_status"] != nouveau:
            changements.append((id_, element["review_status"], nouveau))
            element["review_status"] = nouveau
        if v["verdict"] == "invalide":
            invalides.append((element, v))

    acceptes = sum(1 for v in retenus.values() if v["verdict"] == "accepte")
    print(f"{len(verdicts)} verdict(s) a reporter, sur {len(retenus)} element(s) : "
          f"{acceptes} accepte(s), {len(invalides)} invalide(s).")
    for id_, avant, apres in changements:
        print(f"  {id_} : {avant} -> {apres}")
    for ligne in desaccords:
        print(f"  DESACCORD {ligne}")
    if disparus:
        print(f"  Contenu disparu depuis le verdict (ignore, marque reporte) : {', '.join(disparus)}")

    if not appliquer:
        print("\nSimulation. Relancer avec --apply pour reporter.")
        return 0

    # Etat global de la banque : celui de son element le moins avance, comme
    # set_review_status.py. Seul le schema des exercices le prevoit.
    exos["metadata"]["review_status"] = ORDRE[min(ORDRE.index(e["review_status"]) for e in exos["exercises"])]

    if changements:
        reussi, sortie = contenu.ecrire_et_valider(dag, exos, cartes)
        if not reussi:
            print(sortie[-2000:])
            print("Contenu INVALIDE apres report : rien n'a ete ecrit, aucun verdict marque.")
            return 1
        contenu.exporter_app(dag, exos, cartes)

    if invalides:
        date = dt.date.today().isoformat()
        texte = RECETTE_MD.read_text(encoding="utf-8") if RECETTE_MD.is_file() else EN_TETE
        RECETTE_MD.write_text(texte + section_reprise(invalides, date), encoding="utf-8", newline="\n")

    marquer_traites(url, cle, [v["id"] for v in verdicts])

    print(f"\nReporte : {len(changements)} statut(s) modifie(s), {len(invalides)} element(s) "
          f"dans {RECETTE_MD.name}.")
    print("Suite :")
    print("  1. relire le diff, puis commiter le contenu et RECETTE.md ;")
    print("  2. python scripts/publier.py --apply (l'application montrera les nouveaux statuts) ;")
    print("  3. faire reprendre la liste de RECETTE.md par les agents (circuit de PLAN_CONTENU.md).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
