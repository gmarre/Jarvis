-- =============================================================================
-- 0006 : les reponses des exercices ne sont plus lisibles par les eleves
--
-- Phase 3 de la migration du contenu. La correction se fait desormais cote
-- serveur, dans l'Edge Function `corriger` (supabase/functions/corriger), qui
-- lit content_exercise_keys avec la cle service_role. L'application n'a plus
-- besoin de cette table : on retire la lecture transitoire ouverte par la 0005.
--
-- ORDRE D'APPLICATION : deployer la fonction `corriger` AVANT cette migration.
-- Sinon les exercices ne se corrigent plus du tout.
--
-- Effet : RLS active et plus aucune politique sur la table, donc zero ligne
-- pour anon et authenticated. Le retrait des droits est une seconde barriere,
-- au cas ou une politique serait un jour ajoutee par erreur. service_role
-- (Edge Function, publier.py) contourne le RLS et garde ses droits.
--
-- Rejouable : drop policy if exists, revoke idempotent.
-- =============================================================================

drop policy if exists content_exercise_keys_lecture_transitoire on content_exercise_keys;

revoke all on content_exercise_keys from anon, authenticated;
