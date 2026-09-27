-- =============================================================================
-- MATH EDUCATION (Racine) - 0003 : le trigger de capacite doit voir le creneau
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable, comme les precedentes.
--
-- BUG CORRIGE. Aucune reservation n'etait possible. Toute tentative echouait sur
-- "Creneau introuvable", alors que le creneau existait et etait bien visible de
-- l'eleve.
--
-- Cause. refuse_surbooking() (migration 0001) n'etait pas security definer : il
-- s'executait donc avec les droits de l'appelant, un eleve. Or il fait
--
--   select capacite from availability_slots where id = new.slot_id for update
--
-- et `for update` exige le privilege UPDATE sur la ligne. La politique
-- availability_slots_update_prof limite l'UPDATE a `prof_id = auth.uid()`, faux
-- pour un eleve : la ligne etait filtree, places_max valait null, et le trigger
-- concluait que le creneau n'existait pas.
--
-- Pourquoi ca n'a pas ete vu plus tot. Le test local (supabase/tests) inserait
-- les reservations en tant que proprietaire de table, ce qui contourne le RLS.
-- Le scenario ne passait donc jamais par le contexte d'un vrai eleve. Le test a
-- ete corrige en meme temps que ce correctif, il tourne maintenant avec un JWT
-- d'eleve.
--
-- Correctif. security definer, comme les autres fonctions d'autorisation de
-- 0001 : la verification de capacite est une regle de la base, elle doit lire la
-- table independamment des droits de celui qui reserve.
-- =============================================================================

create or replace function refuse_surbooking()
returns trigger
language plpgsql
-- Les deux lignes qui manquaient.
security definer
set search_path = public
as $$
declare
  places_max  integer;
  deja_prises integer;
begin
  -- for update verrouille le creneau jusqu'a la fin de la transaction, ce qui
  -- serialise deux reservations concurrentes sur la derniere place.
  select capacite into places_max
  from availability_slots
  where id = new.slot_id
  for update;

  if places_max is null then
    raise exception 'Creneau introuvable : %', new.slot_id;
  end if;

  select count(*) into deja_prises
  from bookings
  where slot_id = new.slot_id;

  if deja_prises >= places_max then
    raise exception 'Creneau complet (% places)', places_max
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Le trigger lui-meme n'a pas besoin d'etre recree : create or replace function
-- suffit, il pointe sur le meme nom. On le repose tout de meme, pour qu'appliquer
-- cette migration seule sur une base neuve donne le meme resultat.
drop trigger if exists bookings_capacite on bookings;
create trigger bookings_capacite
  before insert on bookings
  for each row execute function refuse_surbooking();
