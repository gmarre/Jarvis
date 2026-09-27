#!/usr/bin/env bash
# Verifie l'etat du projet Supabase reel, depuis .env.local.
#
#   npm run check:supabase
#
# A distinguer de `npm run test:sql`, qui valide la migration dans un Postgres
# jetable. Ici on interroge le vrai projet : est-il reveille, la migration a-t-elle
# ete appliquee, et les politiques RLS bloquent-elles bien un visiteur anonyme.
#
# N'ecrit rien et ne cree aucun compte. Utilise la cle publishable, jamais la
# secret key.

set -uo pipefail

ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVFILE="$ICI/../../.env.local"

[ -f "$ENVFILE" ] || { echo "Fichier introuvable : $ENVFILE"; exit 1; }

# Lecture facon dotenv : on retire les espaces et les guillemets encadrants,
# exactement comme le fait Vite.
lire() {
  local cle="$1" val
  val="$(grep -E "^${cle}=" "$ENVFILE" | tail -1 | cut -d= -f2- || true)"
  val="$(echo "$val" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  val="${val%\'}"; val="${val#\'}"
  val="${val%\"}"; val="${val#\"}"
  printf '%s' "$val"
}

URL="$(lire VITE_SUPABASE_URL)"
KEY="$(lire VITE_SUPABASE_ANON_KEY)"
MOCK="$(lire VITE_USE_MOCK)"

echo "Projet : ${URL:-(vide)}"

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo
  echo "Les cles ne sont pas renseignees : l'application tourne sur donnees factices."
  echo "Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local."
  exit 1
fi

if [ "$MOCK" = "true" ]; then
  echo
  echo "ATTENTION : VITE_USE_MOCK=true force les donnees factices."
  echo "L'application n'utilisera PAS Supabase tant que cette variable vaut true."
fi

# Garde-fou : une secret key n'a rien a faire dans une variable VITE_, elle
# serait embarquee dans le JavaScript envoye au navigateur.
case "$KEY" in
  sb_secret_*|service_role*)
    echo
    echo "DANGER : la cle ressemble a une SECRET KEY. A retirer immediatement."
    echo "Seule la publishable key (ex anon) va dans une variable VITE_."
    exit 1
    ;;
esac

appel() {
  curl -s -o /tmp/.sb_body -w '%{http_code}' --max-time 25 \
    -H "apikey: $KEY" "$1" 2>/dev/null || echo 000
}

echec=0

echo
echo "== Service d'authentification =="
code="$(appel "$URL/auth/v1/health")"
if [ "${code:0:1}" = "2" ]; then
  echo "ok, HTTP $code"
else
  echo "ECHEC, HTTP $code. Projet en pause ou supprime : verifier sur supabase.com."
  echec=1
fi

echo
echo "== Tables de la migration =="
# Note : la racine /rest/v1/ renvoie 401 avec une cle publishable, c'est normal,
# l'OpenAPI n'est servi qu'a la service_role. On interroge donc chaque table.
manquantes=0
presentes=0
for t in profiles skill_progress exercise_attempts placement_results \
         teachers availability_slots bookings parent_links slots_disponibles; do
  code="$(appel "$URL/rest/v1/$t?select=*&limit=1")"
  case "$code" in
    200)
      # RLS actif : un visiteur anonyme obtient une liste vide, pas une erreur.
      if grep -q '^\[\]' /tmp/.sb_body 2>/dev/null; then
        printf "  %-20s presente, RLS bloque bien l'acces anonyme\n" "$t"
      else
        printf "  %-20s presente MAIS LISIBLE SANS COMPTE -> politique RLS manquante\n" "$t"
        echec=1
      fi
      presentes=$((presentes + 1))
      ;;
    401|403)
      printf "  %-20s presente, acces refuse (RLS)\n" "$t"
      presentes=$((presentes + 1))
      ;;
    404)
      printf "  %-20s ABSENTE\n" "$t"
      manquantes=$((manquantes + 1))
      ;;
    *)
      printf "  %-20s reponse inattendue HTTP %s\n" "$t" "$code"
      echec=1
      ;;
  esac
done

rm -f /tmp/.sb_body

echo
if [ "$manquantes" -gt 0 ]; then
  echo "$manquantes table(s) manquante(s) sur 9 : la migration n'a pas ete appliquee."
  echo
  echo "A FAIRE : ouvrir Supabase > SQL Editor > New query, coller le contenu de"
  echo "  supabase/migrations/0001_schema_initial.sql"
  echo "puis Run. Le fichier est rejouable, le relancer ne casse rien."
  exit 1
fi

if [ "$echec" -ne 0 ]; then
  echo "Des problemes subsistent, voir ci-dessus."
  exit 1
fi

echo "Tout est en place : $presentes tables, projet reveille, RLS actif."
