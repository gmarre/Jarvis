-- Niveau de maitrise (migration 0013) : bornes. Depuis la migration 0021, la
-- progression est ecrite par le serveur : l'eleve ne modifie que la relecture
-- espacee de ses cartes mentales.
--
-- Depend de 01 pour les comptes (Lea, 2222).

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Le serveur (ici le proprietaire, comme la cle service_role) ecrit la ligne.
insert into skill_progress (user_id, skill_id, status, niveau, exercices_reussis, prochain_controle)
values ('22222222-2222-2222-2222-222222222222', 'B044', 'mastered', 4,
        array['EX-B044-E-01','EX-B044-M-01'], now() + interval '3 days')
on conflict (user_id, skill_id) do update set niveau = excluded.niveau;

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select 'TEST 80 l eleve lit son niveau et son prochain controle' as test,
       (niveau = 4 and prochain_controle is not null and cardinality(exercices_reussis) = 2) as ok
from skill_progress where user_id = '22222222-2222-2222-2222-222222222222' and skill_id = 'B044';

\echo '--- L eleve se donne le niveau 5 : refuse (0021) ---'
\set ON_ERROR_STOP off
update skill_progress set niveau = 5
where user_id = '22222222-2222-2222-2222-222222222222' and skill_id = 'B044';
\set ON_ERROR_STOP on

\echo '--- L eleve s ajoute une competence acquise : refuse (0021) ---'
\set ON_ERROR_STOP off
insert into skill_progress (user_id, skill_id, status, niveau)
values ('22222222-2222-2222-2222-222222222222', 'B045', 'mastered', 4);
\set ON_ERROR_STOP on

\echo '--- La relecture de la carte mentale : permise ---'
update skill_progress set review_box = 2, next_review_at = now() + interval '3 days', updated_at = now()
where user_id = '22222222-2222-2222-2222-222222222222' and skill_id = 'B044';

reset role;
select 'TEST 81 le niveau reste celui du serveur' as test, (niveau = 4) as ok
from skill_progress where user_id = '22222222-2222-2222-2222-222222222222' and skill_id = 'B044';
select 'TEST 82 aucune ligne ajoutee par l eleve' as test,
       not exists (select 1 from skill_progress
                   where user_id = '22222222-2222-2222-2222-222222222222' and skill_id = 'B045') as ok;
select 'TEST 83 la relecture de la carte est enregistree' as test, (review_box = 2) as ok
from skill_progress where user_id = '22222222-2222-2222-2222-222222222222' and skill_id = 'B044';

\echo '--- Un niveau hors de 0 a 5 : refuse, meme par le serveur ---'
\set ON_ERROR_STOP off
update skill_progress set niveau = 7
where user_id = '22222222-2222-2222-2222-222222222222' and skill_id = 'B044';
\set ON_ERROR_STOP on
select 'TEST 84 le niveau reste borne a 5' as test, (niveau = 4) as ok
from skill_progress where user_id = '22222222-2222-2222-2222-222222222222' and skill_id = 'B044';

select 'TEST FIN 08 le fichier est alle jusqu au bout' as test, true as ok;
