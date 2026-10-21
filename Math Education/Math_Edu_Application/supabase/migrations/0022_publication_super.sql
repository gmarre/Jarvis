-- =============================================================================
-- 0022 : publier_contenu publie de nouveau les super exercices
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable.
--
-- Constat du 21 octobre 2026 : en ligne, publier_contenu etait la version de
-- la migration 0014 (sans la cle "super"), alors que les tables de 0016
-- existent. 0014 a sans doute ete rejouee apres 0016 ; la publication du
-- 21 octobre a donc laisse content_super vide, et aucun super exercice n'est
-- propose aux eleves.
--
-- Rejouer 0016 en entier n'est PAS la bonne reponse : elle recreerait la
-- politique super_attempts_insert_soi, que 0021 a retiree (le navigateur
-- pourrait de nouveau ecrire ses passages). Ce fichier ne reprend que la
-- fonction de publication de 0016, a l'identique.
--
-- Ensuite : python scripts/publier.py --apply (Claude s'en charge).
-- =============================================================================

-- --- Publication -------------------------------------------------------------

create or replace function publier_contenu(contenu jsonb, source_commit text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  nb_s integer;
  nb_e integer;
  nb_m integer;
  nb_f integer;
  nb_x integer;
begin
  -- Le contenu ne s'ecrit que depuis le serveur (cle service_role). Sans ce
  -- garde, n'importe quel eleve connecte pourrait reecrire les reponses.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Publication reservee au serveur' using errcode = 'insufficient_privilege';
  end if;

  -- Remplacement complet, dans la transaction de l'appel : une publication
  -- qui echoue en route ne laisse jamais une base a moitie remplie.
  -- « where true » : l'extension safeupdate, active sur les requetes d'API de
  -- Supabase, refuse un DELETE sans WHERE, meme dans une fonction.
  delete from content_super_keys where true;
  delete from content_super where true;
  delete from content_flashcards where true;
  delete from content_exercise_keys where true;
  delete from content_exercises where true;
  delete from content_mindmaps where true;
  delete from content_skills where true;

  insert into content_skills (
    id, domain, domain_name, label, description, prerequisites, difficulty,
    school_level, validation_test, mastery_threshold, exercise_ids, mindmap_id, programme_ref
  )
  select
    s->>'id', s->>'domain', s->>'domain_name', s->>'label', s->>'description',
    array(select jsonb_array_elements_text(coalesce(s->'prerequisites', '[]'::jsonb))),
    (s->>'difficulty')::integer, s->>'school_level', s->>'validation_test',
    s->'mastery_threshold',
    array(select jsonb_array_elements_text(coalesce(s->'exercise_ids', '[]'::jsonb))),
    nullif(s->>'mindmap_id', ''),
    coalesce(s->'programme_ref', '[]'::jsonb)
  from jsonb_array_elements(contenu->'skills') as s;

  insert into content_exercises (
    id, skill_id, level, type, statement, image, choices, hint, answer_unit,
    estimated_duration_s, review_status, programme_ref
  )
  select
    e->>'id', e->>'skill_id', e->>'level', e->>'type', e->>'statement', e->>'image',
    case when jsonb_typeof(e->'choices') = 'array' then
      (select jsonb_agg(c - 'misconception' order by ord)
       from jsonb_array_elements(e->'choices') with ordinality as t(c, ord))
    end,
    e->>'hint', e->'answer'->>'unit',
    (e->>'estimated_duration_s')::integer, e->>'review_status', e->>'programme_ref'
  from jsonb_array_elements(contenu->'exercises') as e;

  insert into content_exercise_keys (exercise_id, answer, solution_steps, misconceptions)
  select
    e->>'id', e->'answer', e->'solution_steps',
    coalesce(
      (select jsonb_object_agg(c->>'key', c->'misconception')
       from jsonb_array_elements(e->'choices') as c
       where jsonb_typeof(e->'choices') = 'array'),
      '{}'::jsonb
    )
  from jsonb_array_elements(contenu->'exercises') as e;

  insert into content_mindmaps (
    id, title, domain, skill_ids, school_levels, markdown, review_status, programme_ref
  )
  select
    m->>'id', m->>'title', m->>'domain',
    array(select jsonb_array_elements_text(m->'skill_ids')),
    array(select jsonb_array_elements_text(m->'school_levels')),
    m->>'markdown', m->>'review_status', m->>'programme_ref'
  from jsonb_array_elements(contenu->'mindmaps') as m;

  insert into content_flashcards (id, skill_id, recto, verso, review_status)
  select f->>'id', f->>'skill_id', f->>'recto', f->>'verso', f->>'review_status'
  from jsonb_array_elements(coalesce(contenu->'flashcards', '[]'::jsonb)) as f;

  insert into content_super (
    id, skill_id, skill_ids, school_level, title, contexte, image, duree_estimee_min,
    questions, review_status, programme_ref
  )
  select
    x->>'id', x->>'skill_id',
    array(select jsonb_array_elements_text(x->'skill_ids')),
    x->>'school_level', x->>'title', x->>'contexte', x->>'image',
    (x->>'duree_estimee_min')::integer,
    -- Partie lisible de chaque question : ni reponse, ni corrige, ni
    -- misconception (qui trahirait la bonne proposition).
    (select jsonb_agg(
       jsonb_strip_nulls(jsonb_build_object(
         'key', q->>'key', 'skill_id', q->>'skill_id', 'statement', q->>'statement',
         'type', q->>'type', 'points', (q->>'points')::integer, 'hint', q->>'hint',
         'answer_unit', q->'answer'->>'unit',
         'choices', case when jsonb_typeof(q->'choices') = 'array' then
           (select jsonb_agg(c - 'misconception' order by ord)
            from jsonb_array_elements(q->'choices') with ordinality as t(c, ord)) end
       )) order by qord)
     from jsonb_array_elements(x->'questions') with ordinality as tq(q, qord)),
    x->>'review_status', x->>'programme_ref'
  from jsonb_array_elements(coalesce(contenu->'super', '[]'::jsonb)) as x;

  insert into content_super_keys (super_id, questions)
  select
    x->>'id',
    (select jsonb_agg(jsonb_build_object(
       'key', q->>'key', 'answer', q->'answer', 'solution_steps', q->'solution_steps',
       'misconceptions', coalesce(
         (select jsonb_object_agg(c->>'key', c->'misconception')
          from jsonb_array_elements(q->'choices') as c
          where jsonb_typeof(q->'choices') = 'array'),
         '{}'::jsonb)
     ) order by qord)
     from jsonb_array_elements(x->'questions') with ordinality as tq(q, qord))
  from jsonb_array_elements(coalesce(contenu->'super', '[]'::jsonb)) as x;

  select count(*) into nb_s from content_skills;
  select count(*) into nb_e from content_exercises;
  select count(*) into nb_m from content_mindmaps;
  select count(*) into nb_f from content_flashcards;
  select count(*) into nb_x from content_super;

  insert into content_publications (source_commit, nb_skills, nb_exercises, nb_mindmaps, nb_flashcards, nb_super)
  values (source_commit, nb_s, nb_e, nb_m, nb_f, nb_x);

  return jsonb_build_object('skills', nb_s, 'exercises', nb_e, 'mindmaps', nb_m,
                            'flashcards', nb_f, 'super', nb_x, 'source_commit', source_commit);
end;
$$;

revoke execute on function publier_contenu(jsonb, text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function publier_contenu(jsonb, text) to service_role';
  end if;
end $$;

