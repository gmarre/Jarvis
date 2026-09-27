-- =============================================================================
-- MATH EDUCATION (Racine) - 0002 : ligne teachers automatique
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable, comme 0001.
--
-- POURQUOI. Un professeur qui s'inscrit obtient une ligne `profiles` (trigger de
-- 0001) mais aucune ligne `teachers`. Or `getCatalog()` joint les deux pour
-- afficher un creneau a un eleve. Consequence observee en relisant le code :
--
--   useBookings.ts : `const teacher = catalog.teachers.find(...)`
--                    `if (!teacher) return null`
--
-- tous les creneaux de ce professeur etaient silencieusement ecartes de l'ecran
-- de reservation, et une reservation deja prise disparaissait de "Prochain
-- cours". Le mock ne montrait pas le probleme : ses professeurs etaient toujours
-- presents dans le catalogue.
--
-- On cree donc la ligne `teachers` des qu'un profil est professeur, a
-- l'inscription comme au changement de role. Le professeur completera ensuite
-- son titre et ses domaines depuis son espace.
-- =============================================================================

-- Nom affiche aux eleves : "Marc B." plutot que l'email. Sans nom de famille, on
-- se contente du prenom ; sans prenom du tout, un libelle neutre en attendant que
-- le professeur complete son profil.
create or replace function nom_court_par_defaut(prenom text, nom text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(trim(prenom), '') = '' then 'Professeur'
    when coalesce(trim(nom), '') = '' then trim(prenom)
    else trim(prenom) || ' ' || upper(left(trim(nom), 1)) || '.'
  end;
$$;

create or replace function creer_ligne_teacher_si_prof()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> 'prof' then
    return new;
  end if;

  -- Idempotent : ne touche pas une ligne existante, qui porte deja le titre, la
  -- note et les domaines renseignes par le professeur.
  insert into public.teachers (id, nom_court)
  values (new.id, nom_court_par_defaut(new.prenom, new.nom))
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Deux declencheurs, parce que les deux chemins existent : inscription directe
-- avec role='prof' dans les metadonnees, et passage a prof plus tard.
drop trigger if exists profiles_teacher_insert on profiles;
create trigger profiles_teacher_insert
  after insert on profiles
  for each row execute function creer_ligne_teacher_si_prof();

drop trigger if exists profiles_teacher_update on profiles;
create trigger profiles_teacher_update
  after update of role on profiles
  for each row
  when (new.role = 'prof')
  execute function creer_ligne_teacher_si_prof();

-- Rattrapage pour les profils professeurs deja crees avant cette migration.
insert into teachers (id, nom_court)
select p.id, nom_court_par_defaut(p.prenom, p.nom)
from profiles p
where p.role = 'prof'
on conflict (id) do nothing;
