-- =============================================================================
-- 0014 : cartes defi, recto et verso (sprint 2, point 4)
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable.
--
-- 1. content_flashcards : les cartes defi publiees (scripts/publier.py). Le
--    verso n'est pas une cle a proteger : l'eleve s'auto-evalue (« je savais /
--    je ne savais pas »), rien n'est corrige par le serveur. Lecture pour tout
--    compte connecte, comme les cartes mentales.
-- 2. publier_contenu() publie aussi les cartes defi (cle "flashcards" du
--    contenu, facultative : un contenu sans carte defi reste publiable).
-- 3. flashcard_progress : la revision espacee propre a chaque carte, par eleve
--    (boites 1 a 5, src/lib/defis.ts). Ecrite par l'eleve, lue par ceux qui
--    peuvent lire l'eleve (parent, professeur), comme skill_progress.
-- =============================================================================

-- --- 1. Cartes publiees -----------------------------------------------------

create table if not exists content_flashcards (
  id            text primary key check (id ~ '^FC-[A-P][0-9]{3}-[0-9]{2}$'),
  skill_id      text not null references content_skills(id) on delete cascade,
  recto         text not null,
  verso         text not null,
  review_status text not null
);
create index if not exists content_flashcards_skill_idx on content_flashcards (skill_id);

alter table content_flashcards enable row level security;

drop policy if exists content_flashcards_lecture on content_flashcards;
create policy content_flashcards_lecture on content_flashcards
  for select to authenticated using (true);

revoke insert, update, delete on content_flashcards from anon, authenticated;

alter table content_publications add column if not exists nb_flashcards integer not null default 0;

-- --- 2. Publication ----------------------------------------------------------

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

  select count(*) into nb_s from content_skills;
  select count(*) into nb_e from content_exercises;
  select count(*) into nb_m from content_mindmaps;
  select count(*) into nb_f from content_flashcards;

  insert into content_publications (source_commit, nb_skills, nb_exercises, nb_mindmaps, nb_flashcards)
  values (source_commit, nb_s, nb_e, nb_m, nb_f);

  return jsonb_build_object('skills', nb_s, 'exercises', nb_e, 'mindmaps', nb_m,
                            'flashcards', nb_f, 'source_commit', source_commit);
end;
$$;

revoke execute on function publier_contenu(jsonb, text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function publier_contenu(jsonb, text) to service_role';
  end if;
end $$;

-- --- 3. Revision espacee des cartes, par eleve --------------------------------

-- Pas de cle etrangere vers content_flashcards : une publication remplace
-- toutes les cartes, la progression de l'eleve doit lui survivre.
create table if not exists flashcard_progress (
  user_id        uuid        not null references profiles (id) on delete cascade,
  card_id        text        not null check (card_id ~ '^FC-[A-P][0-9]{3}-[0-9]{2}$'),
  skill_id       text        not null check (skill_id ~ '^[A-P][0-9]{3}$'),
  -- Boite de Leitner : 1 (a revoir demain) a 5 (revue dans un mois).
  box            smallint    not null default 1 check (box between 1 and 5),
  next_review_at timestamptz not null,
  reviews        integer     not null default 0 check (reviews >= 0),
  last_knew      boolean     not null default false,
  updated_at     timestamptz not null default now(),
  primary key (user_id, card_id)
);

create index if not exists flashcard_progress_review_idx
  on flashcard_progress (user_id, next_review_at);

alter table flashcard_progress enable row level security;

drop policy if exists flashcard_progress_select_autorises on flashcard_progress;
create policy flashcard_progress_select_autorises on flashcard_progress
  for select to authenticated
  using (peut_lire_eleve(user_id));

drop policy if exists flashcard_progress_insert_soi on flashcard_progress;
create policy flashcard_progress_insert_soi on flashcard_progress
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists flashcard_progress_update_soi on flashcard_progress;
create policy flashcard_progress_update_soi on flashcard_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on flashcard_progress from anon;
