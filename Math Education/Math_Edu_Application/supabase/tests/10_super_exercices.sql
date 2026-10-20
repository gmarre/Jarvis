-- Super exercices (migration 0016) : publication separee en partie lisible et
-- cles, cles invisibles des eleves, passages en ecriture seule.
--
-- Depend de 01 pour les comptes (Lea 2222, Tom 3333).

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to service_role;

\set contenu '{"skills": [{"id": "A001", "domain": "A", "domain_name": "Numeration", "label": "Compter", "description": "d", "prerequisites": [], "difficulty": 1, "school_level": "CP", "validation_test": "t", "mastery_threshold": {"required": 2, "out_of": 3}, "exercise_ids": [], "mindmap_id": null, "programme_ref": []}], "exercises": [], "mindmaps": [], "super": [{"id": "SX-A001-01", "skill_id": "A001", "skill_ids": ["A001", "B001"], "school_level": "CP", "title": "La fete", "contexte": "Il y a 3 ballons rouges et 2 bleus.", "image": null, "duree_estimee_min": 10, "questions": [{"key": "q1", "skill_id": "A001", "statement": "Combien de ballons ?", "type": "numerique", "answer": {"value": 5, "unit": "ballons"}, "points": 2, "solution_steps": ["3 + 2 = 5."]}, {"key": "q2", "skill_id": "A001", "statement": "Lequel ?", "type": "qcm", "choices": [{"key": "a", "text": "rouge", "misconception": null}, {"key": "b", "text": "bleu", "misconception": "compte mal"}], "answer": {"value": "a"}, "points": 1, "solution_steps": ["Rouge."]}], "review_status": "relu_agent", "programme_ref": null}]}'

set role service_role;
set request.jwt.claim.role = 'service_role';
select publier_contenu(:'contenu'::jsonb, 'super01');
reset role;

select 'TEST 100 la publication ecrit le super exercice et ses cles' as test,
       ((select count(*) from content_super) = 1
        and (select count(*) from content_super_keys) = 1
        and (select nb_super from content_publications order by id desc limit 1) = 1) as ok;

select 'TEST 101 la partie lisible ne contient ni reponse, ni corrige, ni misconception' as test,
       (questions::text not like '%"answer"%' and questions::text not like '%solution_steps%'
        and questions::text not like '%misconception%' and questions::text not like '%compte mal%'
        and questions->0->>'answer_unit' = 'ballons'
        and jsonb_array_length(questions->1->'choices') = 2) as ok
from content_super where id = 'SX-A001-01';

select 'TEST 102 les cles gardent reponses, corriges et misconceptions, dans l ordre' as test,
       (questions->0->>'key' = 'q1' and (questions->0->'answer'->>'value')::int = 5
        and questions->1->'misconceptions'->>'b' = 'compte mal') as ok
from content_super_keys where super_id = 'SX-A001-01';

-- --- Ce que voit un eleve ----------------------------------------------------

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select 'TEST 103 un eleve lit le super exercice' as test,
       ((select count(*) from content_super) = 1) as ok;
select 'TEST 104 un eleve ne lit aucune cle' as test,
       ((select count(*) from content_super_keys) = 0) as ok;

insert into super_attempts (user_id, super_id, skill_id, score, total, reussi, reponses, duree_s)
values ('22222222-2222-2222-2222-222222222222', 'SX-A001-01', 'A001', 3, 3, true,
        '{"q1": {"reponse": "5", "juste": true}}', 600);

\echo '--- Un passage au nom d un autre eleve : refuse ---'
\set ON_ERROR_STOP off
insert into super_attempts (user_id, super_id, skill_id, score, total, reussi)
values ('33333333-3333-3333-3333-333333333333', 'SX-A001-01', 'A001', 3, 3, true);
\set ON_ERROR_STOP on

\echo '--- Un score au-dessus du total : refuse ---'
\set ON_ERROR_STOP off
insert into super_attempts (user_id, super_id, skill_id, score, total, reussi)
values ('22222222-2222-2222-2222-222222222222', 'SX-A001-01', 'A001', 9, 3, true);
\set ON_ERROR_STOP on

\echo '--- Modifier un passage : sans effet (aucune politique de mise a jour) ---'
update super_attempts set score = 0 where user_id = '22222222-2222-2222-2222-222222222222';

reset role;
select 'TEST 105 l eleve enregistre son passage, une seule fois et sans le modifier' as test,
       ((select count(*) from super_attempts where user_id = '22222222-2222-2222-2222-222222222222') = 1
        and (select score from super_attempts where user_id = '22222222-2222-2222-2222-222222222222') = 3) as ok;
select 'TEST 106 aucun passage ecrit au nom d un autre eleve' as test,
       ((select count(*) from super_attempts where user_id = '33333333-3333-3333-3333-333333333333') = 0) as ok;

set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select 'TEST 107 un eleve ne lit pas les passages d un autre' as test,
       ((select count(*) from super_attempts) = 0) as ok;
reset role;

select 'TEST FIN 10 le fichier est alle jusqu au bout' as test, true as ok;
