-- =============================================================================
-- 0012 : chemins choisis par l'eleve (sprint 2, point 6)
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable.
--
-- /parcours propose un chemin par domaine (lib/chemins.ts), calcule depuis le
-- DAG. L'eleve en choisit un ou plusieurs ; le plan du jour prend alors sa
-- priorite parmi eux. On ne stocke que la lettre du domaine de chaque chemin :
-- le contenu du chemin, lui, est recalcule a chaque affichage.
--
-- Colonne libre pour l'eleve (comme ses preferences) : elle ne donne aucun
-- droit, le trigger de protection n'a donc pas a la surveiller.
-- =============================================================================

alter table profiles add column if not exists chemins_choisis text[] not null default '{}';

comment on column profiles.chemins_choisis is
  'Chemins de /parcours choisis par l''eleve : lettres de domaine (A, C, G...). Vide : la priorite vient de l''objectif du test de positionnement.';

-- Une lettre de domaine, rien d'autre : pas de texte libre dans le profil.
do $$ begin
  alter table profiles add constraint profiles_chemins_choisis_format
    check (chemins_choisis <@ array['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P']::text[]);
exception when duplicate_object then null; end $$;
