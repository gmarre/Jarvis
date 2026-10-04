-- =============================================================================
-- 0007 : droits d'execution des fonctions (advisor de securite Supabase)
--
-- Constat du 4 octobre 2026 : les fonctions des migrations 0001 a 0004 etaient
-- appelables par n'importe qui via /rest/v1/rpc/<nom>, visiteur anonyme
-- compris, parce que Postgres donne EXECUTE a PUBLIC par defaut. Aucune ne
-- divulgue grand-chose, mais rien ne justifie qu'elles soient exposees.
--
-- Trois cas, selon ce dont chaque fonction a besoin pour marcher :
--
--  1. Fonctions de trigger : personne n'a a les appeler. Un trigger se
--     declenche sans que l'utilisateur ait EXECUTE sur sa fonction (le droit
--     n'est verifie qu'a la creation du trigger) : on retire tout.
--  2. Fonctions appelees seulement par une autre fonction SECURITY DEFINER
--     (est_prof_de, est_parent_de, appelees par peut_lire_eleve, qui tourne
--     avec les droits de son proprietaire) : on retire tout.
--  3. Fonctions evaluees avec les droits de l'utilisateur connecte : dans les
--     politiques RLS (peut_lire_eleve, role_actuel) ou dans la vue
--     slots_disponibles, qui est security_invoker (nb_places_prises). Le role
--     authenticated en a besoin ; on ne le retire qu'a anon et PUBLIC. Toutes
--     ces politiques sont reservees a authenticated : anon ne les evalue jamais.
--
-- L'advisor continuera de signaler les trois fonctions du cas 3 pour
-- authenticated : c'est voulu (CLAUDE.md §13). Elles ne rendent que ce que la
-- personne connectee peut deja savoir.
--
-- Rejouable : revoke et grant sont idempotents, et `create or replace` des
-- migrations precedentes conserve les droits poses ici.
-- =============================================================================

-- --- 1. Fonctions de trigger -------------------------------------------------

revoke execute on function refuse_surbooking() from public, anon, authenticated;
revoke execute on function creer_profil_pour_nouvel_utilisateur() from public, anon, authenticated;
revoke execute on function proteger_colonnes_profil() from public, anon, authenticated;
revoke execute on function creer_ligne_teacher_si_prof() from public, anon, authenticated;

-- --- 2. Fonctions internes ---------------------------------------------------

revoke execute on function est_prof_de(uuid) from public, anon, authenticated;
revoke execute on function est_parent_de(uuid) from public, anon, authenticated;

-- --- 3. Fonctions evaluees par l'utilisateur connecte ------------------------

revoke execute on function peut_lire_eleve(uuid) from public, anon;
revoke execute on function role_actuel() from public, anon;
revoke execute on function nb_places_prises(uuid) from public, anon;

grant execute on function peut_lire_eleve(uuid) to authenticated;
grant execute on function role_actuel() to authenticated;
grant execute on function nb_places_prises(uuid) to authenticated;

-- --- search_path fige -------------------------------------------------------
-- Sans search_path fixe, une fonction resout ses noms selon celui de
-- l'appelant, qui pourrait y glisser un objet homonyme. Celle-ci n'utilise que
-- des fonctions integrees (trim, upper, left, coalesce), toujours trouvees dans
-- pg_catalog : un search_path vide suffit.

alter function nom_court_par_defaut(text, text) set search_path = '';

-- --- Fonctions a venir ------------------------------------------------------
-- Sans cela, toute nouvelle fonction redeviendrait executable par anon, par
-- deux chemins : le droit par defaut de PUBLIC (regle globale de Postgres) et
-- celui que Supabase donne explicitement a anon dans public. On retire les
-- deux pour les fonctions creees par postgres, le role des migrations.
-- authenticated et service_role gardent le leur (privileges par defaut de
-- Supabase, constates en base le 4 octobre 2026).
--
-- La regle PUBLIC est globale (sans `in schema`) : une regle propre a un
-- schema ne peut qu'ajouter des droits, jamais retirer un droit global.

alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

alter default privileges for role postgres
  revoke execute on functions from public;
