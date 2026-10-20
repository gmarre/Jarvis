-- Cartes defi (migration 0014) : publication avec le contenu, lecture par un
-- eleve, revision espacee ecrite par l'eleve seul.
--
-- Depend de 01 pour les comptes (Lea 2222, Tom 3333).

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to service_role;

\set contenu '{"skills": [{"id": "A001", "domain": "A", "domain_name": "Numeration", "label": "Compter", "description": "d", "prerequisites": [], "difficulty": 1, "school_level": "CP", "validation_test": "t", "mastery_threshold": {"required": 2, "out_of": 3}, "exercise_ids": [], "mindmap_id": null, "programme_ref": []}], "exercises": [], "mindmaps": [], "flashcards": [{"id": "FC-A001-01", "skill_id": "A001", "recto": "Combien font 2 et 3 ?", "verso": "5", "review_status": "relu_agent"}, {"id": "FC-A001-02", "skill_id": "A001", "recto": "Le nombre apres 9 ?", "verso": "10", "review_status": "relu_agent"}]}'

set role service_role;
set request.jwt.claim.role = 'service_role';
select publier_contenu(:'contenu'::jsonb, 'defi01');
reset role;

select 'TEST 90 la publication ecrit les cartes defi et les compte' as test,
       (select count(*) from content_flashcards) as cartes,
       ((select count(*) from content_flashcards) = 2
        and (select nb_flashcards from content_publications order by id desc limit 1) = 2) as ok;

-- Un contenu sans cle "flashcards" reste publiable : les cartes sont retirees.
\set sans_defi '{"skills": [{"id": "A001", "domain": "A", "domain_name": "Numeration", "label": "Compter", "description": "d", "prerequisites": [], "difficulty": 1, "school_level": "CP", "validation_test": "t", "mastery_threshold": {"required": 2, "out_of": 3}, "exercise_ids": [], "mindmap_id": null, "programme_ref": []}], "exercises": [], "mindmaps": []}'
set role service_role;
select publier_contenu(:'sans_defi'::jsonb, 'defi02');
select publier_contenu(:'contenu'::jsonb, 'defi03');
reset role;
select 'TEST 91 un contenu sans carte defi se publie, et republier ne duplique pas' as test,
       ((select count(*) from content_flashcards) = 2) as ok;

-- --- Lecture et progression par l'eleve -----------------------------------

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select 'TEST 92 un eleve connecte lit les cartes defi' as test,
       ((select count(*) from content_flashcards) = 2) as ok;

insert into flashcard_progress (user_id, card_id, skill_id, box, next_review_at, reviews, last_knew)
values ('22222222-2222-2222-2222-222222222222', 'FC-A001-01', 'A001', 2, now() + interval '3 days', 1, true)
on conflict (user_id, card_id) do update set box = excluded.box;

select 'TEST 93 l eleve enregistre la revision d une carte' as test,
       (box = 2 and last_knew) as ok
from flashcard_progress where user_id = '22222222-2222-2222-2222-222222222222' and card_id = 'FC-A001-01';

\echo '--- Ecrire la progression d un autre eleve : refuse ---'
\set ON_ERROR_STOP off
insert into flashcard_progress (user_id, card_id, skill_id, box, next_review_at)
values ('33333333-3333-3333-3333-333333333333', 'FC-A001-01', 'A001', 5, now());
\set ON_ERROR_STOP on

\echo '--- Une boite hors de 1 a 5 : refusee ---'
\set ON_ERROR_STOP off
update flashcard_progress set box = 9
where user_id = '22222222-2222-2222-2222-222222222222' and card_id = 'FC-A001-01';
\set ON_ERROR_STOP on

\echo '--- Ecrire une carte publiee depuis le client : refuse ---'
\set ON_ERROR_STOP off
insert into content_flashcards (id, skill_id, recto, verso, review_status)
values ('FC-A001-09', 'A001', 'x', 'y', 'valide');
\set ON_ERROR_STOP on

reset role;
select 'TEST 94 aucune progression ecrite pour un autre eleve' as test,
       ((select count(*) from flashcard_progress where user_id = '33333333-3333-3333-3333-333333333333') = 0) as ok;
select 'TEST 95 la boite reste bornee a 5' as test, (box = 2) as ok
from flashcard_progress where user_id = '22222222-2222-2222-2222-222222222222' and card_id = 'FC-A001-01';
select 'TEST 96 le client n ecrit pas les cartes publiees' as test,
       ((select count(*) from content_flashcards) = 2) as ok;

-- Un autre eleve ne lit pas la progression de Lea.
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select 'TEST 97 un eleve ne lit pas la revision d un autre' as test,
       ((select count(*) from flashcard_progress) = 0) as ok;
reset role;

select 'TEST FIN 09 le fichier est alle jusqu au bout' as test, true as ok;
