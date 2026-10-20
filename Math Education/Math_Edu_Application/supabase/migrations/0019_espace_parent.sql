-- =============================================================================
-- 0019 : espace parent (sprint 4)
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable.
--
--   1. Rattachement : un compte parent recupere les enfants dont il a donne
--      le consentement, avec la meme adresse email (confirmee par l'Auth).
--      Le suivi passe ensuite par est_parent_de (0001), deja dans
--      peut_lire_eleve : profil, progression, tentatives, cartes, super
--      exercices de l'enfant deviennent lisibles par lui seul.
--   2. Rapport hebdomadaire : active par le parent, enfant par enfant
--      (fonction rapport-hebdo, Cron supabase/cron/rapport_hebdo.sql).
--   3. Corriges pour le parent : decision de Gauthier (19 octobre 2026),
--      les reponses et corriges sont visibles librement dans l'espace parent ;
--      seule une fonction serveur les rend, et seulement a un parent rattache.
-- =============================================================================

-- --- 1. Rattachement ----------------------------------------------------------

alter table parent_links add column if not exists rapport_hebdo boolean not null default false;

-- Le parent n'ecrit jamais parent_links directement (aucune politique
-- d'ecriture) : sinon il pourrait se rattacher a n'importe quel enfant.
create or replace function rattacher_mes_enfants()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if role_actuel() is distinct from 'parent' then
    return 0;
  end if;
  update parent_links l
     set parent_id = auth.uid()
   where l.parent_id is null
     and l.confirme_le is not null
     and lower(l.email_parent) = lower((select email from profiles where id = auth.uid()));
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function rattacher_mes_enfants() from public, anon;
grant execute on function rattacher_mes_enfants() to authenticated;

-- Les enfants rattaches, pour l'espace parent.
create or replace function mes_enfants()
returns table (lien_id uuid, eleve_id uuid, prenom text, niveau_scolaire text, rapport_hebdo boolean)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, p.id, p.prenom, p.niveau_scolaire::text, l.rapport_hebdo
  from parent_links l
  join profiles p on p.id = l.eleve_id
  where l.parent_id = auth.uid() and l.confirme_le is not null
  order by p.prenom;
$$;

revoke execute on function mes_enfants() from public, anon;
grant execute on function mes_enfants() to authenticated;

-- --- 2. Rapport hebdomadaire ------------------------------------------------------

create or replace function regler_rapport_hebdo(lien uuid, actif boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update parent_links set rapport_hebdo = actif
   where id = lien and parent_id = auth.uid() and confirme_le is not null;
  return found;
end;
$$;

revoke execute on function regler_rapport_hebdo(uuid, boolean) from public, anon;
grant execute on function regler_rapport_hebdo(uuid, boolean) to authenticated;

-- Journal des rapports : une fois par semaine au plus, et un lien de
-- desinscription par email (seule son empreinte est gardee).
create table if not exists rapports_envois (
  id                  uuid        primary key default gen_random_uuid(),
  lien_id             uuid        not null references parent_links (id) on delete cascade,
  semaine             date        not null,
  envoye_le           timestamptz not null default now(),
  desinscription_hash text        not null unique,
  unique (lien_id, semaine)
);

alter table rapports_envois enable row level security;
revoke all on rapports_envois from anon, authenticated;

-- --- 3. Corriges pour le parent ----------------------------------------------------

-- Reponses, corriges et erreurs de raisonnement des exercices d'une
-- competence, pour un parent qui a au moins un enfant rattache.
create or replace function corriges_pour_parent(competence text)
returns table (exercise_id text, answer jsonb, solution_steps jsonb, misconceptions jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select k.exercise_id, k.answer, k.solution_steps, k.misconceptions
  from content_exercise_keys k
  join content_exercises e on e.id = k.exercise_id
  where e.skill_id = competence
    and exists (
      select 1 from parent_links l
      where l.parent_id = auth.uid() and l.confirme_le is not null
    )
  order by k.exercise_id;
$$;

revoke execute on function corriges_pour_parent(text) from public, anon;
grant execute on function corriges_pour_parent(text) to authenticated;
