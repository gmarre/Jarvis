---
name: migration
description: Écrire une migration Supabase MATH EDUCATION (fichier numéroté rejouable que Gauthier colle dans le SQL Editor, tests SQL sous PGlite). À suivre pour tout changement de schéma, de politique RLS, de fonction SQL ou de contrainte, y compris l'ajout d'une lettre de domaine.
---

# Écrire une migration

1. **Jamais par l'outil MCP `apply_migration`** (refusé par Gauthier). Jamais modifier une migration déjà appliquée (état : `pilotage/ETAT.md` §3).
2. Créer le fichier numéroté suivant dans `Math_Edu_Application/supabase/migrations/` (`00NN_nom_court.sql`), avec en tête un commentaire qui dit **pourquoi**.
3. **Rejouable** : `create table if not exists`, `create or replace function`, `drop policy if exists` avant `create policy`, `add column if not exists`. Un collage en double ne doit rien casser : c'est arrivé (0021 rejouée après 0023).
4. Règles de sécurité :
   - une règle valable pour tous est `security definer`, avec `set search_path` ;
   - aucune fonction d'autorisation appelable par `anon` ;
   - une politique de lecture qui relit sa propre table casse un upsert ... RETURNING (0024) ;
   - colonnes protégées du client par trigger (`.claude/rules/app.md`).
5. **Tests** dans `supabase/tests/` (numéros TEST suivants), toujours sous `set role authenticated` avec un JWT ; puis `npm run test:sql`, `npm test`, `npm run lint`, `npm run build`.
6. Commit, puis demander à Gauthier de **coller le fichier seul** dans le SQL Editor (projet `crazwnfjyzaxirbmwnkn`).
7. Après le collage, **vérifier en ligne** par `execute_sql` en lecture (par exemple `select pg_get_functiondef('nom'::regproc)`), puis mettre à jour `pilotage/ETAT.md` §3 et `CLAUDE.md` §2.
8. Si une Edge Function dépend du changement : skill `deployer-fonction`.

**Nouvelle lettre de domaine :** élargir les contraintes `A-P` des tables de contenu et de progression, et mettre à jour `ID_EXERCICE` dans `corriger/index.ts`.
