-- Niveau de maitrise (migration 0013) : bornes et ecriture par l'eleve.
--
-- Depend de 01 pour les comptes (Lea, 2222).

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

insert into skill_progress (user_id, skill_id, status, niveau, exercices_reussis, prochain_controle)
values ('22222222-2222-2222-2222-222222222222', 'B044', 'mastered', 4,
        array['EX-B044-E-01','EX-B044-M-01'], now() + interval '3 days')
on conflict (user_id, skill_id) do update set niveau = excluded.niveau;

select 'TEST 80 l eleve enregistre son niveau et son prochain controle' as test,
       (niveau = 4 and prochain_controle is not null and cardinality(exercices_reussis) = 2) as ok
from skill_progress where user_id = '22222222-2222-2222-2222-222222222222' and skill_id = 'B044';

\echo '--- Un niveau hors de 0 a 5 : refuse ---'
\set ON_ERROR_STOP off
update skill_progress set niveau = 7
where user_id = '22222222-2222-2222-2222-222222222222' and skill_id = 'B044';
\set ON_ERROR_STOP on
select 'TEST 81 le niveau reste borne a 5' as test, (niveau = 4) as ok
from skill_progress where user_id = '22222222-2222-2222-2222-222222222222' and skill_id = 'B044';

reset role;
select 'TEST FIN 08 le fichier est alle jusqu au bout' as test, true as ok;
