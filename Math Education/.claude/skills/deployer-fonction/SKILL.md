---
name: deployer-fonction
description: Redéployer une Edge Function Supabase de MATH EDUCATION (corriger, rendre-super, et les autres) par l'outil MCP, avec le contrôle 401. À suivre après toute modification de supabase/functions, en particulier de _shared/correction.ts ou _shared/maitrise.ts.
---

# Déployer une Edge Function

Projet Supabase : `crazwnfjyzaxirbmwnkn`. Outil MCP `deploy_edge_function` (accepté par Gauthier).

| Fonction | Point d'entrée | Fichiers | `verify_jwt` |
|---|---|---|---|
| `corriger` | `corriger/index.ts` | `corriger/index.ts`, `_shared/correction.ts`, `_shared/maitrise.ts`, `_shared/progression.ts` | true |
| `rendre-super` | `rendre-super/index.ts` | `rendre-super/index.ts`, mêmes fichiers partagés | true |
| `accord-parental`, `rapport-hebdo`, `rappel-revision` | `<nom>/index.ts` | le dossier de la fonction et ses `_shared` | false (pas de compte, secret ou jeton haché) |
| `supprimer-compte` | `supprimer-compte/index.ts` | idem | true |

**Règles :**
- Toute modification de `_shared/correction.ts` ou `_shared/maitrise.ts` se redéploie dans **`corriger` et `rendre-super`**, sinon le serveur et l'app divergent.
- **Piège :** dans les paramètres d'outil, une séquence `\uXXXX` devient un caractère littéral. Envoyer les caractères spéciaux tels quels, ou par code.
- Avant : `npm test` vert (la correction est testée côté app avec le même fichier).

**Contrôle :** un appel avec la clé anonyme doit répondre **401 « Connexion requise »** (fonctions à JWT). Puis noter la nouvelle version dans `pilotage/ETAT.md` §3 (et `CLAUDE.md` §2 pour `corriger` et `rendre-super`), et ajouter les saisies à vérifier en ligne dans `pilotage/TESTS_MANUELS.md`.
