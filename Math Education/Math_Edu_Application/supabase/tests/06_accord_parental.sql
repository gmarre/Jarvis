-- Accord parental et regles des mineurs (migration 0011).
--
-- Ce qui est verifie : un eleve ne fabrique pas son propre lien de
-- consentement, un mineur ne change ni sa date de naissance ni son email sans
-- le serveur, et le consentement se remet a zero quand il le faut.
--
-- Depend de 01 et 02 pour les comptes. Lea (2222) devient mineure, Tom (3333)
-- majeur.

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Preparation en appel serveur : le trigger de protection laisse passer.
set request.jwt.claim.role = 'service_role';

update profiles set date_naissance = '2013-05-01', email_parent = 'parent.lea@test.fr'
where id = '22222222-2222-2222-2222-222222222222';
update profiles set date_naissance = '2000-01-01', consentement_parental_at = now(),
                    email_parent = 'parent.tom@test.fr'
where id = '33333333-3333-3333-3333-333333333333';

insert into modifications_profil (eleve_id, champ, nouvelle_valeur, email_parent, token_hash, expire_le)
values ('44444444-4444-4444-4444-444444444444', 'email', 'ines2@test.fr', 'p@test.fr', 'h-ines', now() + interval '7 days');

set role authenticated;
set request.jwt.claim.role = 'authenticated';

-- --- Lien de consentement ---------------------------------------------------

\echo '--- Lea tente de creer son propre lien de consentement : refuse ---'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP off
insert into parent_links (eleve_id, email_parent, token_hash, expire_le)
values ('22222222-2222-2222-2222-222222222222', 'moi@test.fr', 'jeton-connu', now() + interval '7 days');
\set ON_ERROR_STOP on
reset role;
select 'TEST 60 aucun lien cree par l eleve' as test,
       count(*) as lignes, (count(*) = 0) as ok
from parent_links where token_hash = 'jeton-connu';
set role authenticated;

-- --- Date de naissance --------------------------------------------------------

\echo '--- Lea (mineure) change sa date de naissance : refuse ---'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP off
update profiles set date_naissance = '2000-01-01' where id = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP on
select 'TEST 61 un mineur ne change pas sa date de naissance' as test,
       date_naissance, (date_naissance = '2013-05-01') as ok
from profiles where id = '22222222-2222-2222-2222-222222222222';

\echo '--- Tom (majeur) passe sous 15 ans : accepte, consentement remis a zero ---'
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
update profiles set date_naissance = '2016-01-01' where id = '33333333-3333-3333-3333-333333333333';
select 'TEST 62 un majeur change sa date, le consentement redevient exige' as test,
       (date_naissance = '2016-01-01' and consentement_parental_at is null) as ok
from profiles where id = '33333333-3333-3333-3333-333333333333';

-- --- Email du parent -----------------------------------------------------------

reset role;
set request.jwt.claim.role = 'service_role';
update profiles set consentement_parental_at = now() where id = '22222222-2222-2222-2222-222222222222';
set request.jwt.claim.role = 'authenticated';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\echo '--- Lea change l email de son parent : le consentement est a refaire ---'
update profiles set email_parent = 'autre@test.fr' where id = '22222222-2222-2222-2222-222222222222';
select 'TEST 63 changer de parent remet le consentement a zero' as test,
       (consentement_parental_at is null) as ok
from profiles where id = '22222222-2222-2222-2222-222222222222';

-- --- Demandes de modification ---------------------------------------------------

select 'TEST 64 Lea ne voit pas les demandes d Ines' as test,
       count(*) as vues, (count(*) = 0) as ok
from modifications_profil;

\set ON_ERROR_STOP off
insert into modifications_profil (eleve_id, champ, nouvelle_valeur, email_parent, token_hash, expire_le)
values ('22222222-2222-2222-2222-222222222222', 'email', 'x@test.fr', 'moi@test.fr', 'h-lea', now() + interval '7 days');
\set ON_ERROR_STOP on
reset role;
select 'TEST 65 aucune demande creee par l eleve' as test,
       count(*) as lignes, (count(*) = 0) as ok
from modifications_profil where token_hash = 'h-lea';
set role authenticated;

set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select 'TEST 66 Ines voit sa demande' as test,
       count(*) as vues, (count(*) = 1) as ok
from modifications_profil;

reset role;

-- --- Email de connexion (auth.users) -------------------------------------------

-- Supabase Auth ecrit dans auth.users avec sa propre connexion, sans JWT
-- d'utilisateur : on se place comme lui, en appel serveur.
set request.jwt.claim.role = 'service_role';

\echo '--- Lea (mineure) demande un changement d email a Supabase Auth : refuse ---'
\set ON_ERROR_STOP off
update auth.users set email_change = 'nouvelle@test.fr' where id = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP on
select 'TEST 67 un mineur ne lance pas de changement d email' as test,
       (coalesce(email_change, '') = '') as ok
from auth.users where id = '22222222-2222-2222-2222-222222222222';

\echo '--- Un majeur le peut ---'
update profiles set date_naissance = '1990-01-01' where id = '55555555-5555-5555-5555-555555555555';
update auth.users set email_change = 'hugo2@test.fr' where id = '55555555-5555-5555-5555-555555555555';
select 'TEST 68 un majeur lance un changement d email' as test,
       (email_change = 'hugo2@test.fr') as ok
from auth.users where id = '55555555-5555-5555-5555-555555555555';

\echo '--- Adresse confirmee : le profil suit ---'
update auth.users set email = 'hugo2@test.fr', email_change = '' where id = '55555555-5555-5555-5555-555555555555';
select 'TEST 69 profiles.email suit auth.users' as test,
       email, (email = 'hugo2@test.fr') as ok
from profiles where id = '55555555-5555-5555-5555-555555555555';

select 'TEST FIN 06 le fichier est alle jusqu au bout' as test, true as ok;
