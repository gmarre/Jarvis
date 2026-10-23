-- Suivi professeur, eleve et parent (migration 0020) : demande, acceptation,
-- messagerie a trois, cours reserves aux eleves suivis.
--
-- Comptes crees ici : prof verifie e001, eleve e002 (suivi), parent e003
-- (rattache a e002), autre eleve e004, prof non verifie e005.

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on messages_suivi to authenticated;
revoke update, delete on messages_suivi from authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('e0000000-0000-0000-0000-000000000001', 'prof.suivi@test.fr', '{"role":"prof","prenom":"Anne"}'),
  ('e0000000-0000-0000-0000-000000000002', 'eleve.suivi@test.fr', '{"role":"eleve","prenom":"Noe"}'),
  ('e0000000-0000-0000-0000-000000000003', 'parent.suivi@test.fr', '{"role":"parent","prenom":"Paul"}'),
  ('e0000000-0000-0000-0000-000000000004', 'autre.suivi@test.fr', '{"role":"eleve","prenom":"Ali"}'),
  ('e0000000-0000-0000-0000-000000000005', 'prof2.suivi@test.fr', '{"role":"prof","prenom":"Luc"}');

set request.jwt.claim.role = 'service_role';
update teachers set verifie_le = now() where id = 'e0000000-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';
update profiles set partage_progression_prof = true where id = 'e0000000-0000-0000-0000-000000000002';
insert into parent_links (eleve_id, parent_id, email_parent, token_hash, expire_le, confirme_le)
values ('e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003',
        'parent.suivi@test.fr', 'h-suivi-0020', now() + interval '7 days', now());
insert into skill_progress (user_id, skill_id, status)
values ('e0000000-0000-0000-0000-000000000002', 'A001', 'in_progress');

-- --- Demande et acceptation -------------------------------------------------------------

set role authenticated;
set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000002';

\echo '--- Demander un suivi a un professeur non verifie : refuse ---'
\set ON_ERROR_STOP off
select demander_suivi('e0000000-0000-0000-0000-000000000005');
\set ON_ERROR_STOP on

select demander_suivi('e0000000-0000-0000-0000-000000000001');

select 'TEST 160 la demande est enregistree, en attente' as test,
       ((select etat from suivis where prof_id = 'e0000000-0000-0000-0000-000000000001') = 'demande') as ok;

\echo '--- Ecrire avant l acceptation : refuse ---'
\set ON_ERROR_STOP off
insert into messages_suivi (suivi_id, auteur_id, texte)
select id, 'e0000000-0000-0000-0000-000000000002', 'Bonjour' from suivis
 where prof_id = 'e0000000-0000-0000-0000-000000000001';
\set ON_ERROR_STOP on

set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000001';
select 'TEST 161 avant acceptation, le professeur ne lit pas la progression' as test,
       ((select count(*) from skill_progress where user_id = 'e0000000-0000-0000-0000-000000000002') = 0) as ok;
select 'TEST 162 le professeur voit la demande nommee' as test,
       ((select prenom from mes_suivis_prof()) = 'Noe' and (select etat from mes_suivis_prof()) = 'demande') as ok;
select repondre_suivi((select suivi_id from mes_suivis_prof()), true);
select 'TEST 163 suivi actif : le professeur lit la progression partagee' as test,
       ((select count(*) from skill_progress where user_id = 'e0000000-0000-0000-0000-000000000002') = 1) as ok;

-- --- Messagerie a trois ------------------------------------------------------------------

insert into messages_suivi (suivi_id, auteur_id, texte)
select id, 'e0000000-0000-0000-0000-000000000001', 'Bienvenue' from suivis
 where prof_id = 'e0000000-0000-0000-0000-000000000001';

set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000002';
insert into messages_suivi (suivi_id, auteur_id, texte)
select id, 'e0000000-0000-0000-0000-000000000002', 'Merci' from suivis
 where prof_id = 'e0000000-0000-0000-0000-000000000001';

set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000003';
select 'TEST 164 le parent lit tous les echanges' as test,
       ((select count(*) from messages_suivi) = 2) as ok;
insert into messages_suivi (suivi_id, auteur_id, texte)
select id, 'e0000000-0000-0000-0000-000000000003', 'Je suis le parent' from suivis
 where prof_id = 'e0000000-0000-0000-0000-000000000001';

\echo '--- Ecrire au nom d un autre : refuse ---'
\set ON_ERROR_STOP off
insert into messages_suivi (suivi_id, auteur_id, texte)
select id, 'e0000000-0000-0000-0000-000000000001', 'Faux message' from suivis
 where prof_id = 'e0000000-0000-0000-0000-000000000001';
\set ON_ERROR_STOP on

\echo '--- Modifier un message : refuse ---'
\set ON_ERROR_STOP off
update messages_suivi set texte = 'modifie';
\set ON_ERROR_STOP on

select 'TEST 165 un participant signale un message' as test,
       (signaler_message((select id from messages_suivi where texte = 'Bienvenue'))) as ok;

set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000004';
select 'TEST 166 un autre eleve ne voit ni le suivi ni les messages' as test,
       ((select count(*) from suivis) = 0 and (select count(*) from messages_suivi) = 0
        and not signaler_message((select id from messages_suivi limit 1))) as ok;

-- --- Cours reserve aux eleves suivis ---------------------------------------------------------

set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000001';
insert into availability_slots (id, prof_id, start_at, reserve_suivi)
values ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
        now() + interval '6 days', true);

set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000004';
select 'TEST 167 un cours reserve est cache aux eleves non suivis' as test,
       ((select count(*) from availability_slots where id = 'f0000000-0000-0000-0000-000000000001') = 0) as ok;
\echo '--- Reserver un cours reserve sans suivi : refuse ---'
\set ON_ERROR_STOP off
insert into bookings (slot_id, eleve_id)
values ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004');
\set ON_ERROR_STOP on

set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000002';
select 'TEST 168 l eleve suivi voit et reserve le cours' as test,
       ((select count(*) from availability_slots where id = 'f0000000-0000-0000-0000-000000000001') = 1) as ok;
insert into bookings (slot_id, eleve_id)
values ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002');

-- --- Fin du suivi par le parent ---------------------------------------------------------------

set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000003';
select 'TEST 169 le parent met fin au suivi' as test,
       (terminer_suivi((select id from suivis limit 1))) as ok;

set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000002';
\echo '--- Ecrire dans un suivi termine : refuse ---'
\set ON_ERROR_STOP off
insert into messages_suivi (suivi_id, auteur_id, texte)
select id, 'e0000000-0000-0000-0000-000000000002', 'Encore la' from suivis;
\set ON_ERROR_STOP on
select 'TEST 170 le fil reste lisible en archive, sans nouveau message' as test,
       ((select count(*) from messages_suivi) = 3) as ok;
reset role;

select 'TEST 171 seuls les messages autorises existent, le signalement est garde' as test,
       ((select count(*) from messages_suivi) = 3
        and (select signale_le from messages_suivi where texte = 'Bienvenue') is not null
        and (select count(*) from bookings where slot_id = 'f0000000-0000-0000-0000-000000000001') = 1) as ok;

-- --- Ouverture avec RETURNING, comme l'application (migration 0024) ----------------------------
-- Avant 0024, la politique de lecture relisait la table : la ligne neuve n'y
-- etait pas encore et toute l'insertion etait refusee.

set role authenticated;
set request.jwt.claim.sub = 'e0000000-0000-0000-0000-000000000001';
insert into availability_slots (prof_id, start_at)
values ('e0000000-0000-0000-0000-000000000001', now() + interval '9 days')
on conflict (prof_id, start_at) do nothing
returning 'TEST 199 le professeur ouvre un creneau avec RETURNING' as test, true as ok;
insert into availability_slots (prof_id, start_at, reserve_suivi)
values ('e0000000-0000-0000-0000-000000000001', now() + interval '10 days', true)
on conflict (prof_id, start_at) do nothing
returning 'TEST 199a idem pour un creneau reserve aux suivis' as test, true as ok;
reset role;

select 'TEST FIN 14 le fichier est alle jusqu au bout' as test, true as ok;
