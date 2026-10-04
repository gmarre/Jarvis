-- =============================================================================
-- 0005 : le contenu pedagogique en base
--
-- Pourquoi. Les trois JSON du contenu (DAG, exercices, cartes) etaient importes
-- dans le bundle de l'application : 133 ko gzipes au 4 octobre 2026 pour 75
-- competences, et chaque domaine ajoute l'alourdit. A l'echelle du programme
-- complet (600 a 800 competences, 5 000 a 10 000 exercices), chaque eleve
-- telechargerait tout, reponses comprises, avant son premier ecran.
--
-- Principe : Git reste la SOURCE du contenu (production par agents, revue,
-- historique) ; la base le SERT. On n'ecrit jamais le contenu a la main ici :
-- scripts/publier.py valide le contenu puis appelle publier_contenu(), qui
-- remplace tout en une seule transaction.
--
-- Ce que l'eleve ne doit pas lire est isole dans content_exercise_keys :
-- reponse, corrige, et misconceptions des QCM. Ces dernieres trahiraient la
-- bonne reponse : c'est la seule proposition qui n'en a pas.
--
-- ETAPE TRANSITOIRE : tant que la correction se fait dans le navigateur (phase
-- 2), les eleves connectes peuvent lire content_exercise_keys. La migration de
-- la phase 3 retire ce droit, quand la correction passe cote serveur. Ce n'est
-- pas pire qu'aujourd'hui, ou les reponses sont dans le bundle public.
--
-- Rejouable : create ... if not exists, create or replace, drop policy if exists.
-- =============================================================================

-- --- Tables ------------------------------------------------------------------

create table if not exists content_skills (
  id                text primary key check (id ~ '^[A-O][0-9]{3}$'),
  domain            text not null check (domain ~ '^[A-O]$'),
  domain_name       text not null,
  label             text not null,
  description       text not null,
  prerequisites     text[] not null default '{}',
  difficulty        integer not null,
  school_level      text not null,
  validation_test   text not null,
  mastery_threshold jsonb not null,
  exercise_ids      text[] not null default '{}',
  mindmap_id        text,
  programme_ref     jsonb not null default '[]'::jsonb
);

-- Partie lisible d'un exercice : tout ce qui s'affiche AVANT la reponse.
create table if not exists content_exercises (
  id                   text primary key check (id ~ '^EX-[A-O][0-9]{3}-[DEM]-[0-9]{2}$'),
  skill_id             text not null references content_skills(id) on delete cascade,
  level                text not null check (level in ('decouverte', 'entrainement', 'maitrise')),
  type                 text not null check (type in ('numerique', 'qcm', 'texte', 'vrai_faux')),
  statement            text not null,
  image                text,
  -- Propositions SANS misconception : [{"key": "a", "text": "..."}].
  choices              jsonb,
  hint                 text,
  -- L'unite s'affiche a cote du champ de saisie, avant la reponse.
  answer_unit          text,
  estimated_duration_s integer,
  review_status        text not null,
  programme_ref        text
);
create index if not exists content_exercises_skill_idx on content_exercises (skill_id);

-- Partie a ne pas montrer avant la reponse.
create table if not exists content_exercise_keys (
  exercise_id    text primary key references content_exercises(id) on delete cascade,
  answer         jsonb not null,                  -- value, accepted, tolerance, unit
  solution_steps jsonb not null,                  -- corrige, etape par etape
  misconceptions jsonb not null default '{}'::jsonb  -- {"b": "L'eleve ...", ...}
);

create table if not exists content_mindmaps (
  id            text primary key check (id ~ '^MM-[A-O]-[0-9]{2}$'),
  title         text not null,
  domain        text not null,
  skill_ids     text[] not null,
  school_levels text[] not null,
  markdown      text not null,
  review_status text not null,
  programme_ref text
);

-- Une ligne par publication : quoi, quand, depuis quel commit. Sert aussi de
-- cle de cache a l'application (la derniere publication).
create table if not exists content_publications (
  id            bigserial primary key,
  published_at  timestamptz not null default now(),
  source_commit text not null,
  nb_skills     integer not null,
  nb_exercises  integer not null,
  nb_mindmaps   integer not null
);

-- --- Droits ------------------------------------------------------------------
-- Lecture pour tout compte connecte ; aucune ecriture depuis le client. Seule
-- publier_contenu() (security definer, reservee au serveur) ecrit.

alter table content_skills        enable row level security;
alter table content_exercises     enable row level security;
alter table content_exercise_keys enable row level security;
alter table content_mindmaps      enable row level security;
alter table content_publications  enable row level security;

drop policy if exists content_skills_lecture on content_skills;
create policy content_skills_lecture on content_skills
  for select to authenticated using (true);

drop policy if exists content_exercises_lecture on content_exercises;
create policy content_exercises_lecture on content_exercises
  for select to authenticated using (true);

-- TRANSITOIRE, retiree en phase 3 (correction cote serveur).
drop policy if exists content_exercise_keys_lecture_transitoire on content_exercise_keys;
create policy content_exercise_keys_lecture_transitoire on content_exercise_keys
  for select to authenticated using (true);

drop policy if exists content_mindmaps_lecture on content_mindmaps;
create policy content_mindmaps_lecture on content_mindmaps
  for select to authenticated using (true);

drop policy if exists content_publications_lecture on content_publications;
create policy content_publications_lecture on content_publications
  for select to authenticated using (true);

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

  select count(*) into nb_s from content_skills;
  select count(*) into nb_e from content_exercises;
  select count(*) into nb_m from content_mindmaps;

  insert into content_publications (source_commit, nb_skills, nb_exercises, nb_mindmaps)
  values (source_commit, nb_s, nb_e, nb_m);

  return jsonb_build_object('skills', nb_s, 'exercises', nb_e, 'mindmaps', nb_m,
                            'source_commit', source_commit);
end;
$$;

-- Personne d'autre que le serveur ne doit pouvoir l'appeler, meme pour se
-- faire refuser : on retire le droit d'execution par defaut.
revoke execute on function publier_contenu(jsonb, text) from public, anon, authenticated;

-- ... et on le donne explicitement au role serveur. Le bloc tolere l'absence du
-- role (Postgres de test sans Supabase).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function publier_contenu(jsonb, text) to service_role';
  end if;
end $$;
