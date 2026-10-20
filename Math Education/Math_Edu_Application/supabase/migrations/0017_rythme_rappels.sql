-- =============================================================================
-- 0017 : rythme choisi par l'eleve et rappels par email (sprint 2, point 8)
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable.
--
-- Decision de Gauthier (20 octobre 2026) : coder maintenant le rythme et le
-- rappel au parent, selon l'etude Management de Projet/Etude_engagement.md
-- (partie 4) :
--   - l'eleve choisit 2 a 5 seances par semaine (3 par defaut) et ses jours ;
--   - un rappel par email, seulement un jour choisi, si rien n'est fait ce
--     jour-la, a l'heure choisie (7 h 30 a 19 h, Paris), au plus 1 par jour et
--     3 par semaine ; arret apres 2 rappels sans effet d'affilee ;
--   - destinataire : le parent avant 15 ans (il confirme par un lien), l'eleve
--     ensuite ; desinscription en un clic par le lien de chaque email.
--
-- Le Cron qui declenche les envois n'est PAS ici : pg_cron n'existe pas dans
-- les tests (PGlite) et il demande un secret. Voir supabase/cron/rappels.sql.
-- =============================================================================

-- --- 1. Le rythme, colonnes libres de l'eleve -------------------------------

alter table profiles add column if not exists rythme_jours smallint not null default 3;
alter table profiles add column if not exists jours_travail smallint[] not null default '{}';

alter table profiles drop constraint if exists profiles_rythme_jours_borne;
alter table profiles add constraint profiles_rythme_jours_borne
  check (rythme_jours between 2 and 5);

-- Jours ISO (1 lundi a 7 dimanche), 5 au plus ; vide : jours non precises,
-- aucun rappel possible.
alter table profiles drop constraint if exists profiles_jours_travail_valides;
alter table profiles add constraint profiles_jours_travail_valides
  check (jours_travail <@ '{1,2,3,4,5,6,7}'::smallint[] and cardinality(jours_travail) <= 5);

-- --- 2. Les rappels : ecrits par le serveur seul ------------------------------
--
-- Aucune politique d'ecriture : le client lit son etat, la fonction
-- rappel-revision (service_role) decide. Le consentement d'un parent ne doit
-- pas pouvoir s'ecrire depuis le navigateur de l'enfant.

create table if not exists rappels (
  eleve_id       uuid        primary key references profiles (id) on delete cascade,
  destinataire   text        not null,
  pour_parent    boolean     not null,
  heure          time        not null default '17:00',
  -- en_attente : le parent n'a pas encore confirme ; actif ; arrete.
  etat           text        not null default 'en_attente',
  motif_arret    text,
  -- Empreinte SHA-256 du jeton de confirmation envoye au parent.
  jeton_hash     text        unique,
  expire_le      timestamptz,
  pause_jusqu_au date,
  cree_le        timestamptz not null default now(),
  maj_le         timestamptz not null default now()
);

alter table rappels drop constraint if exists rappels_heure_plage;
alter table rappels add constraint rappels_heure_plage
  check (heure between time '07:30' and time '19:00');
alter table rappels drop constraint if exists rappels_etat_valide;
alter table rappels add constraint rappels_etat_valide
  check (etat in ('en_attente', 'actif', 'arrete'));
alter table rappels drop constraint if exists rappels_motif_valide;
alter table rappels add constraint rappels_motif_valide
  check (motif_arret is null or motif_arret in ('eleve', 'desinscription', 'sans_effet', 'refus'));

-- Journal des envois : plafonds (1 par jour, 3 par semaine), arret apres deux
-- rappels sans effet, et lien de desinscription propre a chaque email (seule
-- son empreinte est gardee).
create table if not exists rappels_envois (
  id                  uuid        primary key default gen_random_uuid(),
  eleve_id            uuid        not null references profiles (id) on delete cascade,
  envoye_le           timestamptz not null default now(),
  -- Jour de Paris de l'envoi, pour le plafond d'un par jour.
  jour                date        not null,
  desinscription_hash text        not null unique
);

create index if not exists rappels_envois_eleve_idx on rappels_envois (eleve_id, envoye_le desc);

alter table rappels enable row level security;
alter table rappels_envois enable row level security;

drop policy if exists rappels_select_soi on rappels;
create policy rappels_select_soi on rappels
  for select to authenticated
  using (eleve_id = auth.uid());

drop policy if exists rappels_envois_select_soi on rappels_envois;
create policy rappels_envois_select_soi on rappels_envois
  for select to authenticated
  using (eleve_id = auth.uid());

revoke all on rappels from anon;
revoke all on rappels_envois from anon;
revoke all on rappels from authenticated;
revoke all on rappels_envois from authenticated;
-- Les empreintes de jeton ne se lisent pas, meme par l'eleve : seule la
-- fonction serveur les compare. Un droit de table couvrirait toutes les
-- colonnes ; on accorde donc la lecture colonne par colonne.
grant select (eleve_id, destinataire, pour_parent, heure, etat, motif_arret, expire_le,
              pause_jusqu_au, cree_le, maj_le)
  on rappels to authenticated;
grant select (id, eleve_id, envoye_le, jour) on rappels_envois to authenticated;
