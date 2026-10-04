r"""
Publie le contenu pedagogique dans la base Supabase.

Git est la source du contenu, la base ne fait que le servir. Ce script est la
SEULE voie d'ecriture du contenu en base :

  1. il charge le contenu (scripts/contenu.py) et lance validate_content.py :
     un contenu invalide n'est jamais publie ;
  2. il refuse de publier des modifications non commitees : chaque publication
     correspond a un commit, note dans content_publications ;
  3. il appelle la fonction publier_contenu() (migration 0005), qui remplace
     tout le contenu en une seule transaction.

Cles lues dans Math_Edu_Application/.env.local : VITE_SUPABASE_URL et
SUPABASE_SERVICE_ROLE_KEY. La cle service_role contourne le RLS : elle ne sort
jamais de cette machine et n'est jamais affichee.

Usage :
    python scripts/publier.py             simulation : ce qui serait publie
    python scripts/publier.py --apply     publie
    python scripts/publier.py --apply --force   publie malgre des modifications
                                                non commitees (a eviter)
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import contenu  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / "Math_Edu_Application" / ".env.local"


def lire_env() -> dict[str, str]:
    if not ENV.is_file():
        raise SystemExit(f"Fichier de cles introuvable : {ENV}")
    valeurs = {}
    for ligne in ENV.read_text(encoding="utf-8").splitlines():
        ligne = ligne.strip()
        if ligne and not ligne.startswith("#") and "=" in ligne:
            cle, _, valeur = ligne.partition("=")
            valeurs[cle.strip()] = valeur.strip().strip('"').strip("'")
    for requise in ("VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        if not valeurs.get(requise):
            raise SystemExit(f"{requise} absente de .env.local")
    return valeurs


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout.strip()


def appel(url: str, cle: str, chemin: str, corps: dict | None = None, methode: str = "POST",
          entetes: dict | None = None):
    donnees = json.dumps(corps).encode("utf-8") if corps is not None else None
    req = urllib.request.Request(f"{url}{chemin}", data=donnees, method=methode)
    req.add_header("apikey", cle)
    req.add_header("Authorization", f"Bearer {cle}")
    req.add_header("Content-Type", "application/json")
    for k, v in (entetes or {}).items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=120) as rep:
        return rep.status, dict(rep.headers), rep.read().decode("utf-8")


def compter(url: str, cle: str, table: str) -> int:
    _, entetes, _ = appel(url, cle, f"/rest/v1/{table}?select=*", methode="HEAD",
                          entetes={"Prefer": "count=exact", "Range": "0-0"})
    plage = entetes.get("Content-Range") or entetes.get("content-range") or "*/0"
    return int(plage.split("/")[-1])


def main() -> int:
    appliquer = "--apply" in sys.argv
    forcer = "--force" in sys.argv

    # 1. Contenu valide, sinon rien.
    r = subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_content.py")],
                       capture_output=True, text=True, encoding="utf-8", errors="replace",
                       env={**os.environ, "PYTHONIOENCODING": "utf-8"})
    if r.returncode != 0:
        print(r.stdout[-2000:])
        print("Contenu INVALIDE : publication refusee.")
        return 1

    dag, exos, cartes = contenu.charger()
    payload = {"skills": dag["skills"], "exercises": exos["exercises"], "mindmaps": cartes["mindmaps"]}
    taille = len(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    # 2. Une publication = un commit.
    commit = git("rev-parse", "--short", "HEAD")
    modifie = git("status", "--porcelain", "--", str(contenu.CONTENT.relative_to(ROOT)))
    if modifie:
        if not forcer:
            print("Le contenu a des modifications non commitees :")
            print(modifie)
            print("Commiter d'abord, ou relancer avec --force (la publication sera marquee -dirty).")
            return 1
        commit += "-dirty"

    print(f"Contenu : {len(payload['skills'])} competences, {len(payload['exercises'])} exercices, "
          f"{len(payload['mindmaps'])} cartes ({taille / 1024:.0f} ko), commit {commit}")

    if not appliquer:
        print("\nSimulation. Relancer avec --apply pour publier.")
        return 0

    # 3. Publication atomique.
    env = lire_env()
    url, cle = env["VITE_SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]
    try:
        _, _, corps = appel(url, cle, "/rest/v1/rpc/publier_contenu",
                            {"contenu": payload, "source_commit": commit})
    except urllib.error.HTTPError as exc:
        print(f"Publication REFUSEE par la base ({exc.code}) : {exc.read().decode('utf-8', 'replace')[:800]}")
        return 1
    except urllib.error.URLError as exc:
        print(f"Base injoignable : {exc.reason}")
        return 1

    resultat = json.loads(corps)
    print("Publie :", resultat)

    # Controle independant : ce que la base contient vraiment.
    comptes = {t: compter(url, cle, t) for t in
               ("content_skills", "content_exercises", "content_exercise_keys", "content_mindmaps")}
    print("En base :", comptes)
    attendus = {"content_skills": len(payload["skills"]), "content_exercises": len(payload["exercises"]),
                "content_exercise_keys": len(payload["exercises"]), "content_mindmaps": len(payload["mindmaps"])}
    if comptes != attendus:
        print("ECART entre le contenu et la base :", attendus)
        return 1
    print("Publication verifiee.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
