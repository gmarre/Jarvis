-- Contenu pedagogique : publication reservee au serveur, lecture pour les
-- comptes connectes, separation de ce qui trahit la reponse.
--
-- Chaque assertion rend une ligne commencant par TEST et finissant par la
-- colonne ok : run.sh echoue si l'une vaut f. Toute assertion de droits tourne
-- sous un role non proprietaire (sinon le RLS est contourne et rien n'est
-- prouve, cf. migrations 0003 et 0004).

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on content_skills, content_exercises,
  content_exercise_keys, content_mindmaps, content_publications to authenticated, service_role;
grant usage, select on sequence content_publications_id_seq to service_role;

-- Un contenu minimal : deux competences, un QCM et un numerique, une carte.
\set contenu '{"skills": [{"id": "A001", "domain": "A", "domain_name": "Numeration", "label": "Compter", "description": "d", "prerequisites": [], "difficulty": 1, "school_level": "CP", "validation_test": "t", "mastery_threshold": {"required": 2, "out_of": 3}, "exercise_ids": ["EX-A001-D-01", "EX-A001-D-02"], "mindmap_id": "MM-A-01", "programme_ref": []}, {"id": "A002", "domain": "A", "domain_name": "Numeration", "label": "Lire", "description": "d", "prerequisites": ["A001"], "difficulty": 1, "school_level": "CP", "validation_test": "t", "mastery_threshold": {"required": 2, "out_of": 3}, "exercise_ids": [], "mindmap_id": null, "programme_ref": []}], "exercises": [{"id": "EX-A001-D-01", "skill_id": "A001", "level": "decouverte", "type": "qcm", "statement": "Combien ?", "image": null, "choices": [{"key": "a", "text": "3", "misconception": "compte deux fois"}, {"key": "b", "text": "4", "misconception": null}], "answer": {"value": "b"}, "solution_steps": ["On compte : 4."], "hint": "Touche chaque objet.", "estimated_duration_s": 30, "review_status": "relu_agent", "programme_ref": "CP"}, {"id": "EX-A001-D-02", "skill_id": "A001", "level": "decouverte", "type": "numerique", "statement": "Combien de billes ?", "image": null, "answer": {"value": 7, "unit": "billes"}, "solution_steps": ["7."], "review_status": "relu_agent"}], "mindmaps": [{"id": "MM-A-01", "title": "Compter", "domain": "A", "skill_ids": ["A001"], "school_levels": ["CP"], "markdown": "# Compter", "review_status": "brouillon", "programme_ref": null}]}'

-- --- Un eleve ne peut pas publier ---------------------------------------------

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set request.jwt.claim.role = 'authenticated';
\set ON_ERROR_STOP off
select publier_contenu(:'contenu'::jsonb, 'eleve');
\set ON_ERROR_STOP on
reset role;
select 'TEST 31 un eleve ne peut pas publier' as test,
       count(*) as lignes, (count(*) = 0) as ok
from content_skills;

-- --- Le serveur publie, en une fois ------------------------------------------

set role service_role;
set request.jwt.claim.role = 'service_role';
select publier_contenu(:'contenu'::jsonb, 'abc123');
reset role;

select 'TEST 32 la publication ecrit tout le contenu' as test,
       (select count(*) from content_skills) || '/' || (select count(*) from content_exercises)
         || '/' || (select count(*) from content_mindmaps) as comptes,
       ((select count(*) from content_skills) = 2
        and (select count(*) from content_exercises) = 2
        and (select count(*) from content_exercise_keys) = 2
        and (select count(*) from content_mindmaps) = 1) as ok;

select 'TEST 33 les propositions publiques n ont plus de misconception' as test,
       choices::text as propositions,
       (choices::text not like '%misconception%') as ok
from content_exercises where id = 'EX-A001-D-01';

select 'TEST 34 les misconceptions sont dans la table des cles' as test,
       misconceptions::text as m,
       (misconceptions->>'a' = 'compte deux fois' and misconceptions ? 'b') as ok
from content_exercise_keys where exercise_id = 'EX-A001-D-01';

select 'TEST 35 l unite reste lisible avec l enonce' as test,
       answer_unit, (answer_unit = 'billes') as ok
from content_exercises where id = 'EX-A001-D-02';

select 'TEST 36 la publication est historisee avec son commit' as test,
       source_commit, (source_commit = 'abc123' and nb_exercises = 2) as ok
from content_publications order by id desc limit 1;

-- --- Republier remplace, sans doublon ----------------------------------------

set role service_role;
select publier_contenu(:'contenu'::jsonb, 'def456');
reset role;
select 'TEST 37 republier remplace sans dupliquer' as test,
       (select count(*) from content_exercises) as exos,
       ((select count(*) from content_exercises) = 2
        and (select count(*) from content_publications) = 2) as ok;

-- --- Lecture par un eleve, ecriture refusee ----------------------------------

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set request.jwt.claim.role = 'authenticated';

select 'TEST 38 un eleve connecte lit les competences et les exercices' as test,
       (select count(*) from content_skills) as competences,
       ((select count(*) from content_skills) = 2 and (select count(*) from content_exercises) = 2) as ok;

\set ON_ERROR_STOP off
update content_exercises set statement = 'pirate' where id = 'EX-A001-D-02';
insert into content_skills (id, domain, domain_name, label, description, difficulty, school_level,
  validation_test, mastery_threshold) values ('A099', 'A', 'x', 'x', 'x', 1, 'CP', 'x', '{}');
\set ON_ERROR_STOP on
reset role;
select 'TEST 39 un eleve ne modifie pas le contenu' as test,
       (select statement from content_exercises where id = 'EX-A001-D-02') as enonce,
       ((select statement from content_exercises where id = 'EX-A001-D-02') = 'Combien de billes ?'
        and not exists (select 1 from content_skills where id = 'A099')) as ok;

select 'TEST FIN' as test, true as ok;
