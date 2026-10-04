-- Droits d'execution des fonctions (migration 0007).
--
-- Les tests 01 a 03 tournent apres toutes les migrations : ils prouvent deja
-- que les triggers se declenchent (reservations inserees sous le role
-- authenticated) et que les politiques RLS appellent toujours leurs fonctions.
-- Ce fichier verifie qu'aucune fonction n'est appelable au-dela du necessaire.

-- Seules les fonctions SECURITY DEFINER comptent : elles tournent avec les
-- droits de leur proprietaire et contournent donc le RLS. nom_court_par_defaut
-- reste appelable par anon (droit anterieur a la 0007) : fonction pure de mise
-- en forme d'un texte, executee avec les droits de l'appelant, sans enjeu.
select 'TEST 41 un visiteur anonyme n execute aucune fonction security definer' as test,
       (select string_agg(p.proname, ',') from pg_proc p
         where p.pronamespace = 'public'::regnamespace and p.prosecdef
           and has_function_privilege('anon', p.oid, 'execute')) as executables,
       not exists (select 1 from pg_proc p
                    where p.pronamespace = 'public'::regnamespace and p.prosecdef
                      and has_function_privilege('anon', p.oid, 'execute')) as ok;

select 'TEST 42 un eleve n appelle ni les triggers ni les fonctions internes' as test,
       (select string_agg(p.proname, ',') from pg_proc p
         where p.pronamespace = 'public'::regnamespace
           and p.proname in ('refuse_surbooking', 'creer_profil_pour_nouvel_utilisateur',
                             'proteger_colonnes_profil', 'creer_ligne_teacher_si_prof',
                             'est_prof_de', 'est_parent_de', 'publier_contenu')
           and has_function_privilege('authenticated', p.oid, 'execute')) as executables,
       not exists (select 1 from pg_proc p
                    where p.pronamespace = 'public'::regnamespace
                      and p.proname in ('refuse_surbooking', 'creer_profil_pour_nouvel_utilisateur',
                                        'proteger_colonnes_profil', 'creer_ligne_teacher_si_prof',
                                        'est_prof_de', 'est_parent_de', 'publier_contenu')
                      and has_function_privilege('authenticated', p.oid, 'execute')) as ok;

select 'TEST 43 les fonctions des politiques restent appelables par un eleve' as test,
       has_function_privilege('authenticated', 'peut_lire_eleve(uuid)', 'execute')
       and has_function_privilege('authenticated', 'role_actuel()', 'execute')
       and has_function_privilege('authenticated', 'nb_places_prises(uuid)', 'execute') as ok;

-- Les fonctions d'une extension ne sont pas les notres : pgcrypto les pose
-- dans public sur le Postgres de test, alors que Supabase les range dans le
-- schema extensions. On les reconnait a leur dependance de type 'e'.
select 'TEST 44 aucune fonction sans search_path fige' as test,
       (select string_agg(p.proname, ',') from pg_proc p
         where p.pronamespace = 'public'::regnamespace
           and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
           and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')) as sans_search_path,
       not exists (select 1 from pg_proc p
                    where p.pronamespace = 'public'::regnamespace
                      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
                      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c
                                      where c like 'search_path=%')) as ok;

-- Une fonction creee apres la 0007 ne doit pas redevenir publique.
create function test_fonction_future() returns int language sql as 'select 1';
select 'TEST 45 une nouvelle fonction n est pas appelable par anon' as test,
       not has_function_privilege('anon', 'test_fonction_future()', 'execute') as ok;
drop function test_fonction_future();

select 'TEST FIN' as test, true as ok;
