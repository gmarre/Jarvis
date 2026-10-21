-- =============================================================================
-- 0023 : le positionnement ne compte que les reponses justes du premier coup
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable. Apres 0021.
--
-- Faille relevee a la revue de securite du sprint 6 (21 octobre 2026) : la
-- correction montre la reponse attendue. Un eleve pouvait repondre faux a un
-- exercice, lire la correction, puis repondre juste au meme exercice et faire
-- passer pour acquises la competence et tous ses prerequis. Une reponse ne
-- prouve plus rien si l'eleve avait deja recu la correction de cet exercice,
-- au test comme en exercice. La fonction `corriger` (version 15) refuse en
-- outre a un eleve toute correction qui ne serait pas enregistree.
-- =============================================================================

-- Clot le test de positionnement de l'eleve connecte. p_maitrisees : les
-- competences que le test a jugees acquises. Chacune doit avoir ete reussie
-- pendant ce test (reponse corrigee par le serveur depuis le dernier
-- positionnement, dans les dernieres 24 heures, juste du premier coup sur
-- cet exercice), ou etre un prerequis, direct ou non, d'une competence
-- reussie. Sinon, rien n'est ecrit.
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
      -- Reponse juste du premier coup : l'eleve n'avait jamais vu la
      -- correction de cet exercice (ni au test, ni en exercice).
      and not exists (
        select 1 from placement_reponses r2
        where r2.user_id = r.user_id and r2.exercise_id = r.exercise_id and r2.created_at < r.created_at
      )
      and not exists (
        select 1 from exercise_attempts t
        where t.user_id = r.user_id and t.exercise_id = r.exercise_id and t.created_at < r.created_at
      )
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
