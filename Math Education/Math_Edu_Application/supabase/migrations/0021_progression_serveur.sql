-- =============================================================================
-- 0021 : la progression s'ecrit cote serveur (sprint 6)
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable. A appliquer APRES le deploiement des fonctions `corriger` (mode
-- "exercice" et "positionnement") et `rendre-super`, et avec la version de
-- l'application qui les emploie : l'ancienne ecrivait elle-meme, elle serait
-- refusee.
--
-- Avant : le navigateur ecrivait ses tentatives, ses passages de super
-- exercice, son positionnement et sa progression. Un eleve determine pouvait
-- se donner n'importe quel niveau (CLAUDE.md §13, bloquant avant tout
-- paiement).
--
-- Apres :
--   1. exercise_attempts et super_attempts ne s'ecrivent plus depuis le
--      navigateur : les fonctions `corriger` et `rendre-super` les ecrivent
--      avec la cle service_role, apres avoir corrige ;
--   2. skill_progress : l'eleve ne peut plus inserer de ligne, et ne modifie
--      que la relecture espacee de ses cartes mentales (review_box,
--      next_review_at, updated_at). Tout le reste est ecrit par le serveur ;
--   3. positionnement : chaque reponse du test est gardee par `corriger`
--      (placement_reponses). La fonction enregistrer_positionnement n'accepte
--      comme acquises que les competences reussies pendant ce test, et leurs
--      prerequis (c'est la regle du test : lib/placement.ts).
-- =============================================================================

-- --- 1. Tentatives et passages : plus d'ecriture par le navigateur ------------------

drop policy if exists exercise_attempts_insert_soi on exercise_attempts;
revoke insert, update, delete on exercise_attempts from authenticated;

drop policy if exists super_attempts_insert_soi on super_attempts;
revoke insert, update, delete on super_attempts from authenticated;

drop policy if exists placement_results_insert_soi on placement_results;
revoke insert, update, delete on placement_results from authenticated;

-- --- 2. Progression : seule la relecture des cartes reste a l'eleve ------------------

drop policy if exists skill_progress_insert_soi on skill_progress;
revoke insert, delete on skill_progress from authenticated;

-- La politique skill_progress_update_soi (0001) reste : l'eleve met a jour SA
-- ligne. Ce trigger borne ce qu'il peut y changer. Il est en security invoker :
-- current_user y est le role de l'appelant. Le navigateur arrive en
-- `authenticated` ; la cle service_role et les fonctions security definer
-- (positionnement) arrivent sous un autre role, et ne sont pas bornees.
create or replace function proteger_progression()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if (new.user_id, new.skill_id, new.status, new.recent, new.score, new.attempts,
      new.niveau, new.exercices_reussis, new.controles_reussis, new.prochain_controle,
      new.valide_par_test)
     is distinct from
     (old.user_id, old.skill_id, old.status, old.recent, old.score, old.attempts,
      old.niveau, old.exercices_reussis, old.controles_reussis, old.prochain_controle,
      old.valide_par_test)
  then
    raise exception 'progression ecrite par le serveur : seule la relecture des cartes se modifie ici'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function proteger_progression() from public, anon, authenticated;

drop trigger if exists skill_progress_protegee on skill_progress;
create trigger skill_progress_protegee
  before update on skill_progress
  for each row execute function proteger_progression();

-- --- 3. Positionnement ----------------------------------------------------------------

create table if not exists placement_reponses (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references profiles (id) on delete cascade,
  exercise_id text        not null check (exercise_id ~ '^EX-[A-P][0-9]{3}-[DEM]-[0-9]{2}$'),
  skill_id    text        not null check (skill_id ~ '^[A-P][0-9]{3}$'),
  juste       boolean     not null,
  created_at  timestamptz not null default now()
);

create index if not exists placement_reponses_user_idx on placement_reponses (user_id, created_at desc);

alter table placement_reponses enable row level security;

drop policy if exists placement_reponses_select_autorises on placement_reponses;
create policy placement_reponses_select_autorises on placement_reponses
  for select to authenticated
  using (peut_lire_eleve(user_id));

revoke insert, update, delete on placement_reponses from authenticated;
revoke all on placement_reponses from anon;

-- Clot le test de positionnement de l'eleve connecte. p_maitrisees : les
-- competences que le test a jugees acquises. Chacune doit avoir ete reussie
-- pendant ce test (reponse corrigee par le serveur depuis le dernier
-- positionnement, dans les dernieres 24 heures), ou etre un prerequis, direct
-- ou non, d'une competence reussie. Sinon, rien n'est ecrit.
--
-- Les competences acquises passent au niveau 4, validees par le test, avec un
-- premier controle a J+14 (CONTROLES_JOURS_TEST, _shared/maitrise.ts). Une
-- competence deja acquise par le travail n'est pas touchee. Rend le nombre de
-- lignes de progression ecrites.
create or replace function enregistrer_positionnement(
  p_maitrisees text[],
  p_questions  integer,
  p_lacunes    text[],
  p_objectif   text,
  p_estimation integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_depuis   timestamptz;
  v_hors     text[];
  v_n        integer;
  v_echeance timestamptz := date_trunc('day', now() + interval '14 days') + interval '6 hours';
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'eleve') then
    raise exception 'positionnement reserve aux eleves' using errcode = '42501';
  end if;
  if p_objectif is null or p_objectif !~ '^[A-P][0-9]{3}$' then
    raise exception 'positionnement : objectif invalide' using errcode = '22023';
  end if;

  p_maitrisees := array(select distinct m from unnest(coalesce(p_maitrisees, '{}')) as m);

  select coalesce(max(created_at), '-infinity'::timestamptz) into v_depuis
  from placement_results where user_id = v_uid;

  with recursive acquises(id) as (
    select distinct r.skill_id
    from placement_reponses r
    where r.user_id = v_uid
      and r.juste
      and r.created_at > v_depuis
      and r.created_at > now() - interval '1 day'
    union
    select p.id
    from acquises a
    join content_skills s on s.id = a.id
    cross join lateral unnest(s.prerequisites) as p(id)
  )
  select array(select m from unnest(p_maitrisees) as m where m not in (select id from acquises))
  into v_hors;

  if cardinality(v_hors) > 0 then
    raise exception 'positionnement : competences non reussies pendant le test (%)', array_to_string(v_hors, ', ')
      using errcode = '42501';
  end if;

  insert into placement_results (
    user_id, questions_posees, competences_maitrisees, competences_totales,
    lacunes_racines, objectif_skill_id, estimation_semaines
  ) values (
    v_uid,
    greatest(coalesce(p_questions, 0), 0),
    cardinality(p_maitrisees),
    (select count(*) from content_skills),
    coalesce(p_lacunes, '{}'),
    p_objectif,
    least(greatest(coalesce(p_estimation, 0), 0), 520)
  );

  insert into skill_progress (
    user_id, skill_id, status, recent, score, attempts, review_box, updated_at,
    niveau, exercices_reussis, controles_reussis, prochain_controle, valide_par_test
  )
  select v_uid, s.id, 'mastered', '{}',
         greatest(coalesce((s.mastery_threshold->>'required')::integer, 0), 0),
         greatest(coalesce((s.mastery_threshold->>'out_of')::integer, 0), 0),
         1, now(), 4, '{}', 0, v_echeance, true
  from content_skills s
  where s.id = any(p_maitrisees)
  on conflict (user_id, skill_id) do update set
    status = excluded.status,
    recent = excluded.recent,
    score = excluded.score,
    attempts = excluded.attempts,
    review_box = excluded.review_box,
    updated_at = excluded.updated_at,
    niveau = excluded.niveau,
    exercices_reussis = excluded.exercices_reussis,
    controles_reussis = excluded.controles_reussis,
    prochain_controle = excluded.prochain_controle,
    valide_par_test = excluded.valide_par_test
  where skill_progress.niveau < 4;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function enregistrer_positionnement(text[], integer, text[], text, integer) from public, anon;
grant execute on function enregistrer_positionnement(text[], integer, text[], text, integer) to authenticated;
