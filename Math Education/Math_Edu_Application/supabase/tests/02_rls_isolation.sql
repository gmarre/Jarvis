-- Isolation entre comptes, et protection contre l'escalade de privilege.
--
-- Les politiques RLS sont la seule barriere entre la progression d'un eleve et
-- celle d'un autre. Le trigger de protection des colonnes est la seule chose qui
-- empeche un mineur de se confirmer a lui-meme le consentement de son parent.
--
-- Chaque assertion rend une ligne commencant par TEST et finissant par la
-- colonne ok : run.sh echoue si l'une vaut f.
--
-- Depend de 01_triggers_et_capacite.sql pour les comptes et le creneau.

-- Les politiques ne s'appliquent qu'aux roles non proprietaires : on se met donc
-- dans la peau d'un utilisateur authentifie, avec son sub JWT.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Progression pour Lea (2222) et Ines (4444).
insert into skill_progress (user_id, skill_id, status) values
  ('22222222-2222-2222-2222-222222222222', 'C003', 'in_progress'),
  ('22222222-2222-2222-2222-222222222222', 'A010', 'mastered'),
  ('44444444-4444-4444-4444-444444444444', 'C007', 'mastered');

insert into exercise_attempts (user_id, exercise_id, skill_id, is_correct)
values ('22222222-2222-2222-2222-222222222222', 'ex1', 'C003', false);

set role authenticated;

-- --- Cloisonnement entre eleves ---------------------------------------------

\echo '--- Lea ne doit voir QUE ses 2 lignes ---'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'TEST 11 Lea voit ses 2 lignes et rien d autre' as test,
       count(*) as vues, (count(*) = 2) as ok
from skill_progress;

\echo '--- Lea tente d ecrire sur la progression d Ines : doit echouer ---'
\set ON_ERROR_STOP off
insert into skill_progress (user_id, skill_id, status)
values ('44444444-4444-4444-4444-444444444444', 'B001', 'mastered');
\set ON_ERROR_STOP on
-- Le comptage se fait avec les droits du proprietaire : depuis le compte de Lea,
-- les lignes d'Ines sont invisibles, donc un comptage a 0 ne prouverait rien.
reset role;
select 'TEST 12 aucune ligne ecrite chez Ines' as test,
       count(*) as lignes, (count(*) = 1) as ok
from skill_progress where user_id = '44444444-4444-4444-4444-444444444444';
set role authenticated;

\echo '--- Ines ne voit QUE sa ligne ---'
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select 'TEST 13 Ines voit sa seule ligne' as test,
       count(*) as vues, (count(*) = 1) as ok
from skill_progress;

-- --- Acces du professeur, sous double condition ------------------------------

\echo '--- Prof Marc : Ines est inscrite a son creneau ET partage -> il voit ---'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'TEST 14 le prof voit un eleve inscrit qui partage' as test,
       count(*) as vues, (count(*) = 1) as ok
from skill_progress;

\echo '--- Ines coupe le partage : le prof ne doit plus rien voir ---'
reset role;
update profiles set partage_progression_prof = false
where id = '44444444-4444-4444-4444-444444444444';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'TEST 15 le partage coupe ferme l acces du prof' as test,
       count(*) as vues, (count(*) = 0) as ok
from skill_progress;

-- On remet le partage pour ne pas perturber d'eventuels tests suivants.
reset role;
update profiles set partage_progression_prof = true
where id = '44444444-4444-4444-4444-444444444444';
set role authenticated;

-- --- Compte sans aucun lien --------------------------------------------------

\echo '--- Hugo, sans lien avec personne, ne voit rien ---'
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select 'TEST 16 aucune progression visible sans lien' as test,
       count(*) as vues, (count(*) = 0) as ok
from skill_progress;
select 'TEST 17 aucune tentative visible sans lien' as test,
       count(*) as vues, (count(*) = 0) as ok
from exercise_attempts;

\echo '--- Un eleve ne peut pas ouvrir de creneau (role prof requis) ---'
\set ON_ERROR_STOP off
insert into availability_slots (prof_id, start_at)
values ('55555555-5555-5555-5555-555555555555', now() + interval '3 days');
\set ON_ERROR_STOP on
select 'TEST 18 aucun creneau ouvert par un eleve' as test,
       (select count(*) from availability_slots
        where prof_id = '55555555-5555-5555-5555-555555555555') as crees,
       ((select count(*) from availability_slots
         where prof_id = '55555555-5555-5555-5555-555555555555') = 0) as ok;

\echo '--- Le catalogue de creneaux reste visible de tous ---'
select 'TEST 19 catalogue visible de tout compte connecte' as test,
       count(*) as vus, (count(*) >= 1) as ok
from availability_slots;

-- --- Escalade de privilege et consentement ----------------------------------

\echo '--- Un eleve NE DOIT PAS pouvoir se declarer prof ---'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP off
update profiles set role = 'prof' where id = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP on
select 'TEST 20 role inchange apres tentative d escalade' as test,
       role::text as role, (role = 'eleve') as ok
from profiles where id = '22222222-2222-2222-2222-222222222222';

\echo '--- Un mineur NE DOIT PAS pouvoir se confirmer le consentement parental ---'
\set ON_ERROR_STOP off
update profiles set consentement_parental_at = now()
where id = '22222222-2222-2222-2222-222222222222';
\set ON_ERROR_STOP on
select 'TEST 21 consentement parental toujours nul' as test,
       (consentement_parental_at is null) as ok
from profiles where id = '22222222-2222-2222-2222-222222222222';

\echo '--- En revanche il modifie librement ses preferences et son prenom ---'
update profiles set rappels_revision = false, prenom = 'Lea B'
where id = '22222222-2222-2222-2222-222222222222';
select 'TEST 22 preferences et prenom bien modifiables' as test,
       prenom, (not rappels_revision and prenom = 'Lea B') as ok
from profiles where id = '22222222-2222-2222-2222-222222222222';

\echo '--- Un appel serveur (service_role) peut, lui, confirmer le consentement ---'
set request.jwt.claim.role = 'service_role';
update profiles set consentement_parental_at = now()
where id = '22222222-2222-2222-2222-222222222222';
select 'TEST 23 le serveur peut confirmer le consentement' as test,
       (consentement_parental_at is not null) as ok
from profiles where id = '22222222-2222-2222-2222-222222222222';

reset role;

select 'TEST FIN 02 le fichier est alle jusqu au bout' as test, true as ok;
