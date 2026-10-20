-- Espace parent (migration 0019) : rattachement par l'adresse du consentement,
-- suivi par est_parent_de, rapport hebdomadaire regle par le parent seul,
-- corriges rendus au seul parent rattache.
--
-- Comptes crees ici (Lea d111, Tom d222, Claire d00a).

grant usage on schema public to authenticated, service_role;

-- Comptes propres a ce fichier : des tests precedents suppriment des comptes de 01.
insert into auth.users (id, email, raw_user_meta_data) values
  ('d0000000-0000-0000-0000-00000000000a', 'parent.lea@test.fr', '{"role":"parent","prenom":"Claire"}'),
  ('d1111111-1111-1111-1111-111111111111', 'lea.p@test.fr', '{"role":"eleve","prenom":"Lea"}'),
  ('d2222222-2222-2222-2222-222222222222', 'tom.p@test.fr', '{"role":"eleve","prenom":"Tom"}');


-- Consentement confirme pour Lea, demande non confirmee pour Tom, meme adresse.
insert into parent_links (id, eleve_id, email_parent, token_hash, expire_le, confirme_le) values
  ('c0000000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111',
   'Parent.Lea@test.fr', 'h-lea-0019', now() + interval '7 days', now()),
  ('c0000000-0000-0000-0000-000000000002', 'd2222222-2222-2222-2222-222222222222',
   'parent.lea@test.fr', 'h-tom-0019', now() + interval '7 days', null);

\set contenu '{"skills": [{"id": "A001", "domain": "A", "domain_name": "Numeration", "label": "Compter", "description": "d", "prerequisites": [], "difficulty": 1, "school_level": "CP", "validation_test": "t", "mastery_threshold": {"required": 2, "out_of": 3}, "exercise_ids": ["EX-A001-D-01"], "mindmap_id": null, "programme_ref": []}], "exercises": [{"id": "EX-A001-D-01", "skill_id": "A001", "level": "decouverte", "type": "numerique", "statement": "Combien ?", "answer": {"value": 5}, "solution_steps": ["3 + 2 = 5."], "estimated_duration_s": 30, "review_status": "relu_agent", "programme_ref": "x"}], "mindmaps": []}'
set role service_role;
set request.jwt.claim.role = 'service_role';
select publier_contenu(:'contenu'::jsonb, 'parent01');
reset role;

-- --- Un eleve ne peut pas se rattacher a un autre ------------------------------------

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = 'd2222222-2222-2222-2222-222222222222';
select 'TEST 140 un eleve ne rattache rien' as test, (rattacher_mes_enfants() = 0) as ok;
select 'TEST 141 un eleve n obtient aucun corrige' as test,
       ((select count(*) from corriges_pour_parent('A001')) = 0) as ok;

-- --- Le parent ------------------------------------------------------------------------

set request.jwt.claim.sub = 'd0000000-0000-0000-0000-00000000000a';
select 'TEST 142 avant rattachement, le parent ne lit pas l eleve' as test,
       ((select count(*) from profiles where id = 'd1111111-1111-1111-1111-111111111111') = 0) as ok;
select 'TEST 143 le parent rattache le seul enfant au consentement confirme' as test,
       (rattacher_mes_enfants() = 1) as ok;
select 'TEST 144 mes_enfants rend Lea seule' as test,
       ((select count(*) from mes_enfants()) = 1
        and (select prenom from mes_enfants()) = 'Lea') as ok;
select 'TEST 145 le parent lit le profil de Lea, pas celui de Tom' as test,
       ((select count(*) from profiles where id = 'd1111111-1111-1111-1111-111111111111') = 1
        and (select count(*) from profiles where id = 'd2222222-2222-2222-2222-222222222222') = 0) as ok;
select 'TEST 146 le parent active le rapport de Lea, pas celui de Tom' as test,
       (regler_rapport_hebdo('c0000000-0000-0000-0000-000000000001', true)
        and not regler_rapport_hebdo('c0000000-0000-0000-0000-000000000002', true)) as ok;
select 'TEST 147 rattache, le parent lit reponses et corriges' as test,
       ((select count(*) from corriges_pour_parent('A001')) = 1
        and (select (answer->>'value')::int from corriges_pour_parent('A001')) = 5) as ok;

\echo '--- Le parent ne modifie pas un lien a la main ---'
update parent_links set eleve_id = 'd2222222-2222-2222-2222-222222222222'
 where id = 'c0000000-0000-0000-0000-000000000001';
reset role;

select 'TEST 148 le lien est intact et le rapport de Lea actif, celui de Tom non' as test,
       ((select eleve_id from parent_links where id = 'c0000000-0000-0000-0000-000000000001')
          = 'd1111111-1111-1111-1111-111111111111'
        and (select rapport_hebdo from parent_links where id = 'c0000000-0000-0000-0000-000000000001')
        and not (select rapport_hebdo from parent_links where id = 'c0000000-0000-0000-0000-000000000002')) as ok;

select 'TEST FIN 13 le fichier est alle jusqu au bout' as test, true as ok;
