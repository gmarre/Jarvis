-- =============================================================================
-- 0008 : la recette du contenu (verdicts accepte / invalide)
--
-- Pourquoi. Le contenu produit par les agents est en `relu_agent`. La recette
-- consiste a le parcourir dans l'application, comme un eleve, et a rendre un
-- verdict par exercice et par carte mentale. Les verdicts arrivent ici, puis
-- scripts/recette.py les reporte dans les JSON (Git reste la source) :
-- accepte -> `valide`, invalide -> `brouillon` avec le commentaire, dans une
-- liste de reprise pour les agents.
--
-- Qui peut rendre un verdict : les comptes inscrits dans content_reviewers,
-- a la main depuis le SQL Editor (voir CLAUDE.md §10). Aucun client ne peut
-- s'y ajouter lui-meme.
--
-- Pas de cle etrangere vers content_exercises ni content_mindmaps : chaque
-- publication les vide et les remplit de nouveau, ce qui effacerait les
-- verdicts en cascade. Le script signale un verdict sur un contenu disparu.
--
-- Rejouable : create ... if not exists, drop policy if exists.
-- =============================================================================

create table if not exists content_reviewers (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  ajoute_le timestamptz not null default now()
);

create table if not exists content_reviews (
  id             bigserial primary key,
  item_type      text not null check (item_type in ('exercise', 'mindmap')),
  item_id        text not null check (item_id ~ '^(EX-[A-O][0-9]{3}-[DEM]-[0-9]{2}|MM-[A-O]-[0-9]{2})$'),
  verdict        text not null check (verdict in ('accepte', 'invalide')),
  commentaire    text not null default '',
  reviewer_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Publication sur laquelle le verdict a ete rendu : le contenu a pu changer depuis.
  publication_id bigint references content_publications(id) on delete set null,
  mis_a_jour_le  timestamptz not null default now(),
  -- Pose par scripts/recette.py une fois le verdict reporte dans les JSON. Un
  -- nouveau verdict du relecteur le remet a null : il sera reporte a son tour.
  traite_le      timestamptz,
  unique (reviewer_id, item_type, item_id),
  -- Un refus sans explication ne sert a rien a celui qui doit corriger.
  constraint invalide_avec_commentaire check (verdict = 'accepte' or length(trim(commentaire)) > 0),
  constraint commentaire_raisonnable check (length(commentaire) <= 2000)
);

alter table content_reviewers enable row level security;
alter table content_reviews   enable row level security;

-- Un compte sait s'il est relecteur, sans voir la liste des autres.
drop policy if exists content_reviewers_soi on content_reviewers;
create policy content_reviewers_soi on content_reviewers
  for select to authenticated using (user_id = auth.uid());

-- Un relecteur lit et ecrit ses propres verdicts, et rien d'autre. La
-- sous-requete passe par le RLS de content_reviewers : elle ne voit que la
-- ligne du lecteur, ce qui suffit.
drop policy if exists content_reviews_relecteur on content_reviews;
create policy content_reviews_relecteur on content_reviews
  for all to authenticated
  using (
    reviewer_id = auth.uid()
    and exists (select 1 from content_reviewers r where r.user_id = auth.uid())
  )
  with check (
    reviewer_id = auth.uid()
    and exists (select 1 from content_reviewers r where r.user_id = auth.uid())
  );

revoke all on content_reviewers, content_reviews from anon;
-- La liste des relecteurs ne s'ecrit pas depuis le client.
revoke insert, update, delete on content_reviewers from authenticated;
