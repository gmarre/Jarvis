-- =============================================================================
-- 0015 : rappels de revision desactives par defaut (sprint 2, point 8)
--
-- A appliquer dans Supabase : SQL Editor -> New query -> coller -> Run.
-- Rejouable.
--
-- La colonne profiles.rappels_revision valait true par defaut (migration
-- 0001) alors qu'aucun rappel n'est envoye. L'etude sur l'engagement
-- (Management de Projet/Etude_engagement.md) rappelle qu'un mineur a droit a
-- des reglages protecteurs par defaut (code de conception adapte a l'age,
-- standard 7 ; CNIL, recommandation 8) : les rappels seront proposes, jamais
-- actives d'office. Comme rien n'est jamais parti, remettre toutes les lignes a
-- false ne retire aucun choix reel. L'interrupteur est masque dans /profil
-- tant que l'envoi n'existe pas.
-- =============================================================================

alter table profiles alter column rappels_revision set default false;

update profiles set rappels_revision = false where rappels_revision;
