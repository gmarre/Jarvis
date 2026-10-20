-- =============================================================================
-- 0016 : super exercices (sprint 2, point 7)
--
-- A appliquer dans Supabase APRES la 0014 : SQL Editor -> New query -> coller
-- -> Run. Rejouable.
--
-- Un super exercice est un probleme long (10 a 20 minutes) porte par une
-- competence : un enonce commun, des donnees a trier, puis 3 a 6 questions
-- enchainees, avec un bareme. Comme pour les exercices (migration 0005), ce qui
-- trahit la reponse est isole :
--   content_super       partie lisible : contexte, questions sans reponse ;
--   content_super_keys  reponses, corriges, misconceptions : lue par l'Edge
--                       Function `corriger` seulement (aucun droit eleve).
-- super_attempts garde chaque passage d'un eleve (score, total, reponses).
-- publier_contenu() publie aussi les super exercices (cle "super",
-- facultative).
-- =============================================================================

create table if not exists content_super (
  id                text primary key check (id ~ '^SX-[A-P][0-9]{3}-[0-9]{2}$'),
  skill_id          text not null references content_skills(id) on delete cascade,
  skill_ids         text[] not null,
  school_level      text not null,
  title             text not null,
  contexte          text not null,
  image             text,
  duree_estimee_min integer not null,
  questions         jsonb not null,
  review_status     text not null,
  programme_ref     text
);
create index if not exists content_super_skill_idx on content_super (skill_id);

create table if not exists content_super_keys (
  super_id  text primary key references content_super(id) on delete cascade,
  questions jsonb not null
);

alter table content_super      enable row level security;
alter table content_super_keys enable row level security;

drop policy if exists content_super_lecture on content_super;
create policy content_super_lecture on content_super
  for select to authenticated using (true);

-- Aucune politique sur content_super_keys : seuls le serveur (service_role) et
-- publier_contenu (security definer) la lisent ou l'ecrivent.
revoke all on content_super_keys from anon, authenticated;
revoke insert, update, delete on content_super from anon, authenticated;

alter table content_publications add column if not exists nb_super integer not null default 0;

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


-- --- Passages des eleves -----------------------------------------------------

-- Pas de cle etrangere vers content_super : une publication remplace tout, le
-- resultat de l'eleve doit lui survivre.
create table if not exists super_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles (id) on delete cascade,
  super_id   text        not null check (super_id ~ '^SX-[A-P][0-9]{3}-[0-9]{2}$'),
  skill_id   text        not null check (skill_id ~ '^[A-P][0-9]{3}$'),
  score      integer     not null check (score >= 0),
  total      integer     not null check (total > 0),
  reussi     boolean     not null,
  -- {"q1": {"reponse": "...", "juste": true}, ...}
  reponses   jsonb       not null default '{}'::jsonb,
  duree_s    integer     not null default 0 check (duree_s >= 0),
  created_at timestamptz not null default now(),
  constraint super_attempts_score_borne check (score <= total)
);

create index if not exists super_attempts_user_idx on super_attempts (user_id, created_at desc);

alter table super_attempts enable row level security;

drop policy if exists super_attempts_select_autorises on super_attempts;
create policy super_attempts_select_autorises on super_attempts
  for select to authenticated
  using (peut_lire_eleve(user_id));

-- Ecriture seule par l'eleve, comme exercise_attempts : on n'efface ni ne
-- modifie une trace d'apprentissage.
drop policy if exists super_attempts_insert_soi on super_attempts;
create policy super_attempts_insert_soi on super_attempts
  for insert to authenticated
  with check (user_id = auth.uid());

revoke update, delete on super_attempts from authenticated;
revoke all on super_attempts from anon;
