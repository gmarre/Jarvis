#!/usr/bin/env bash
# Verifie la migration SQL dans un Postgres jetable, sans toucher a Supabase.
#
# Pourquoi : les politiques RLS sont la seule barriere entre la progression d'un
# eleve et celle d'un autre, et le trigger de protection des colonnes est la
# seule chose qui empeche un mineur de se confirmer a lui-meme le consentement
# de son parent. Tester ca a la main dans le dashboard est long, donc on ne le
# fait pas. Ici tout est rejoue en une commande.
#
#   bash supabase/tests/run.sh
#
# Sort en 0 si tout passe, en 1 sinon. Prerequis : Docker. Pas de psql local.

set -uo pipefail

CONTENEUR=racine-sqltest
ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Git Bash reecrit les chemins facon Windows dans les commandes docker. Et comme
# un chemin Windows absolu contient un deux-points, docker cp le confondrait avec
# la syntaxe conteneur:chemin : on copie donc toujours depuis un chemin relatif.
export MSYS_NO_PATHCONV=1

nettoyer() { docker rm -f "$CONTENEUR" >/dev/null 2>&1 || true; }
trap nettoyer EXIT
nettoyer

echo "Demarrage de Postgres..."
docker run -d --name "$CONTENEUR" \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=racine \
  postgres:15-alpine >/dev/null || { echo "Docker ne repond pas."; exit 1; }

pret=0
for _ in $(seq 1 60); do
  if docker exec "$CONTENEUR" pg_isready -U postgres >/dev/null 2>&1; then pret=1; break; fi
  sleep 1
done
[ "$pret" -eq 1 ] || { echo "Postgres n'a pas demarre."; exit 1; }

# $1 = dossier, $2 = fichier, $3... = options psql
jouer() {
  local dossier="$1" fichier="$2"; shift 2
  ( cd "$dossier" && docker cp "./$fichier" "$CONTENEUR:/tmp/$fichier" >/dev/null )
  docker exec "$CONTENEUR" psql -U postgres -d racine "$@" -f "/tmp/$fichier" 2>&1
}

echec=0

echo
echo "== Substitut du schema auth de Supabase =="
jouer "$ICI" 00_shim_supabase.sql -v ON_ERROR_STOP=1 -q >/dev/null && echo "ok" \
  || { echo "ECHEC du shim"; exit 1; }

# Toutes les migrations, dans l'ordre, deux fois : le second passage verifie
# qu'elles sont rejouables.
MIGRATIONS=$(cd "$ICI/../migrations" && ls *.sql | sort)

for passage in 1 2; do
  echo
  echo "== Migrations, passage $passage (le 2e doit etre rejouable) =="
  for m in $MIGRATIONS; do
    sortie="$(jouer "$ICI/../migrations" "$m" -v ON_ERROR_STOP=1 -q)"
    if echo "$sortie" | grep -q "ERROR"; then
      echo "  $m :"
      echo "$sortie" | grep "ERROR" | sed 's/^/    /'
      echec=1
    else
      echo "  ok $m"
    fi
  done
done

# Les tests attendent certains refus : ce sont eux qui prouvent que les gardes
# fonctionnent. Tout autre ERROR est un vrai probleme.
REFUS_ATTENDUS='Creneau complet|violates row-level security|ne se modifie pas depuis le client|se confirme par le lien|duplicate key value'

verifier() {
  local titre="$1" fichier="$2"
  echo
  echo "== $titre =="

  # -A -F'|' : sortie compacte, donc analysable. Chaque test rend une ligne qui
  # se termine par |t (reussi) ou |f (echoue).
  local sortie
  sortie="$(jouer "$ICI" "$fichier" -q -A -F'|')"

  echo "$sortie" | grep -E '^TEST ' || true

  # Un test dont la colonne ok vaut f.
  local rates
  rates="$(echo "$sortie" | grep -E '^TEST .*\|f$' || true)"
  if [ -n "$rates" ]; then
    echo "Tests en echec :"
    echo "$rates"
    echec=1
  fi

  # Une erreur qui n'est pas un refus attendu.
  local imprevues
  imprevues="$(echo "$sortie" | grep "ERROR" | grep -Ev "$REFUS_ATTENDUS" || true)"
  if [ -n "$imprevues" ]; then
    echo "Erreurs imprevues :"
    echo "$imprevues"
    echec=1
  fi

  # Sentinelle : chaque fichier de test finit par une ligne TEST FIN. Son absence
  # signale un script interrompu en route, dont les assertions restantes n'ont
  # jamais tourne. Sans ce controle, un fichier coupe passait pour vert.
  if ! echo "$sortie" | grep -q '^TEST FIN'; then
    echo "INTERROMPU : le fichier ne s'est pas execute jusqu'au bout."
    echo "$sortie" | grep "ERROR" | head -3
    echec=1
  fi

  local refus
  refus="$(echo "$sortie" | grep -cE "ERROR.*($REFUS_ATTENDUS)" || true)"
  echo "(${refus} refus attendus bien declenches)"
}

verifier "Triggers, capacite des creneaux, cascades" 01_triggers_et_capacite.sql
verifier "Isolation RLS et escalade de privilege" 02_rls_isolation.sql

echo
if [ "$echec" -ne 0 ]; then
  echo "ECHEC."
  exit 1
fi
echo "Tout est vert."
