-- =============================================================================
-- MATH EDUCATION (Racine) - 0004 : places_prises doit etre le compte reel
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable, comme les precedentes.
--
-- BUG CORRIGE. Un creneau complet s'affichait comme disponible. L'eleve cliquait
-- pour reserver et se faisait refuser par la base, sans comprendre pourquoi.
--
-- Cause. La vue slots_disponibles (migration 0001) comptait les reservations par
-- un left join sur bookings, et elle est declaree security_invoker = true : le
-- comptage subissait donc les politiques RLS du lecteur. Or la politique
-- bookings_select_concernes ne montre a un eleve que SES reservations. Resultat,
-- pour un creneau de 3 places deja pleines, un eleve qui n'en a reserve aucune
-- voyait places_prises = 0, et celui qui en avait une voyait 1. La colonne
-- complet etait donc presque toujours fausse, et
--
--   useBookings.ts : `isFull: slot.places_prises >= slot.capacite`
--
-- ne se declenchait jamais.
--
-- Meme famille de bug que la 0003 : une regle qui doit etre vraie pour tout le
-- monde s'executait dans le contexte de securite du lecteur.
--
-- Correctif. Le comptage passe par une fonction security definer. La vue reste
-- security_invoker, donc le RLS de availability_slots continue de s'appliquer :
-- on ne rend visible aucun creneau supplementaire, on corrige seulement un
-- nombre. Ce nombre n'expose l'identite de personne, uniquement un total, qui est
-- precisement ce que l'ecran de reservation doit afficher ("2 / 3 places").
-- =============================================================================

create or replace function nb_places_prises(slot uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from bookings where slot_id = slot;
$$;

comment on function nb_places_prises(uuid) is
  'Nombre reel de places prises sur un creneau, independamment des politiques RLS du lecteur. Ne revele aucune identite, seulement un total.';

-- Meme colonnes, meme ordre, memes types que la version de 0001 : create or
-- replace view l'accepte. Le left join et le group by disparaissent, la fonction
-- suffit.
create or replace view slots_disponibles
with (security_invoker = true)
as
select
  s.id,
  s.prof_id,
  s.start_at,
  s.duree_min,
  s.capacite,
  s.prix_eur,
  s.domaines,
  nb_places_prises(s.id)                    as places_prises,
  (nb_places_prises(s.id) >= s.capacite)    as complet
from availability_slots s;
