-- Rythme et rappels (migration 0017) : le rythme s'ecrit par l'eleve dans ses
-- bornes ; les rappels ne s'ecrivent que par le serveur, l'eleve lit son etat
-- sans les empreintes de jeton.
--
-- Depend de 01 pour les comptes (Lea 2222, Tom 3333).

-- Les fichiers precedents accordent tout sur toutes les tables (grant global) :
-- on remet les droits de production de 0017 sur les deux tables des rappels.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
revoke all on rappels from authenticated;
revoke all on rappels_envois from authenticated;
grant select (eleve_id, destinataire, pour_parent, heure, etat, motif_arret, expire_le,
              pause_jusqu_au, cree_le, maj_le)
  on rappels to authenticated;
grant select (id, eleve_id, envoye_le, jour) on rappels_envois to authenticated;

-- --- Le rythme ----------------------------------------------------------------

select 'TEST 110 le rythme vaut 3 jours par defaut, sans jours precises' as test,
       (rythme_jours = 3 and jours_travail = '{}') as ok
from profiles where id = '22222222-2222-2222-2222-222222222222';

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

update profiles set rythme_jours = 4, jours_travail = '{1,3,5,6}'
where id = '22222222-2222-2222-2222-222222222222';

\echo '--- Un rythme de 6 jours : refuse ---'
\set ON_ERROR_STOP off
update profiles set rythme_jours = 6 where id = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP on

\echo '--- Un jour 8 : refuse ---'
\set ON_ERROR_STOP off
update profiles set jours_travail = '{1,8}' where id = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP on

reset role;
select 'TEST 111 l eleve choisit son rythme dans les bornes' as test,
       (rythme_jours = 4 and jours_travail = '{1,3,5,6}') as ok
from profiles where id = '22222222-2222-2222-2222-222222222222';

-- --- Les rappels, ecrits par le serveur seul ------------------------------------

-- Ecrit en proprietaire de la table, comme le fait la fonction serveur
-- (service_role contourne la RLS dans Supabase, pas dans PGlite).
reset role;
insert into rappels (eleve_id, destinataire, pour_parent, heure, etat, jeton_hash)
values ('22222222-2222-2222-2222-222222222222', 'parent@exemple.fr', true, '17:00', 'en_attente', 'empreinte-secrete');
insert into rappels_envois (eleve_id, jour, desinscription_hash)
values ('22222222-2222-2222-2222-222222222222', current_date, 'autre-empreinte');
reset role;

\echo '--- Une heure hors plage : refusee ---'
\set ON_ERROR_STOP off
update rappels set heure = '22:00' where eleve_id = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP on

select 'TEST 112 l heure du rappel reste entre 7 h 30 et 19 h' as test,
       (heure = time '17:00') as ok
from rappels where eleve_id = '22222222-2222-2222-2222-222222222222';

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select 'TEST 113 l eleve lit l etat de son rappel et ses envois' as test,
       ((select etat from rappels) = 'en_attente'
        and (select count(*) from rappels_envois) = 1) as ok;

\echo '--- Lire l empreinte du jeton : refuse ---'
\set ON_ERROR_STOP off
select jeton_hash from rappels;
\set ON_ERROR_STOP on

\echo '--- Activer soi-meme son rappel : refuse ---'
\set ON_ERROR_STOP off
update rappels set etat = 'actif';
\set ON_ERROR_STOP on

\echo '--- Creer un rappel depuis le client : refuse ---'
\set ON_ERROR_STOP off
insert into rappels (eleve_id, destinataire, pour_parent) values
  ('22222222-2222-2222-2222-222222222222', 'moi@exemple.fr', false);
\set ON_ERROR_STOP on

reset role;
select 'TEST 114 le client ne peut ni activer ni creer un rappel' as test,
       ((select etat from rappels where eleve_id = '22222222-2222-2222-2222-222222222222') = 'en_attente'
        and (select count(*) from rappels) = 1) as ok;

set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select 'TEST 115 un eleve ne lit pas le rappel d un autre' as test,
       ((select count(*) from rappels) = 0 and (select count(*) from rappels_envois) = 0) as ok;
reset role;

select 'TEST FIN 11 le fichier est alle jusqu au bout' as test, true as ok;
