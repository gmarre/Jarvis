-- Recette du contenu (migration 0008) : seuls les relecteurs inscrits rendent
-- des verdicts, chacun ne voit que les siens, et personne ne s'inscrit seul.
-- Assertions de droits sous un role non proprietaire, comme dans 02 et 03.

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'relecteur@test.fr', '{"role": "eleve", "prenom": "Rel"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'eleve@test.fr', '{"role": "eleve", "prenom": "Ele"}');
insert into content_reviewers (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001');

grant usage on schema public to authenticated;
grant select, insert, update, delete on content_reviews, content_reviewers to authenticated;
grant usage, select on sequence content_reviews_id_seq to authenticated;

-- --- Le relecteur rend un verdict, puis le change ------------------------------

set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into content_reviews (item_type, item_id, verdict, commentaire)
  values ('exercise', 'EX-A001-D-01', 'accepte', '');
insert into content_reviews (item_type, item_id, verdict, commentaire)
  values ('exercise', 'EX-A001-D-01', 'invalide', 'Reponse fausse')
  on conflict (reviewer_id, item_type, item_id)
  do update set verdict = excluded.verdict, commentaire = excluded.commentaire, traite_le = null;

-- Invalidation sans commentaire : refusee par la contrainte.
\set ON_ERROR_STOP off
insert into content_reviews (item_type, item_id, verdict, commentaire)
  values ('mindmap', 'MM-A-01', 'invalide', '   ');
\set ON_ERROR_STOP on

select 'TEST 46 le relecteur rend et change son verdict, sans doublon' as test,
       (select count(*) from content_reviews) as verdicts,
       (select count(*) from content_reviews) = 1
       and (select verdict from content_reviews) = 'invalide'
       and (select reviewer_id from content_reviews) = 'aaaaaaaa-0000-0000-0000-000000000001' as ok;
reset role;

select 'TEST 47 une invalidation sans commentaire est refusee' as test,
       not exists (select 1 from content_reviews where item_id = 'MM-A-01') as ok;

-- --- Un eleve ordinaire ---------------------------------------------------------

set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
\set ON_ERROR_STOP off
insert into content_reviews (item_type, item_id, verdict, commentaire)
  values ('exercise', 'EX-A001-D-02', 'accepte', '');
-- Ni pour le compte d'un autre.
insert into content_reviews (item_type, item_id, verdict, commentaire, reviewer_id)
  values ('exercise', 'EX-A001-D-03', 'accepte', '', 'aaaaaaaa-0000-0000-0000-000000000001');
-- Ni en s'inscrivant lui-meme relecteur.
insert into content_reviewers (user_id) values ('aaaaaaaa-0000-0000-0000-000000000002');
\set ON_ERROR_STOP on

select 'TEST 48 un eleve ne lit ni les verdicts ni la liste des relecteurs' as test,
       (select count(*) from content_reviews) = 0
       and (select count(*) from content_reviewers) = 0 as ok;
reset role;

select 'TEST 49 un eleve ne rend aucun verdict et ne s inscrit pas relecteur' as test,
       (select count(*) from content_reviews) = 1
       and not exists (select 1 from content_reviewers
                       where user_id = 'aaaaaaaa-0000-0000-0000-000000000002') as ok;

select 'TEST FIN' as test, true as ok;
