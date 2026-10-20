-- Professeur v1 (migration 0018) : offres de cours, creneau depuis une offre,
-- lien de visio reserve aux participants, inscrits nommes pour le professeur.
--
-- Depend de 01 (Marc 1111 professeur, Lea 2222 et Tom 3333 eleves) et de 02
-- (Marc y est verifie par l'administrateur).

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on course_offers to authenticated;
revoke all on seances_visio from authenticated;
grant select on seances_visio to authenticated;

-- --- Offres ----------------------------------------------------------------------

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

insert into course_offers (id, prof_id, titre, skill_ids, niveau, duree_min, places, prix_eur)
values ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'Fractions en 5e', '{C013,C015}', '5e', 60, 2, 15);

\echo '--- Une offre de 4 places : refusee ---'
\set ON_ERROR_STOP off
insert into course_offers (prof_id, titre, skill_ids, niveau, duree_min, places, prix_eur)
values ('11111111-1111-1111-1111-111111111111', 'Trop grand', '{C013}', '5e', 60, 4, 15);
\set ON_ERROR_STOP on

\echo '--- Une offre de 3 heures : refusee ---'
\set ON_ERROR_STOP off
insert into course_offers (prof_id, titre, skill_ids, niveau, duree_min, places, prix_eur)
values ('11111111-1111-1111-1111-111111111111', 'Trop long', '{C013}', '5e', 180, 3, 15);
\set ON_ERROR_STOP on

-- Creneau depuis l'offre : duree, places, prix et domaines repris de l'offre.
insert into availability_slots (id, prof_id, start_at, duree_min, capacite, prix_eur, offer_id)
values ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        now() + interval '5 days', 90, 10, 99, 'a0000000-0000-0000-0000-000000000001');

reset role;
select 'TEST 120 seule l offre dans les bornes est creee' as test,
       ((select count(*) from course_offers) = 1) as ok;
select 'TEST 121 un creneau ouvert depuis une offre en reprend duree, places, prix et domaines' as test,
       (duree_min = 60 and capacite = 2 and prix_eur = 15 and domaines = '{C}') as ok
from availability_slots where id = 'b0000000-0000-0000-0000-000000000001';
select 'TEST 122 chaque creneau recoit un lien Jitsi imprevisible' as test,
       (lien ~ '^https://meet\.jit\.si/Racine-[0-9a-f]{32}$') as ok
from seances_visio where slot_id = 'b0000000-0000-0000-0000-000000000001';

-- --- Ce que voient les eleves ------------------------------------------------------

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

\echo '--- Un eleve ne cree pas d offre ---'
\set ON_ERROR_STOP off
insert into course_offers (prof_id, titre, skill_ids, niveau, duree_min, places, prix_eur)
values ('22222222-2222-2222-2222-222222222222', 'Pirate', '{C013}', '5e', 60, 3, 15);
\set ON_ERROR_STOP on

select 'TEST 123 un eleve voit l offre d un professeur verifie' as test,
       ((select count(*) from course_offers) = 1) as ok;
select 'TEST 124 sans inscription, pas de lien de visio' as test,
       ((select count(*) from seances_visio where slot_id = 'b0000000-0000-0000-0000-000000000001') = 0) as ok;

insert into bookings (slot_id, eleve_id, skill_id)
values ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'C013');

select 'TEST 125 inscrit, l eleve lit le lien de sa seance' as test,
       ((select count(*) from seances_visio where slot_id = 'b0000000-0000-0000-0000-000000000001') = 1) as ok;

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select 'TEST 126 un autre eleve ne lit pas ce lien' as test,
       ((select count(*) from seances_visio where slot_id = 'b0000000-0000-0000-0000-000000000001') = 0) as ok;
select 'TEST 127 un autre eleve n obtient pas la liste des inscrits' as test,
       ((select count(*) from inscrits_du_creneau('b0000000-0000-0000-0000-000000000001')) = 0) as ok;

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'TEST 128 le professeur voit son inscrit nomme et sa competence' as test,
       ((select count(*) from inscrits_du_creneau('b0000000-0000-0000-0000-000000000001')) = 1
        and (select skill_id from inscrits_du_creneau('b0000000-0000-0000-0000-000000000001')) = 'C013') as ok;
select 'TEST 129 le professeur lit le lien de son creneau' as test,
       ((select count(*) from seances_visio where slot_id = 'b0000000-0000-0000-0000-000000000001') = 1) as ok;

\echo '--- Un professeur n ecrit pas de lien a la main ---'
\set ON_ERROR_STOP off
update seances_visio set lien = 'https://exemple.fr' where slot_id = 'b0000000-0000-0000-0000-000000000001';
\set ON_ERROR_STOP on
reset role;

select 'TEST 130 le lien n a pas change' as test,
       ((select lien from seances_visio where slot_id = 'b0000000-0000-0000-0000-000000000001') like 'https://meet.jit.si/%') as ok;

select 'TEST FIN 12 le fichier est alle jusqu au bout' as test, true as ok;
