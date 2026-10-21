-- Progression cote serveur (migration 0021) : le navigateur n'ecrit plus ses
-- tentatives ni son positionnement ; enregistrer_positionnement n'accepte que
-- les competences reussies pendant le test et leurs prerequis.
--
-- Comptes crees ici : eleve a101, prof a102. Contenu : A001 <- B001 <- B002,
-- et C001 a part.

grant usage on schema public to authenticated, service_role;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1000000-0000-0000-0000-000000000001', 'eleve.pos@test.fr', '{"role":"eleve","prenom":"Ema"}'),
  ('a1000000-0000-0000-0000-000000000002', 'prof.pos@test.fr', '{"role":"prof","prenom":"Marc"}');

\set contenu '{"skills": [{"id": "A001", "domain": "A", "domain_name": "Numeration", "label": "Compter", "description": "d", "prerequisites": [], "difficulty": 1, "school_level": "CP", "validation_test": "t", "mastery_threshold": {"required": 2, "out_of": 3}, "exercise_ids": [], "mindmap_id": null, "programme_ref": []}, {"id": "B001", "domain": "B", "domain_name": "Calcul", "label": "Ajouter", "description": "d", "prerequisites": ["A001"], "difficulty": 1, "school_level": "CP", "validation_test": "t", "mastery_threshold": {"required": 2, "out_of": 3}, "exercise_ids": [], "mindmap_id": null, "programme_ref": []}, {"id": "B002", "domain": "B", "domain_name": "Calcul", "label": "Retirer", "description": "d", "prerequisites": ["B001"], "difficulty": 2, "school_level": "CP", "validation_test": "t", "mastery_threshold": {"required": 3, "out_of": 4}, "exercise_ids": [], "mindmap_id": null, "programme_ref": []}, {"id": "C001", "domain": "C", "domain_name": "Fractions", "label": "Partager", "description": "d", "prerequisites": [], "difficulty": 1, "school_level": "CE1", "validation_test": "t", "mastery_threshold": {"required": 2, "out_of": 3}, "exercise_ids": [], "mindmap_id": null, "programme_ref": []}], "exercises": [], "mindmaps": []}'

set role service_role;
set request.jwt.claim.role = 'service_role';
select publier_contenu(:'contenu'::jsonb, 'progression01');
reset role;
set request.jwt.claim.role = 'authenticated';

-- --- Le navigateur n'ecrit plus ses traces -----------------------------------------

set role authenticated;
set request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';

\echo '--- L eleve ecrit lui-meme une reponse du test : refuse ---'
\set ON_ERROR_STOP off
insert into placement_reponses (user_id, exercise_id, skill_id, juste)
values ('a1000000-0000-0000-0000-000000000001', 'EX-C001-E-01', 'C001', true);
\set ON_ERROR_STOP on

\echo '--- L eleve ecrit lui-meme une tentative : refuse ---'
\set ON_ERROR_STOP off
insert into exercise_attempts (user_id, exercise_id, skill_id, is_correct)
values ('a1000000-0000-0000-0000-000000000001', 'EX-C001-E-01', 'C001', true);
\set ON_ERROR_STOP on

\echo '--- L eleve ecrit lui-meme un resultat de positionnement : refuse ---'
\set ON_ERROR_STOP off
insert into placement_results (user_id, questions_posees, competences_maitrisees, competences_totales,
                               objectif_skill_id, estimation_semaines)
values ('a1000000-0000-0000-0000-000000000001', 1, 4, 4, 'C001', 0);
\set ON_ERROR_STOP on

reset role;
select 'TEST 190 rien n est ecrit par le navigateur' as test,
       (not exists (select 1 from placement_reponses where user_id = 'a1000000-0000-0000-0000-000000000001')
        and not exists (select 1 from exercise_attempts where user_id = 'a1000000-0000-0000-0000-000000000001')
        and not exists (select 1 from placement_results where user_id = 'a1000000-0000-0000-0000-000000000001')) as ok;

-- --- Positionnement --------------------------------------------------------------

-- La fonction `corriger` (cle service_role, ici le proprietaire) garde les
-- reponses du test : B002 reussie, C001 ratee.
insert into placement_reponses (user_id, exercise_id, skill_id, juste) values
  ('a1000000-0000-0000-0000-000000000001', 'EX-B002-E-01', 'B002', true),
  ('a1000000-0000-0000-0000-000000000001', 'EX-C001-E-01', 'C001', false);
-- A001 deja completement acquise par le travail.
insert into skill_progress (user_id, skill_id, status, niveau)
values ('a1000000-0000-0000-0000-000000000001', 'A001', 'mastered', 5);

set role authenticated;
set request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';

\echo '--- L eleve se declare acquise C001, ratee pendant le test : refuse ---'
\set ON_ERROR_STOP off
select enregistrer_positionnement(array['A001','B001','B002','C001'], 2, array['C001'], 'C001', 3);
\set ON_ERROR_STOP on

reset role;
select 'TEST 191 un positionnement non prouve n ecrit rien' as test,
       (not exists (select 1 from placement_results where user_id = 'a1000000-0000-0000-0000-000000000001')
        and not exists (select 1 from skill_progress
                        where user_id = 'a1000000-0000-0000-0000-000000000001' and skill_id <> 'A001')) as ok;

set role authenticated;
set request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';
select 'TEST 192 B002 reussie et ses prerequis : deux lignes ecrites, A001 deja acquise intacte' as test,
       (enregistrer_positionnement(array['A001','B001','B002'], 2, array['C001'], 'C001', 3) = 2) as ok;

reset role;
select 'TEST 193 B001 et B002 validees par le test, au niveau 4, controle a J+14' as test,
       ((select count(*) from skill_progress
         where user_id = 'a1000000-0000-0000-0000-000000000001' and skill_id in ('B001','B002')
           and niveau = 4 and valide_par_test and status = 'mastered'
           and prochain_controle > now() + interval '13 days') = 2
        and (select score from skill_progress
             where user_id = 'a1000000-0000-0000-0000-000000000001' and skill_id = 'B002') = 3) as ok;
select 'TEST 194 A001 reste au niveau 5' as test, (niveau = 5 and not valide_par_test) as ok
from skill_progress where user_id = 'a1000000-0000-0000-0000-000000000001' and skill_id = 'A001';
select 'TEST 195 le resultat compte les competences du serveur' as test,
       (competences_maitrisees = 3 and competences_totales = 4 and objectif_skill_id = 'C001') as ok
from placement_results where user_id = 'a1000000-0000-0000-0000-000000000001';

set role authenticated;
set request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';
\echo '--- Un second positionnement sans nouvelle reponse : refuse ---'
\set ON_ERROR_STOP off
select enregistrer_positionnement(array['B002'], 1, array[]::text[], 'C001', 3);
\set ON_ERROR_STOP on

\echo '--- Un professeur : refuse ---'
set request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000002';
\set ON_ERROR_STOP off
select enregistrer_positionnement(array[]::text[], 0, array[]::text[], 'C001', 0);
\set ON_ERROR_STOP on

reset role;
select 'TEST 196 un seul positionnement, aucun pour le professeur' as test,
       ((select count(*) from placement_results where user_id = 'a1000000-0000-0000-0000-000000000001') = 1
        and not exists (select 1 from placement_results where user_id = 'a1000000-0000-0000-0000-000000000002')) as ok;

-- --- Reponse juste apres avoir lu la correction (migration 0023) -----------------

-- E-02 : faux une heure avant (correction lue), puis juste. E-03 : deja fait
-- en exercice, puis juste au test. Ni l'un ni l'autre ne prouve C001.
insert into placement_reponses (user_id, exercise_id, skill_id, juste, created_at) values
  ('a1000000-0000-0000-0000-000000000001', 'EX-C001-E-02', 'C001', false, now() - interval '1 hour'),
  ('a1000000-0000-0000-0000-000000000001', 'EX-C001-E-02', 'C001', true, now()),
  ('a1000000-0000-0000-0000-000000000001', 'EX-C001-E-03', 'C001', true, now());
insert into exercise_attempts (user_id, exercise_id, skill_id, is_correct, created_at)
values ('a1000000-0000-0000-0000-000000000001', 'EX-C001-E-03', 'C001', false, now() - interval '2 hours');

set role authenticated;
set request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';
\echo '--- C001 juste seulement apres la correction : refuse ---'
\set ON_ERROR_STOP off
select enregistrer_positionnement(array['C001'], 2, array[]::text[], 'C001', 1);
\set ON_ERROR_STOP on
reset role;
select 'TEST 197 une reponse juste apres la correction ne prouve rien' as test,
       not exists (select 1 from skill_progress
                   where user_id = 'a1000000-0000-0000-0000-000000000001' and skill_id = 'C001') as ok;

-- E-04 : juste du premier coup.
insert into placement_reponses (user_id, exercise_id, skill_id, juste)
values ('a1000000-0000-0000-0000-000000000001', 'EX-C001-E-04', 'C001', true);
set role authenticated;
set request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';
select 'TEST 198 juste du premier coup : C001 validee' as test,
       (enregistrer_positionnement(array['C001'], 3, array[]::text[], 'C001', 1) = 1) as ok;
reset role;

select 'TEST FIN 15 le fichier est alle jusqu au bout' as test, true as ok;
