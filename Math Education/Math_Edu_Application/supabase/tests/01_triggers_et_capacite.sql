\set ON_ERROR_STOP on

-- 1. Le trigger doit creer un profil pour chaque nouvel utilisateur auth.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'prof@test.fr',  '{"role":"prof","prenom":"Marc"}'),
  ('22222222-2222-2222-2222-222222222222', 'e1@test.fr',    '{"role":"eleve","prenom":"Lea"}'),
  ('33333333-3333-3333-3333-333333333333', 'e2@test.fr',    '{"role":"eleve","prenom":"Tom"}'),
  ('44444444-4444-4444-4444-444444444444', 'e3@test.fr',    '{"role":"eleve","prenom":"Ines"}'),
  ('55555555-5555-5555-5555-555555555555', 'e4@test.fr',    '{"role":"eleve","prenom":"Hugo"}'),
  -- Compte Google : pas de role, seulement given_name.
  ('66666666-6666-6666-6666-666666666666', 'g@test.fr',     '{"given_name":"Zoe"}');

select 'TEST 1 profils crees par le trigger' as test,
       count(*) as nb, (count(*) = 6) as ok from profiles;

select 'TEST 2 role et prenom lus des metadonnees' as test,
       (select role::text from profiles where email='prof@test.fr') as role_prof,
       (select prenom from profiles where email='prof@test.fr') as prenom_prof,
       ((select role from profiles where email='prof@test.fr') = 'prof'
        and (select prenom from profiles where email='prof@test.fr') = 'Marc') as ok;

select 'TEST 3 compte Google : role par defaut eleve, prenom depuis given_name' as test,
       (select role::text from profiles where email='g@test.fr') as role,
       (select prenom from profiles where email='g@test.fr') as prenom,
       ((select role from profiles where email='g@test.fr') = 'eleve'
        and (select prenom from profiles where email='g@test.fr') = 'Zoe') as ok;

-- 2. Creneau a 3 places.
-- La migration 0002 cree deja cette ligne via un trigger : on complete plutot
-- que d'inserer, sinon le doublon interrompt le script.
insert into teachers (id, nom_court) values ('11111111-1111-1111-1111-111111111111', 'M. Marc')
on conflict (id) do update set nom_court = excluded.nom_court;
insert into availability_slots (id, prof_id, start_at, capacite)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111', now() + interval '2 days', 3);

-- Les reservations se font en tant qu'ELEVE AUTHENTIFIE, pas en proprietaire de
-- table. C'est essentiel : en proprietaire, le RLS est contourne et le trigger de
-- capacite n'est jamais exerce dans les conditions reelles. C'est precisement cet
-- angle mort qui avait laisse passer le bug de la migration 0003.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
set role authenticated;

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into bookings (slot_id, eleve_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222');

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into bookings (slot_id, eleve_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333');

set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
insert into bookings (slot_id, eleve_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444');

reset role;

-- Lu en tant qu'eleve : c'est ce que voit l'ecran de reservation. Un eleve ne
-- voit que SES reservations, donc sans la fonction security definer de la 0004,
-- le comptage serait faux. Hugo (5555) n'a rien reserve : c'est le cas le plus
-- severe, il devrait voir 0 si le bug etait la.
set role authenticated;
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select 'TEST 4 places_prises vu par un eleve sans reservation' as test,
       places_prises, complet, (places_prises = 3 and complet) as ok
from slots_disponibles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Et vu par un eleve qui a une place : le total doit etre le meme.
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'TEST 4b meme total vu par un eleve inscrit' as test,
       places_prises, (places_prises = 3) as ok
from slots_disponibles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
reset role;

-- 3. La 4e reservation doit etre refusee par la base, la aussi sous le contexte
--    d'un vrai eleve.
set role authenticated;
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
\set ON_ERROR_STOP off
insert into bookings (slot_id, eleve_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555');
\set ON_ERROR_STOP on
reset role;

select 'TEST 5 surbooking refuse, toujours 3 places' as test,
       count(*) as nb, (count(*) = 3) as ok
from bookings where slot_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- 4. Doublon sur le meme creneau refuse.
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP off
insert into bookings (slot_id, eleve_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222');
\set ON_ERROR_STOP on
reset role;

-- 5. Annuler libere la place, sans compteur a decrementer.
delete from bookings where slot_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  and eleve_id='22222222-2222-2222-2222-222222222222';

set role authenticated;
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select 'TEST 6 annulation libere la place, vu par un eleve' as test,
       places_prises, complet, (places_prises = 2 and not complet) as ok
from slots_disponibles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
reset role;

-- 6. Suppression du compte auth : tout casacade.
delete from auth.users where id = '33333333-3333-3333-3333-333333333333';
select 'TEST 7 suppression compte cascade profil et reservations' as test,
       (select count(*) from profiles where id='33333333-3333-3333-3333-333333333333') as profils,
       (select count(*) from bookings where eleve_id='33333333-3333-3333-3333-333333333333') as resas,
       ((select count(*) from profiles where id='33333333-3333-3333-3333-333333333333') = 0
        and (select count(*) from bookings where eleve_id='33333333-3333-3333-3333-333333333333') = 0) as ok;

-- --- Migration 0002 : ligne teachers automatique -----------------------------
-- Sans elle, les creneaux d'un professeur etaient silencieusement ecartes de
-- l'ecran de reservation, faute de ligne dans teachers.

\echo '--- Un compte cree directement avec role=prof obtient sa ligne teachers ---'
insert into auth.users (id, email, raw_user_meta_data) values
  ('77777777-7777-7777-7777-777777777777', 'prof2@test.fr',
   '{"role":"prof","prenom":"Sophie","nom":"Durand"}');

select 'TEST 24 ligne teachers creee a l inscription' as test,
       nom_court, (nom_court = 'Sophie D.') as ok
from teachers where id = '77777777-7777-7777-7777-777777777777';

\echo '--- Un eleve promu prof obtient sa ligne teachers ---'
insert into auth.users (id, email, raw_user_meta_data) values
  ('88888888-8888-8888-8888-888888888888', 'futur@test.fr',
   '{"role":"eleve","prenom":"Karim"}');
select 'TEST 25 pas de ligne teachers pour un eleve' as test,
       count(*) as lignes, (count(*) = 0) as ok
from teachers where id = '88888888-8888-8888-8888-888888888888';

-- Changer un role est reserve au serveur : le trigger de protection refuse cette
-- ecriture a un client authentifie. On se place donc en service_role, comme le
-- ferait une fonction serveur.
set request.jwt.claim.role = 'service_role';
update profiles set role = 'prof' where id = '88888888-8888-8888-8888-888888888888';
reset request.jwt.claim.role;
select 'TEST 26 ligne teachers creee au passage a prof' as test,
       nom_court, (nom_court = 'Karim') as ok
from teachers where id = '88888888-8888-8888-8888-888888888888';

\echo '--- Une ligne teachers existante n est jamais ecrasee ---'
update teachers set titre = 'Agrege de mathematiques', domaines = array['C']
where id = '77777777-7777-7777-7777-777777777777';
set request.jwt.claim.role = 'service_role';
update profiles set role = 'prof' where id = '77777777-7777-7777-7777-777777777777';
reset request.jwt.claim.role;
select 'TEST 27 titre et domaines preserves' as test,
       titre, (titre = 'Agrege de mathematiques' and domaines = array['C']) as ok
from teachers where id = '77777777-7777-7777-7777-777777777777';

select 'TEST FIN 01 le fichier est alle jusqu au bout' as test, true as ok;
