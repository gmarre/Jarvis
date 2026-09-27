-- =============================================================================
-- MATH EDUCATION (Racine) - Schema initial
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Ce fichier est la source de verite du schema, versionne dans Git. Toute
-- modification ulterieure passe par un nouveau fichier 0002_*.sql, jamais par
-- une edition de celui-ci ni par un clic dans le dashboard : sinon la base et
-- le depot divergent, et plus personne ne sait ce qui tourne reellement.
--
-- Le schema est derive de src/types/domain.ts, qui fait deja office de contrat.
-- Les identifiants de competences et d'exercices (A001, C003...) restent du
-- texte : le contenu pedagogique vit en JSON versionne, il n'est pas encore en
-- base (sprint 3). Aucune cle etrangere vers le contenu pour l'instant.
-- =============================================================================

-- Ce fichier est rejouable : le relancer sur une base deja migree ne produit
-- aucune erreur et ne detruit aucune donnee. C'est volontaire, parce qu'il
-- s'applique par copier-coller dans le SQL Editor, sans outil qui garde la
-- trace de ce qui a deja tourne.
--
-- Necessaire pour gen_random_uuid(). Present par defaut sur Supabase.
create extension if not exists pgcrypto;

-- =============================================================================
-- 1. Types
-- =============================================================================

-- Postgres n'a pas de "create type if not exists" : sans ces blocs, relancer le
-- fichier echoue sur la premiere ligne et laisse la base a moitie migree.
do $$ begin
  create type user_role as enum ('eleve', 'prof', 'parent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type skill_status as enum ('locked', 'available', 'in_progress', 'mastered');
exception when duplicate_object then null; end $$;

-- Les 12 niveaux de SCHOOL_LEVELS (src/types/content.ts), dans l'ordre du
-- cursus. L'ordre de declaration d'un enum Postgres est son ordre de tri, ce
-- qui rend `order by niveau_scolaire` directement utilisable.
do $$ begin
  create type school_level as enum (
    'CP', 'CE1', 'CE2', 'CM1', 'CM2',
    '6e', '5e', '4e', '3e',
    '2nde', '1ere', 'Terminale'
  );
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 2. Tables
-- =============================================================================

-- Profil applicatif, un pour un avec auth.users.
create table if not exists profiles (
  id                        uuid primary key references auth.users (id) on delete cascade,
  role                      user_role    not null default 'eleve',
  prenom                    text         not null default '',
  nom                       text         not null default '',
  email                     text         not null,
  niveau_scolaire           school_level,
  date_naissance            date,
  email_parent              text,
  -- Null tant que le parent n'a pas confirme (RGPD mineurs de moins de 15 ans).
  consentement_parental_at  timestamptz,
  -- Preferences de confidentialite de l'ecran profil.
  partage_progression_prof  boolean      not null default true,
  resume_hebdo_parent       boolean      not null default false,
  rappels_revision          boolean      not null default true,
  -- Abonnement en jsonb : la forme bougera avec Stripe (iteration 2), inutile
  -- de figer des colonnes maintenant.
  abonnement                jsonb,
  cree_le                   timestamptz  not null default now()
);

comment on table profiles is
  'Profil applicatif. Le profil est incomplet tant que prenom est vide ou que niveau_scolaire est null pour un eleve : l''app redirige alors vers /bienvenue.';

-- Profil public d'un professeur, affiche aux eleves au moment de reserver.
create table if not exists teachers (
  id         uuid primary key references profiles (id) on delete cascade,
  nom_court  text        not null,
  titre      text        not null default '',
  note       numeric(2,1) check (note is null or (note >= 0 and note <= 5)),
  nb_cours   integer     not null default 0 check (nb_cours >= 0),
  -- Domaines du DAG couverts (A, B, C...).
  domaines   text[]      not null default '{}'
);

-- Rattachement parent / enfant, et jeton du lien de consentement.
-- Cree maintenant parce que le schema doit etre complet d'un coup ; utilise au
-- sprint 2b (envoi de l'email) et au sprint 5 (espace parent).
create table if not exists parent_links (
  id            uuid primary key default gen_random_uuid(),
  -- Null jusqu'a ce que le parent cree son compte via le lien recu.
  parent_id     uuid references profiles (id) on delete set null,
  eleve_id      uuid        not null references profiles (id) on delete cascade,
  email_parent  text        not null,
  -- On ne stocke jamais le jeton en clair : un acces en lecture a la table
  -- suffirait sinon a confirmer le consentement a la place du parent.
  token_hash    text        not null,
  expire_le     timestamptz not null,
  confirme_le   timestamptz,
  cree_le       timestamptz not null default now()
);

create index if not exists parent_links_eleve_idx on parent_links (eleve_id);
create index if not exists parent_links_parent_idx on parent_links (parent_id) where parent_id is not null;
create unique index if not exists parent_links_token_idx on parent_links (token_hash);

-- Progression sur le DAG. Une ligne par couple (eleve, competence).
create table if not exists skill_progress (
  user_id         uuid         not null references profiles (id) on delete cascade,
  skill_id        text         not null,
  status          skill_status not null default 'locked',
  -- Fenetre glissante des dernieres tentatives, de la plus ancienne a la plus
  -- recente. C'est sur elle que le moteur juge la maitrise (lib/dag.ts).
  recent          boolean[]    not null default '{}',
  score           integer      not null default 0 check (score >= 0),
  attempts        integer      not null default 0 check (attempts >= 0),
  -- Echeance de revision espacee (Leitner), null si rien a reviser.
  next_review_at  timestamptz,
  review_box      integer      not null default 0 check (review_box between 0 and 4),
  updated_at      timestamptz,
  primary key (user_id, skill_id)
);

-- L'encart "a reviser aujourd'hui" interroge les echeances passees.
create index if not exists skill_progress_review_idx
  on skill_progress (user_id, next_review_at)
  where next_review_at is not null;

-- Historique des tentatives. Table en ecriture seule cote eleve : on n'efface
-- pas une trace d'apprentissage, elle sert au diagnostic et au reglage de la
-- difficulte du contenu.
create table if not exists exercise_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references profiles (id) on delete cascade,
  exercise_id  text        not null,
  skill_id     text        not null,
  answer       text        not null default '',
  is_correct   boolean     not null,
  duration_s   integer     not null default 0 check (duration_s >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists exercise_attempts_user_idx on exercise_attempts (user_id, created_at desc);
create index if not exists exercise_attempts_skill_idx on exercise_attempts (user_id, skill_id);

-- Resultat du test de positionnement. Absent de CLAUDE.md section 6, ajoute ici.
-- On garde l'historique (une ligne par passage) plutot qu'une seule ligne
-- ecrasee : comparer deux positionnements a six mois d'ecart est exactement ce
-- qu'un parent voudra voir.
create table if not exists placement_results (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid        not null references profiles (id) on delete cascade,
  questions_posees        integer     not null,
  competences_maitrisees  integer     not null,
  competences_totales     integer     not null,
  lacunes_racines         text[]      not null default '{}',
  objectif_skill_id       text        not null,
  estimation_semaines     integer     not null,
  created_at              timestamptz not null default now()
);

create index if not exists placement_results_user_idx on placement_results (user_id, created_at desc);

-- Creneaux ouverts par un professeur.
-- Noter l'absence de places_prises : c'est un compte derive des reservations,
-- expose par la vue slots_disponibles plus bas. Le stocker garantirait une
-- derive entre le compteur et la realite.
create table if not exists availability_slots (
  id         uuid primary key default gen_random_uuid(),
  prof_id    uuid        not null references profiles (id) on delete cascade,
  start_at   timestamptz not null,
  duree_min  integer     not null default 90 check (duree_min > 0),
  capacite   integer     not null default 3 check (capacite between 1 and 10),
  prix_eur   integer     not null default 20 check (prix_eur >= 0),
  domaines   text[]      not null default '{}',
  cree_le    timestamptz not null default now(),
  -- Un professeur ne peut pas ouvrir deux fois le meme horaire.
  unique (prof_id, start_at)
);

create index if not exists availability_slots_start_idx on availability_slots (start_at);

create table if not exists bookings (
  id        uuid primary key default gen_random_uuid(),
  slot_id   uuid        not null references availability_slots (id) on delete cascade,
  eleve_id  uuid        not null references profiles (id) on delete cascade,
  -- Competence sur laquelle la seance est preparee.
  skill_id  text,
  paid_at   timestamptz,
  cree_le   timestamptz not null default now(),
  -- Un eleve ne reserve qu'une place par creneau.
  unique (slot_id, eleve_id)
);

create index if not exists bookings_eleve_idx on bookings (eleve_id);
create index if not exists bookings_slot_idx on bookings (slot_id);

-- =============================================================================
-- 3. Capacite des creneaux, garantie par la base
--
-- Verifier la capacite seulement dans l'interface ne suffit pas : deux eleves
-- qui reservent la derniere place au meme instant passeraient tous les deux.
-- Le verrou sur la ligne du creneau serialise les reservations concurrentes.
-- =============================================================================

create or replace function refuse_surbooking()
returns trigger
language plpgsql
as $$
declare
  places_max  integer;
  deja_prises integer;
begin
  -- for update verrouille le creneau jusqu'a la fin de la transaction.
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

drop trigger if exists bookings_capacite on bookings;
create trigger bookings_capacite
  before insert on bookings
  for each row execute function refuse_surbooking();

-- =============================================================================
-- 4. Creation du profil a l'inscription
--
-- L'inscription par email transmet role et prenom dans les metadonnees. Google
-- ne fournit ni niveau scolaire, ni date de naissance, ni email parent : le
-- profil est alors cree incomplet, et l'app redirige vers /bienvenue.
-- =============================================================================

create or replace function creer_profil_pour_nouvel_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, prenom, nom)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'eleve'),
    coalesce(
      new.raw_user_meta_data ->> 'prenom',
      -- Google renvoie given_name ou full_name selon les cas.
      new.raw_user_meta_data ->> 'given_name',
      split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1),
      ''
    ),
    coalesce(new.raw_user_meta_data ->> 'nom', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function creer_profil_pour_nouvel_utilisateur();

-- =============================================================================
-- 4bis. Colonnes que le client ne doit jamais modifier
--
-- Le RLS autorise un utilisateur a mettre a jour SA ligne de profiles. Sans
-- garde supplementaire, cela lui permet aussi de modifier n'importe laquelle de
-- ses colonnes, et trois d'entre elles sont dangereuses :
--
--   role                     : un eleve se declare prof, puis ouvre des
--                              creneaux payants. Escalade de privilege.
--   consentement_parental_at : un mineur se confirme a lui-meme l'accord de son
--                              parent. C'est la protection legale des moins de
--                              15 ans qui tombe.
--   email, cree_le           : l'identite vient de auth.users, pas du client.
--   abonnement               : sera pose par le webhook Stripe, cote serveur.
--
-- Ce trigger ne s'applique qu'aux requetes portant un JWT utilisateur
-- (auth.role() = 'authenticated'). Les fonctions serveur, qui utilisent la cle
-- service_role, passent outre : c'est elles qui confirmeront le consentement
-- apres verification du jeton envoye au parent.
-- =============================================================================

create or replace function proteger_colonnes_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Les appels serveur (service_role) ne sont pas concernes.
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Le role ne se modifie pas depuis le client'
      using errcode = 'insufficient_privilege';
  end if;

  if new.consentement_parental_at is distinct from old.consentement_parental_at then
    raise exception 'Le consentement parental se confirme par le lien envoye au parent'
      using errcode = 'insufficient_privilege';
  end if;

  -- Ces trois colonnes sont silencieusement remises a leur valeur : le client
  -- les renvoie parfois sans intention de les changer.
  new.email := old.email;
  new.cree_le := old.cree_le;
  new.abonnement := old.abonnement;

  return new;
end;
$$;

drop trigger if exists profiles_colonnes_protegees on profiles;
create trigger profiles_colonnes_protegees
  before update on profiles
  for each row execute function proteger_colonnes_profil();

-- =============================================================================
-- 5. Fonctions d'autorisation
--
-- PIEGE A CONNAITRE : une politique RLS qui interroge une autre table protegee
-- par RLS declenche une recursion infinie, et Supabase renvoie une erreur
-- illisible. On isole donc ces jointures dans des fonctions security definer,
-- qui s'executent avec les droits du proprietaire et contournent le RLS des
-- tables qu'elles lisent. C'est la premiere cause de perte de temps sur
-- Supabase.
--
-- stable : le resultat ne change pas dans une meme requete, Postgres peut donc
-- ne l'evaluer qu'une fois par ligne au lieu de refaire la jointure.
-- =============================================================================

-- Un professeur voit la progression d'un eleve seulement si cet eleve est
-- inscrit a l'un de ses creneaux ET a autorise le partage dans son profil.
-- Les deux conditions, pas une seule.
create or replace function est_prof_de(eleve uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from bookings b
    join availability_slots s on s.id = b.slot_id
    join profiles p on p.id = b.eleve_id
    where b.eleve_id = eleve
      and s.prof_id = auth.uid()
      and p.partage_progression_prof
  );
$$;

-- Un parent voit son enfant seulement apres avoir confirme le rattachement.
create or replace function est_parent_de(eleve uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from parent_links l
    where l.eleve_id = eleve
      and l.parent_id = auth.uid()
      and l.confirme_le is not null
  );
$$;

-- Role du compte courant. Passe par une fonction security definer plutot que par
-- un "exists (select ... from profiles)" ecrit directement dans une politique :
-- une politique qui lit profiles declenche l'evaluation des politiques de
-- profiles, c'est le nid a recursion decrit plus haut.
create or replace function role_actuel()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- Lecture autorisee des donnees d'apprentissage d'un utilisateur : soi-meme,
-- son professeur sous conditions, son parent rattache.
create or replace function peut_lire_eleve(eleve uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select eleve = auth.uid()
      or est_prof_de(eleve)
      or est_parent_de(eleve);
$$;

-- =============================================================================
-- 6. Row Level Security
--
-- Supabase bloque tout par defaut des que RLS est active : sans politique
-- explicite, l'app affiche "pas de donnees" alors que la base est remplie.
-- Chaque table ci-dessous a donc ses politiques, ecrites operation par
-- operation plutot qu'en "for all", pour que lecture et ecriture ne soient
-- jamais ouvertes par accident ensemble.
-- =============================================================================

alter table profiles           enable row level security;
alter table teachers           enable row level security;
alter table parent_links       enable row level security;
alter table skill_progress     enable row level security;
alter table exercise_attempts  enable row level security;
alter table placement_results  enable row level security;
alter table availability_slots enable row level security;
alter table bookings           enable row level security;

-- --- profiles ---------------------------------------------------------------

drop policy if exists profiles_select_autorises on profiles;
create policy profiles_select_autorises on profiles
  for select to authenticated
  using (peut_lire_eleve(id));

drop policy if exists profiles_update_soi on profiles;
create policy profiles_update_soi on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Pas de politique insert : le profil est cree par le trigger de la section 4.
-- Pas de politique delete : la suppression de compte passe par auth.users, qui
-- cascade. Un eleve ne doit pas pouvoir effacer sa ligne en laissant un compte
-- d'authentification orphelin.

-- --- teachers ---------------------------------------------------------------

-- Le profil public d'un professeur est visible de tous les comptes connectes :
-- c'est ce qui permet a un eleve de choisir avec qui reserver.
drop policy if exists teachers_select_tous on teachers;
create policy teachers_select_tous on teachers
  for select to authenticated
  using (true);

drop policy if exists teachers_insert_soi on teachers;
create policy teachers_insert_soi on teachers
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists teachers_update_soi on teachers;
create policy teachers_update_soi on teachers
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- --- parent_links -----------------------------------------------------------

-- L'eleve voit ou en est sa demande, le parent voit ses rattachements.
drop policy if exists parent_links_select_concernes on parent_links;
create policy parent_links_select_concernes on parent_links
  for select to authenticated
  using (eleve_id = auth.uid() or parent_id = auth.uid());

drop policy if exists parent_links_insert_eleve on parent_links;
create policy parent_links_insert_eleve on parent_links
  for insert to authenticated
  with check (eleve_id = auth.uid());

-- Volontairement aucune politique update ni delete. Confirmer un consentement
-- est un acte juridique : il se fait par la fonction serveur qui verifie le
-- jeton (sprint 2b), jamais par une ecriture depuis le navigateur.

-- --- skill_progress ---------------------------------------------------------

drop policy if exists skill_progress_select_autorises on skill_progress;
create policy skill_progress_select_autorises on skill_progress
  for select to authenticated
  using (peut_lire_eleve(user_id));

drop policy if exists skill_progress_insert_soi on skill_progress;
create policy skill_progress_insert_soi on skill_progress
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists skill_progress_update_soi on skill_progress;
create policy skill_progress_update_soi on skill_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- exercise_attempts ------------------------------------------------------

drop policy if exists exercise_attempts_select_autorises on exercise_attempts;
create policy exercise_attempts_select_autorises on exercise_attempts
  for select to authenticated
  using (peut_lire_eleve(user_id));

drop policy if exists exercise_attempts_insert_soi on exercise_attempts;
create policy exercise_attempts_insert_soi on exercise_attempts
  for insert to authenticated
  with check (user_id = auth.uid());

-- Ni update ni delete : une tentative est un fait, elle ne se reecrit pas.

-- --- placement_results ------------------------------------------------------

drop policy if exists placement_results_select_autorises on placement_results;
create policy placement_results_select_autorises on placement_results
  for select to authenticated
  using (peut_lire_eleve(user_id));

drop policy if exists placement_results_insert_soi on placement_results;
create policy placement_results_insert_soi on placement_results
  for insert to authenticated
  with check (user_id = auth.uid());

-- --- availability_slots -----------------------------------------------------

-- Tous les comptes connectes voient les creneaux ouverts : c'est le catalogue.
drop policy if exists availability_slots_select_tous on availability_slots;
create policy availability_slots_select_tous on availability_slots
  for select to authenticated
  using (true);

-- Seul un compte professeur ouvre des creneaux, et seulement les siens.
drop policy if exists availability_slots_insert_prof on availability_slots;
create policy availability_slots_insert_prof on availability_slots
  for insert to authenticated
  with check (prof_id = auth.uid() and role_actuel() = 'prof');

drop policy if exists availability_slots_update_prof on availability_slots;
create policy availability_slots_update_prof on availability_slots
  for update to authenticated
  using (prof_id = auth.uid())
  with check (prof_id = auth.uid());

drop policy if exists availability_slots_delete_prof on availability_slots;
create policy availability_slots_delete_prof on availability_slots
  for delete to authenticated
  using (prof_id = auth.uid());

-- --- bookings ---------------------------------------------------------------

-- L'eleve voit ses reservations, le professeur voit celles de ses creneaux
-- (il doit savoir qui vient, independamment du partage de progression).
drop policy if exists bookings_select_concernes on bookings;
create policy bookings_select_concernes on bookings
  for select to authenticated
  using (
    eleve_id = auth.uid()
    or exists (
      select 1 from availability_slots s
      where s.id = slot_id and s.prof_id = auth.uid()
    )
  );

drop policy if exists bookings_insert_eleve on bookings;
create policy bookings_insert_eleve on bookings
  for insert to authenticated
  with check (eleve_id = auth.uid());

drop policy if exists bookings_delete_eleve on bookings;
create policy bookings_delete_eleve on bookings
  for delete to authenticated
  using (eleve_id = auth.uid());

-- Pas de politique update : le paiement (paid_at) sera pose par un webhook
-- Stripe cote serveur, jamais par le navigateur.

-- =============================================================================
-- 7. Vue du catalogue de creneaux
--
-- places_prises est calcule, jamais stocke. La vue herite du RLS des tables
-- qu'elle lit (security_invoker), donc elle n'ouvre aucun acces supplementaire.
-- =============================================================================

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
  count(b.id)::integer                    as places_prises,
  (count(b.id) >= s.capacite)              as complet
from availability_slots s
left join bookings b on b.slot_id = s.id
group by s.id;

comment on view slots_disponibles is
  'Creneaux avec le nombre de places prises calcule depuis bookings. C''est cette vue que lit getCatalog(), pas availability_slots.';
